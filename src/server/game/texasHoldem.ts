// ============================================================
// جرب حظك — Texas Hold'em Game Engine (rewrite)
// Server-authoritative, seat-based, TDA-2024 rules:
// side pots, split pots, incomplete-raise reopening, BB option,
// heads-up order, dead button, burns, all-in run-out, chip conservation.
// ============================================================

import { Card, createDeck, shuffleDeck, Rng } from './deck';
import { evaluateHand, compareHandResults, handResultsEqual, HandResult } from './evaluator';

// ===== Types =====

export type GamePhase = 'waiting' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
export type PlayerAction = 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all_in';
export type PlayerStatus = 'active' | 'folded' | 'all_in' | 'sitting_out';
export type BetStructure = 'no-limit' | 'pot-limit' | 'fixed-limit';

export interface TableConfig {
  maxPlayers: number;
  smallBlind: number;
  bigBlind: number;
  minBuyIn: number;
  /** Big blind ante (posted by the BB only, for the whole table). */
  ante?: number;
  betStructure?: BetStructure;
  /** Fixed-limit cap: bet + (cap-1) raises. Default 4. */
  fixedLimitCap?: number;
  straddle?: 'off' | 'utg';
  /** Injectable RNG for tests. Default: CSPRNG. */
  rng?: Rng;
}

export interface TablePlayer {
  id: string;
  name: string;
  /** Remaining stack (chips not committed this hand). */
  balance: number;
  seatIndex: number;
  holeCards: Card[];
  status: PlayerStatus;
  /** Chips committed on the CURRENT street. */
  committedThisStreet: number;
  /** Chips committed on the WHOLE hand (drives side pots). */
  committedThisHand: number;
  hasActedThisStreet: boolean;
  canRaise: boolean;
  isDealer: boolean;
  isCurrentTurn: boolean;
}

export interface PotInfo {
  amount: number;
  eligibleSeats: number[];
}

export interface WinnerInfo {
  playerId: string;
  name: string;
  amount: number;
  handName: string;
  revealedCards: Card[];
  seatIndex: number;
}

export interface LegalActions {
  fold: boolean;
  check: boolean;
  call: boolean;
  bet: boolean;
  raise: boolean;
  allIn: boolean;
  toCall: number;
  minRaiseTo: number;
  maxRaiseTo: number;
}

export interface SnapshotPlayer {
  id: string;
  name: string;
  balance: number;
  seatIndex: number;
  status: PlayerStatus;
  /** Chips committed on the current street. */
  currentBet: number;
  /** Chips committed on the whole hand. */
  totalRoundBet: number;
  isDealer: boolean;
  isCurrentTurn: boolean;
}

export interface GameSnapshot {
  tableId: string;
  phase: GamePhase;
  players: SnapshotPlayer[];
  communityCards: Card[];
  /** Total chips in all pots. */
  pot: number;
  sidePots: PotInfo[];
  currentBet: number;
  activePlayerIndex: number;
  dealerIndex: number;
  deckRemaining: number;
  lastAction?: { playerId: string; action: PlayerAction; amount?: number };
  winners?: WinnerInfo[];
  legalActions?: LegalActions;
  handNumber: number;
}

export interface EngineResult {
  ok: boolean;
  error?: string;
  code?: string;
  snapshot: GameSnapshot;
}

// ===== Pure pot math (exported for direct testing) =====

export interface ContribInfo {
  seat: number;
  /** Total chips committed this hand. */
  amount: number;
  /** false for folded/sitting-out players. */
  inHand: boolean;
}

/**
 * Exact pot-building algorithm (spec §4.2): layered by contribution levels,
 * eligible = in-hand players who covered that level, adjacent pots with
 * identical eligible sets merged.
 */
export function computePots(contribs: ContribInfo[]): PotInfo[] {
  const levels = [...new Set(contribs.map((c) => c.amount).filter((a) => a > 0))].sort((a, b) => a - b);
  const pots: PotInfo[] = [];
  let prev = 0;
  for (const L of levels) {
    let amount = 0;
    for (const c of contribs) {
      amount += Math.min(c.amount, L) - Math.min(c.amount, prev);
    }
    const eligible = contribs.filter((c) => c.inHand && c.amount >= L).map((c) => c.seat);
    if (amount > 0 && eligible.length > 0) pots.push({ amount, eligibleSeats: eligible });
    prev = L;
  }

  const merged: PotInfo[] = [];
  for (const pot of pots) {
    const last = merged[merged.length - 1];
    if (
      last &&
      last.eligibleSeats.length === pot.eligibleSeats.length &&
      last.eligibleSeats.every((s, i) => pot.eligibleSeats[i] === s)
    ) {
      last.amount += pot.amount;
    } else {
      merged.push({ amount: pot.amount, eligibleSeats: [...pot.eligibleSeats] });
    }
  }
  return merged;
}

/**
 * Award pots last-created first, splitting ties with the odd-chip rule
 * (first tied seat clockwise from the button). Pure.
 */
export function awardPots(
  pots: PotInfo[],
  handResults: Map<number, HandResult>,
  names: Map<number, { id: string; name: string }>,
  buttonSeat: number,
  maxPlayers: number
): { awards: Map<string, number>; winners: WinnerInfo[] } {
  const awards = new Map<string, number>();
  const winnerList: WinnerInfo[] = [];
  const sortedPots = [...pots].reverse();

  for (const pot of sortedPots) {
    const evals = pot.eligibleSeats
      .map((s) => ({ seat: s, hand: handResults.get(s)! }))
      .filter((e) => e.hand);
    if (evals.length === 0) continue;
    evals.sort((a, b) => compareHandResults(b.hand, a.hand));
    const best = evals[0].hand;
    const winners = evals.filter((e) => handResultsEqual(e.hand, best)).map((e) => e.seat);

    const share = Math.floor(pot.amount / winners.length);
    const remainder = pot.amount - share * winners.length;

    const orderedWinners = [...winners].sort((a, b) => {
      const distA = (a - buttonSeat + maxPlayers) % maxPlayers || maxPlayers;
      const distB = (b - buttonSeat + maxPlayers) % maxPlayers || maxPlayers;
      return distA - distB;
    });

    for (let i = 0; i < winners.length; i++) {
      const seat = orderedWinners[i];
      const info = names.get(seat)!;
      const amount = share + (i < remainder ? 1 : 0);
      awards.set(info.id, (awards.get(info.id) ?? 0) + amount);

      const existing = winnerList.find((w) => w.playerId === info.id);
      if (existing) {
        existing.amount += amount;
      } else {
        winnerList.push({
          playerId: info.id,
          name: info.name,
          amount,
          handName: handResults.get(seat)!.name,
          revealedCards: [],
          seatIndex: seat,
        });
      }
    }
  }
  return { awards, winners: winnerList };
}

// ===== Engine =====

export class TexasHoldemEngine {
  private config: TableConfig;
  private rng: Rng;
  private deck: Card[] = [];
  private burns: Card[] = [];
  private players: TablePlayer[] = [];
  private communityCards: Card[] = [];
  private phase: GamePhase = 'waiting';
  private handNumber = 0;

  // Seat-based position state
  private buttonSeat = -1;
  private sbSeat = -1;
  private bbSeat = -1;
  private previousBbSeat = -1;

  // Street betting state
  private currentBet = 0;
  private lastFullRaise = 0;
  private pendingShortIncrement = 0;
  private aggressorSeat = -1;
  private straddlerSeat = -1;
  private raiseCount = 0; // fixed-limit

  private activeSeat: number | null = null;
  private lastAction: GameSnapshot['lastAction'];

  private winners: WinnerInfo[] = [];
  private lastPots: PotInfo[] = [];
  private lastPotTotal = 0;
  private history: Record<string, unknown>[] = [];

  constructor(config: TableConfig) {
    this.config = config;
    this.rng = config.rng ?? Math.random;
  }

  // ===== Player Management =====

  addPlayer(id: string, name: string, balance: number): boolean {
    if (this.players.length >= this.config.maxPlayers) return false;
    if (balance < this.config.minBuyIn) return false;
    if (this.players.find((p) => p.id === id)) return false;

    const seatIndex = this.findNextSeat();
    this.players.push({
      id,
      name,
      balance,
      seatIndex,
      holeCards: [],
      status: 'active',
      committedThisStreet: 0,
      committedThisHand: 0,
      hasActedThisStreet: false,
      canRaise: true,
      isDealer: false,
      isCurrentTurn: false,
    });
    this.players.sort((a, b) => a.seatIndex - b.seatIndex);
    return true;
  }

  removePlayer(id: string): void {
    const p = this.players.find((x) => x.id === id);
    if (!p) return;
    if (this.phase !== 'waiting' && p.status === 'active') {
      // Leaving mid-hand: hand is folded at their next turn. Chips stay in the pot.
      p.status = 'sitting_out';
      if (this.activeSeat === p.seatIndex) this.advanceAfterAction();
    } else {
      this.players = this.players.filter((x) => x.id !== id);
      if (this.sbSeat === p.seatIndex) this.sbSeat = -1;
      if (this.bbSeat === p.seatIndex) this.bbSeat = -1;
      if (this.buttonSeat === p.seatIndex) this.buttonSeat = -1;
    }
  }

  setSittingOut(playerId: string, out: boolean): void {
    const p = this.players.find((x) => x.id === playerId);
    if (!p) return;
    if (this.phase === 'waiting') {
      p.status = out ? 'sitting_out' : 'active';
    }
  }

  private findNextSeat(): number {
    const taken = new Set(this.players.map((p) => p.seatIndex));
    for (let i = 0; i < this.config.maxPlayers; i++) {
      if (!taken.has(i)) return i;
    }
    return this.players.length;
  }

  // ===== Seat helpers =====

  private bySeat(seat: number): TablePlayer | undefined {
    return this.players.find((p) => p.seatIndex === seat);
  }

  private nextSeat(seat: number): number {
    return (seat + 1) % this.config.maxPlayers;
  }

  /** Next seat (clockwise) that has a player, wrapping once. */
  private nextOccupiedSeat(seat: number, skipSittingOut = true): number | null {
    for (let i = 1; i <= this.config.maxPlayers; i++) {
      const s = (seat + i) % this.config.maxPlayers;
      const p = this.bySeat(s);
      if (p && (!skipSittingOut || p.status !== 'sitting_out')) return s;
    }
    return null;
  }

  private eligibleSeats(): number[] {
    return this.players
      .filter((p) => p.status !== 'sitting_out')
      .map((p) => p.seatIndex);
  }

  /** First eligible seat strictly clockwise of `seat`. */
  private firstEligibleAfter(seat: number): number | null {
    for (let i = 1; i <= this.config.maxPlayers; i++) {
      const s = (seat + i) % this.config.maxPlayers;
      const p = this.bySeat(s);
      if (p && p.status !== 'sitting_out') return s;
    }
    return null;
  }

  /** Seats in clockwise order starting from `from` (inclusive), skipping sitting_out. */
  private seatsInOrder(from: number): number[] {
    const out: number[] = [];
    let s = from;
    for (let i = 0; i < this.config.maxPlayers; i++) {
      const p = this.bySeat(s);
      if (p && p.status !== 'sitting_out') out.push(s);
      s = this.nextSeat(s);
    }
    return out;
  }

  // ===== Game Flow =====

  canStart(): boolean {
    const eligible = this.players.filter(
      (p) => p.status !== 'sitting_out' && p.balance > 0
    );
    return eligible.length >= 2;
  }

  startHand(): GameSnapshot | { error: string; code: string } {
    if (!this.canStart()) return { error: 'عدد اللاعبين غير كاف', code: 'NOT_ENOUGH_PLAYERS' };
    if (this.phase !== 'waiting' && this.phase !== 'showdown') {
      return { error: 'اليد قيد التشغيل', code: 'HAND_IN_PROGRESS' };
    }

    this.handNumber++;
    this.phase = 'preflop';
    this.handBaseline = null;
    this.deck = shuffleDeck(createDeck(), this.rng);
    this.burns = [];
    this.communityCards = [];
    this.currentBet = 0;
    this.pendingShortIncrement = 0;
    this.aggressorSeat = -1;
    this.raiseCount = 0;
    this.straddlerSeat = -1;
    this.winners = [];
    this.lastAction = undefined;
    this.history = [];

    const eligible = this.eligibleSeats().filter((s) => (this.bySeat(s)?.balance ?? 0) > 0);
    const eligibleIds = new Set(eligible.map((s) => this.bySeat(s)!.id));

    for (const p of this.players) {
      p.holeCards = [];
      p.committedThisStreet = 0;
      p.committedThisHand = 0;
      p.hasActedThisStreet = false;
      p.canRaise = true;
      if (eligibleIds.has(p.id)) p.status = 'active';
      else p.status = 'sitting_out';
    }

    // ---- Position: blinds & button (dead-button rules) ----
    const isHeadsUp = eligible.length === 2;
    if (isHeadsUp) {
      // Button = SB. The player who posted the BB most recently gets the button.
      if (this.previousBbSeat >= 0 && eligible.includes(this.previousBbSeat)) {
        this.buttonSeat = this.previousBbSeat;
        this.sbSeat = this.previousBbSeat;
        this.bbSeat = eligible.find((s) => s !== this.previousBbSeat)!;
      } else {
        // First hand: arbitrary but deterministic — lowest seat is button/SB.
        this.buttonSeat = eligible[0];
        this.sbSeat = eligible[0];
        this.bbSeat = eligible[1];
      }
    } else {
      if (this.previousBbSeat >= 0 && this.previousSbSeat >= 0) {
        // Dead-button algorithm (TDA 32): every player posts the BB exactly once per orbit.
        // nextBB  = first eligible seat clockwise from the previous BB seat.
        // nextSB  = the previous BB seat itself (empty → dead small blind).
        // nextBTN = the previous SB seat itself (empty → dead button).
        this.bbSeat = this.firstEligibleAfter(this.previousBbSeat) ?? eligible[0];
        this.sbSeat = this.previousBbSeat;
        this.buttonSeat = this.previousSbSeat;
      } else {
        // First hand: button at eligible[0], SB at eligible[1], BB at eligible[2].
        this.buttonSeat = eligible[0];
        this.sbSeat = this.firstEligibleAfter(this.buttonSeat) ?? eligible[1 % eligible.length];
        this.bbSeat = this.firstEligibleAfter(this.sbSeat) ?? eligible[2 % eligible.length];
      }
    }
    this.previousSbSeat = this.sbSeat;
    this.previousBbSeat = this.bbSeat;

    // Mark dealer
    for (const p of this.players) p.isDealer = p.seatIndex === this.buttonSeat;

    // ---- Forced bets (spec order: SB, then BB; BBA fills the blind before the ante) ----

    // Small blind (skip if dead SB seat, empty seat, or sitting-out)
    const sb = this.bySeat(this.sbSeat);
    if (sb && sb.seatIndex !== this.bbSeat && sb.status !== 'sitting_out') {
      const paid = Math.min(this.config.smallBlind, sb.balance);
      this.commit(sb, paid);
    }

    // Big blind (+ big blind ante, big-blind-first)
    const bb = this.bySeat(this.bbSeat);
    if (bb) {
      if (this.config.ante && this.config.ante > 0) {
        const blindFirst = Math.min(this.config.bigBlind, bb.balance);
        const remaining = bb.balance - blindFirst;
        const antePaid = Math.min(this.config.ante, remaining);
        this.commit(bb, blindFirst + antePaid);
      } else {
        const paid = Math.min(this.config.bigBlind, bb.balance);
        this.commit(bb, paid);
      }
    }

    this.currentBet = this.config.bigBlind;
    this.lastFullRaise = this.config.bigBlind;

    // ---- Deal hole cards: one at a time, two passes, starting SB, button last ----
    const firstDealSeat = isHeadsUp
      ? eligible.find((s) => s !== this.buttonSeat)!
      : (this.firstEligibleAfter(this.buttonSeat) ?? eligible[0]);
    const ordered = this.seatsInOrder(firstDealSeat);
    // Button receives the LAST card of each pass.
    const passSeats = ordered.filter((s) => s !== this.buttonSeat);
    const twoPasses: number[] = [
      ...passSeats, this.buttonSeat,
      ...passSeats, this.buttonSeat,
    ];
    for (const seat of twoPasses) {
      const p = this.bySeat(seat);
      if (!p || p.status === 'sitting_out') continue;
      const card = this.deck.shift()!;
      p.holeCards.push(card);
    }

    // Mark all-in from forced bets
    for (const p of this.players) {
      if (p.status === 'active' && p.balance === 0) p.status = 'all_in';
    }

    // ---- First to act ----
    if (isHeadsUp) {
      this.activeSeat = this.bySeat(this.buttonSeat)?.status === 'active' ? this.buttonSeat : this.nextActiveSeat(this.buttonSeat);
    } else if (this.straddlerSeat >= 0) {
      this.activeSeat = this.nextActiveSeat(this.straddlerSeat);
    } else {
      this.activeSeat = this.nextActiveSeat(this.bbSeat);
    }
    this.syncTurnFlag();

    this.history.push({ event: 'hand_start', hand: this.handNumber, button: this.buttonSeat, sb: this.sbSeat, bb: this.bbSeat });
    this.assertChipConservation();

    // Both blinds all-in preflop (or one player can still act?) → handle in performAction via advanceAfterAction.
    if (this.activeSeat === null) this.finishWithoutAction();

    return this.snapshot();
  }

  private previousSbSeat = -1;

  private commit(p: TablePlayer, amount: number): void {
    if (amount < 0) throw new Error(`NEGATIVE_COMMIT: ${p.id} ${amount}`);
    const actual = Math.min(amount, p.balance);
    p.balance -= actual;
    p.committedThisStreet += actual;
    p.committedThisHand += actual;
  }

  // ===== Actions =====

  performAction(
    playerId: string,
    action: PlayerAction,
    amount?: number
  ): GameSnapshot | { error: string; code: string } {
    const player = this.players.find((p) => p.id === playerId);
    if (!player) return { error: 'اللاعب غير موجود', code: 'PLAYER_NOT_FOUND' };
    if (this.phase === 'waiting' || this.phase === 'showdown') return { error: 'لا توجد يد جارية', code: 'NO_HAND' };
    if (this.activeSeat !== player.seatIndex) return { error: 'ليس دورك', code: 'NOT_YOUR_TURN' };
    if (player.status !== 'active') return { error: 'لا يمكنك اللعب', code: 'INVALID_STATE' };

    const toCall = this.currentBet - player.committedThisStreet;
    const structure = this.config.betStructure ?? 'no-limit';

    switch (action) {
      case 'fold': {
        player.status = 'folded';
        player.hasActedThisStreet = true;
        this.history.push({ seat: player.seatIndex, action: 'fold', street: this.phase });
        break;
      }

      case 'check': {
        if (toCall > 0) return { error: 'يجب عليك المطابقة أو الرفع', code: 'CANNOT_CHECK' };
        player.hasActedThisStreet = true;
        this.history.push({ seat: player.seatIndex, action: 'check', street: this.phase });
        break;
      }

      case 'call': {
        if (toCall <= 0) return { error: 'يمكنك فقط check', code: 'CANNOT_CALL' };
        const paid = Math.min(toCall, player.balance);
        this.commit(player, paid);
        player.hasActedThisStreet = true;
        if (player.balance === 0) player.status = 'all_in';
        this.history.push({ seat: player.seatIndex, action: 'call', amount: paid, street: this.phase });
        break;
      }

      case 'bet': {
        if (this.currentBet !== 0) return { error: 'استخدم زيادة', code: 'MUST_RAISE' };
        const minOpen = structure === 'fixed-limit' ? this.config.bigBlind : this.config.bigBlind;
        if (amount === undefined || amount <= 0) return { error: 'حدد مبلغ الرهان', code: 'INVALID_AMOUNT' };
        const maxLegal = player.committedThisStreet + player.balance;
        if (amount > maxLegal) return { error: 'رصيد غير كاف', code: 'INSUFFICIENT_STACK' };
        const isAllInBet = amount === maxLegal;
        if (amount < minOpen && !isAllInBet) return { error: `الحد الأدنى للرهان ${minOpen}`, code: 'BET_BELOW_MINIMUM' };

        const increment = amount - this.currentBet;
        this.commit(player, amount - player.committedThisStreet);
        this.currentBet = amount;
        this.aggressorSeat = player.seatIndex;
        if (increment >= this.lastFullRaise) {
          this.lastFullRaise = increment;
          this.pendingShortIncrement = 0;
          this.reopenForOthers(player, true);
        } else {
          // Short all-in opening bet
          this.applyShortAllIn(player, increment);
        }
        player.hasActedThisStreet = true;
        if (player.balance === 0) player.status = 'all_in';
        this.raiseCount = 1;
        this.history.push({ seat: player.seatIndex, action: 'bet', amount, street: this.phase });
        break;
      }

      case 'raise': {
        if (this.currentBet === 0) return { error: 'استخدم رهان', code: 'MUST_BET' };
        if (amount === undefined) return { error: 'حدد مبلغ الزيادة', code: 'INVALID_AMOUNT' };
        const maxLegal = player.committedThisStreet + player.balance;
        if (amount > maxLegal) return { error: 'رصيد غير كاف', code: 'INSUFFICIENT_STACK' };

        // Pot-limit cap
        if (structure === 'pot-limit') {
          const potLimit = this.maxRaiseToFor(player);
          if (amount > potLimit) return { error: 'يتجاوز حد الرهان', code: 'OVER_POT_LIMIT' };
        }

        const minRaiseTo = this.minRaiseToFor();
        const isAllInRaise = amount === maxLegal;
        if (amount < minRaiseTo && !isAllInRaise) {
          return { error: `الحد الأدنى للزيادة ${minRaiseTo}`, code: 'RAISE_BELOW_MINIMUM' };
        }
        if (!player.canRaise) return { error: 'لا يمكنك الزيادة', code: 'RAISE_NOT_REOPENED' };

        const increment = amount - this.currentBet;
        const fullRaiseIncrement = increment;

        this.commit(player, amount - player.committedThisStreet);
        this.currentBet = amount;
        this.aggressorSeat = player.seatIndex;
        this.raiseCount++;

        if (fullRaiseIncrement >= this.lastFullRaise) {
          this.lastFullRaise = fullRaiseIncrement;
          this.pendingShortIncrement = 0;
          this.reopenForOthers(player, true);
        } else {
          this.applyShortAllIn(player, fullRaiseIncrement);
        }
        player.hasActedThisStreet = true;
        if (player.balance === 0) player.status = 'all_in';
        this.history.push({ seat: player.seatIndex, action: 'raise', amount, street: this.phase });
        break;
      }

      case 'all_in': {
        if (player.balance <= 0) return { error: 'رصيدك صفر', code: 'ZERO_STACK' };
        const total = player.committedThisStreet + player.balance;
        const increment = total - this.currentBet;

        if (increment <= 0) {
          // All-in for less than the call amount → a call all-in.
          this.commit(player, player.balance);
          player.hasActedThisStreet = true;
          player.status = 'all_in';
          this.history.push({ seat: player.seatIndex, action: 'all_in_call', amount: player.committedThisStreet, street: this.phase });
          break;
        }

        this.commit(player, player.balance);
        this.currentBet = total;
        this.aggressorSeat = player.seatIndex;
        this.raiseCount++;

        if (increment >= this.lastFullRaise) {
          this.lastFullRaise = increment;
          this.pendingShortIncrement = 0;
          this.reopenForOthers(player, true);
        } else {
          this.applyShortAllIn(player, increment);
        }
        player.hasActedThisStreet = true;
        player.status = 'all_in';
        this.history.push({ seat: player.seatIndex, action: 'all_in', amount: total, street: this.phase });
        break;
      }

      default:
        return { error: 'إجراء غير معروف', code: 'UNKNOWN_ACTION' };
    }

    this.lastAction = { playerId: player.id, action, amount };
    this.advanceAfterAction();
    this.assertChipConservation();
    return this.snapshot();
  }

  /** Auto-action on timeout: fold when facing a bet, check otherwise. */
  timeoutPlayer(playerId: string): GameSnapshot | { error: string; code: string } {
    const p = this.players.find((x) => x.id === playerId);
    if (!p) return { error: 'اللاعب غير موجود', code: 'PLAYER_NOT_FOUND' };
    const toCall = this.currentBet - p.committedThisStreet;
    return this.performAction(playerId, toCall > 0 ? 'fold' : 'check');
  }

  private reopenForOthers(actor: TablePlayer, full: boolean): void {
    for (const p of this.players) {
      if (p.seatIndex === actor.seatIndex) continue;
      if (p.status !== 'active') continue;
      p.hasActedThisStreet = false;
      p.canRaise = true;
    }
  }

  private applyShortAllIn(actor: TablePlayer, increment: number): void {
    this.pendingShortIncrement += increment;
    for (const p of this.players) {
      if (p.seatIndex === actor.seatIndex) continue;
      if (p.status !== 'active') continue;
      const hadActed = p.hasActedThisStreet;
      p.hasActedThisStreet = false;
      if (hadActed) p.canRaise = false;
    }
    // Cumulative short all-ins totalling a full raise reopen action.
    if (this.pendingShortIncrement >= this.lastFullRaise) {
      this.lastFullRaise = this.pendingShortIncrement;
      this.pendingShortIncrement = 0;
      for (const p of this.players) {
        if (p.status === 'active') p.canRaise = true;
      }
    }
  }

  private minRaiseToFor(): number {
    return this.currentBet + this.lastFullRaise;
  }

  private maxRaiseToFor(player: TablePlayer): number {
    const structure = this.config.betStructure ?? 'no-limit';
    if (structure === 'no-limit') return player.committedThisStreet + player.balance;
    if (structure === 'pot-limit') {
      const toCall = this.currentBet - player.committedThisStreet;
      const P = this.totalChipsInPots() + this.streetChips();
      const maxRaiseTo = this.currentBet + toCall + P;
      return Math.min(maxRaiseTo, player.committedThisStreet + player.balance);
    }
    // fixed-limit
    return Math.min(this.currentBet + this.lastFullRaise, player.committedThisStreet + player.balance);
  }

  private streetChips(): number {
    return this.players.reduce((sum, p) => sum + p.committedThisStreet, 0);
  }

  private totalChipsInPots(): number {
    return this.players.reduce((sum, p) => sum + p.committedThisHand, 0);
  }

  // ===== Turn advancement =====

  private advanceAfterAction(): void {
    // Fold-out: exactly one non-folded player remains.
    const nonFolded = this.players.filter((p) => p.status !== 'folded' && p.status !== 'sitting_out');
    if (nonFolded.length === 1) {
      this.awardToLastPlayer(nonFolded[0]);
      return;
    }

    const activePlayers = this.players.filter((p) => p.status === 'active');

    if (activePlayers.length === 0) {
      // Everyone is all-in → run out the board.
      this.runOut();
      return;
    }

    if (this.isRoundComplete()) {
      this.advanceStreet();
      return;
    }

    // Next active player clockwise.
    const next = this.nextActiveSeat(this.activeSeat ?? -1);
    this.activeSeat = next;
    this.syncTurnFlag();
  }

  private nextActiveSeat(from: number): number | null {
    for (let i = 1; i <= this.config.maxPlayers; i++) {
      const s = (from + i) % this.config.maxPlayers;
      const p = this.bySeat(s);
      if (p && p.status === 'active') return s;
    }
    return null;
  }

  private isRoundComplete(): boolean {
    const activePlayers = this.players.filter((p) => p.status === 'active');
    if (activePlayers.length === 0) return false;

    for (const p of activePlayers) {
      if (!p.hasActedThisStreet) return false;
      if (p.committedThisStreet !== this.currentBet) return false;
    }
    return true;
  }

  private advanceStreet(): void {
    const phases: GamePhase[] = ['preflop', 'flop', 'turn', 'river'];
    const idx = phases.indexOf(this.phase);
    const next: GamePhase = idx === 3 ? 'showdown' : phases[idx + 1];

    if (next === 'showdown') {
      this.doShowdown();
      return;
    }

    // Reset street state
    for (const p of this.players) {
      p.committedThisStreet = 0;
      p.hasActedThisStreet = false;
      p.canRaise = true;
    }
    this.currentBet = 0;
    this.lastFullRaise = this.config.bigBlind;
    this.pendingShortIncrement = 0;
    this.aggressorSeat = -1;
    this.raiseCount = 0;

    // Burn + deal
    this.burns.push(this.deck.shift()!);
    if (next === 'flop') {
      this.communityCards.push(this.deck.shift()!, this.deck.shift()!, this.deck.shift()!);
    } else {
      this.communityCards.push(this.deck.shift()!);
    }
    this.phase = next;

    // First to act postflop: first ACTIVE seat left of the button (dead button included).
    const isHeadsUp = this.eligibleSeats().length === 2;
    if (isHeadsUp) {
      const nonButton = this.eligibleSeats().find((s) => s !== this.buttonSeat) ?? -1;
      this.activeSeat = this.bySeat(nonButton)?.status === 'active' ? nonButton : this.nextActiveSeat(nonButton);
    } else {
      this.activeSeat = this.nextActiveSeat(this.buttonSeat);
    }
    this.syncTurnFlag();

    this.history.push({ event: 'street', street: next, board: [...this.communityCards] });

    // If the first-to-act is null (no active players) → everyone all-in → run out.
    const active = this.players.filter((p) => p.status === 'active');
    if (this.activeSeat === null || active.length <= 1) {
      this.runOut();
      return;
    }

    this.assertChipConservation();
  }

  /** Deal all remaining streets with no betting (all-in run-out). */
  private runOut(): void {
    while (this.communityCards.length < 5) {
      this.burns.push(this.deck.shift()!);
      const count = this.communityCards.length === 0 ? 3 : 1;
      for (let i = 0; i < count; i++) this.communityCards.push(this.deck.shift()!);
      this.history.push({ event: 'street', street: 'runout', board: [...this.communityCards] });
    }
    this.phase = 'river';
    this.doShowdown();
  }

  private finishWithoutAction(): void {
    // No one can act (e.g. both blinds all-in).
    this.runOut();
  }

  // ===== Pots & awards =====

  private awardToLastPlayer(winner: TablePlayer): void {
    // Return any uncalled excess (only one non-folded player → nothing to return).
    const refund = this.uncalledExcess();
    winner.balance += refund;

    const total = this.totalChipsInPots();
    winner.balance += total;
    for (const p of this.players) {
      p.committedThisHand = 0;
      p.committedThisStreet = 0;
    }
    this.phase = 'showdown';
    this.winners = [{ playerId: winner.id, name: winner.name, amount: total, handName: 'الجميع انسحب', revealedCards: [], seatIndex: winner.seatIndex }];
    this.lastPots = [{ amount: total, eligibleSeats: [winner.seatIndex] }];
    this.lastPotTotal = total;
    this.history.push({ event: 'award_foldout', winner: winner.id, amount: total });
    this.assertChipConservation();
  }

  /** If exactly one in-hand player committed more than every other, refund the difference. */
  private uncalledExcess(): number {
    const inHand = this.players.filter((p) => p.status === 'active' || p.status === 'all_in');
    if (inHand.length === 0) return 0;
    const sorted = [...inHand].sort((a, b) => b.committedThisHand - a.committedThisHand);
    if (sorted.length >= 2 && sorted[0].committedThisHand > sorted[1].committedThisHand) {
      const refund = sorted[0].committedThisHand - sorted[1].committedThisHand;
      sorted[0].committedThisHand -= refund;
      sorted[0].committedThisStreet = Math.max(0, sorted[0].committedThisStreet - refund);
      sorted[0].balance += refund;
      return refund;
    }
    return 0;
  }

  private buildPots(): PotInfo[] {
    return computePots(
      this.players
        .filter((p) => p.status !== 'sitting_out')
        .map((p) => ({
          seat: p.seatIndex,
          amount: p.committedThisHand,
          inHand: p.status === 'active' || p.status === 'all_in',
        }))
    );
  }

  private doShowdown(): void {
    const refund = this.uncalledExcess();
    this.history.push({ event: 'uncalled_return', amount: refund });

    const pots = this.buildPots();
    const results = new Map<number, HandResult>();
    for (const seat of new Set(pots.flatMap((p) => p.eligibleSeats))) {
      const p = this.bySeat(seat)!;
      results.set(seat, evaluateHand(p.holeCards, this.communityCards));
    }

    const names = new Map<number, { id: string; name: string }>(
      this.players.map((p) => [p.seatIndex, { id: p.id, name: p.name }])
    );
    const { awards, winners: winnerList } = awardPots(
      pots,
      results,
      names,
      this.buttonSeat,
      this.config.maxPlayers
    );

    for (const [playerId, amount] of awards) {
      const p = this.players.find((x) => x.id === playerId)!;
      p.balance += amount;
    }
    for (const w of winnerList) {
      const p = this.players.find((x) => x.id === w.playerId)!;
      w.revealedCards = p.holeCards;
    }

    for (const p of this.players) {
      p.committedThisHand = 0;
      p.committedThisStreet = 0;
    }
    this.phase = 'showdown';
    this.winners = winnerList;
    this.lastPots = pots;
    this.lastPotTotal = pots.reduce((s, p) => s + p.amount, 0);
    this.history.push({ event: 'award', pots: pots.map((p) => ({ amount: p.amount, eligible: p.eligibleSeats })), awards: [...awards.entries()] });
    this.assertChipConservation();
  }

  // ===== Invariants =====

  private assertChipConservation(): void {
    const totalBefore = this.players.reduce((s, p) => s + p.balance + p.committedThisHand, 0);
    // Record baseline on first call of a hand
    if (this.handBaseline === null) {
      this.handBaseline = totalBefore;
      return;
    }
    if (totalBefore !== this.handBaseline) {
      throw new Error(`CHIP_CONSERVATION_VIOLATION: baseline ${this.handBaseline} vs ${totalBefore}`);
    }
  }

  private handBaseline: number | null = null;

  // ===== Queries =====

  getHoleCards(playerId: string): Card[] {
    const player = this.players.find((p) => p.id === playerId);
    return player?.holeCards || [];
  }

  private syncTurnFlag(): void {
    for (const p of this.players) p.isCurrentTurn = p.seatIndex === this.activeSeat;
  }

  getHandHistory(): Record<string, unknown>[] {
    return this.history;
  }

  getCurrentActorId(): string | null {
    if (this.activeSeat === null) return null;
    return this.bySeat(this.activeSeat)?.id ?? null;
  }

  legalActionsFor(playerId: string): LegalActions {
    const p = this.players.find((x) => x.id === playerId);
    if (!p || p.status !== 'active' || p.seatIndex !== this.activeSeat) {
      return { fold: false, check: false, call: false, bet: false, raise: false, allIn: false, toCall: 0, minRaiseTo: 0, maxRaiseTo: 0 };
    }
    const toCall = this.currentBet - p.committedThisStreet;
    const fixedCapReached =
      (this.config.betStructure ?? 'no-limit') === 'fixed-limit' &&
      this.raiseCount >= (this.config.fixedLimitCap ?? 4);
    return {
      fold: true,
      check: toCall === 0,
      call: toCall > 0,
      bet: this.currentBet === 0 && p.balance > 0,
      raise: toCall > 0 && p.balance > toCall && p.canRaise && !fixedCapReached,
      allIn: p.balance > 0,
      toCall,
      minRaiseTo: this.minRaiseToFor(),
      maxRaiseTo: this.maxRaiseToFor(p),
    };
  }

  snapshot(): GameSnapshot {
    const currentActorId = this.getCurrentActorId();
    const inShowdown = this.phase === 'showdown';
    return {
      tableId: 'table',
      phase: this.phase,
      players: this.players.map((p) => ({
        id: p.id,
        name: p.name,
        balance: p.balance,
        seatIndex: p.seatIndex,
        status: p.status,
        currentBet: p.committedThisStreet,
        totalRoundBet: p.committedThisHand,
        isDealer: p.isDealer,
        isCurrentTurn: p.isCurrentTurn,
      })),
      communityCards: [...this.communityCards],
      pot: inShowdown ? this.lastPotTotal : this.totalChipsInPots(),
      sidePots: inShowdown ? this.lastPots : this.buildPots(),
      currentBet: this.currentBet,
      activePlayerIndex: this.activeSeat ?? -1,
      dealerIndex: this.buttonSeat,
      deckRemaining: this.deck.length,
      lastAction: this.lastAction,
      winners: inShowdown ? this.winners : undefined,
      legalActions: currentActorId ? this.legalActionsFor(currentActorId) : undefined,
      handNumber: this.handNumber,
    };
  }
}
