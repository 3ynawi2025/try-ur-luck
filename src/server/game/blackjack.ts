// ============================================================
// جرب حظك — Blackjack Engine (rewrite)
// Server-authoritative. 6-deck shoe, peek, S17/H17 config,
// 3:2 naturals, DOA + DAS + RSA, late surrender, insurance,
// five-card Charlie, Perfect Pairs (D) + 21+3 (V7) side bets.
// ============================================================

import { Card, createDeck, shuffleDeck, getRankValue, Rng, cardKey } from './deck';

// ===== Types =====

export type BlackjackPhase = 'betting' | 'insurance' | 'playing' | 'dealer_turn' | 'complete';

export type BlackjackAction = 'hit' | 'stand' | 'double' | 'split' | 'surrender' | 'insurance';

export type HandStatus =
  | 'playing'
  | 'stood'
  | 'bust'
  | 'blackjack'
  | 'doubled'
  | 'surrendered'
  | 'charlie';

export interface BlackjackHand {
  cards: Card[];
  /** Stake for THIS hand (moved off the player — audit C4). */
  bet: number;
  status: HandStatus;
  fromSplit: boolean;
  isSplitAces: boolean;
  doubled: boolean;
  /** Settled out-of-band (even money); resolveAll must skip it. */
  preSettled: boolean;
}

export interface BlackjackPlayer {
  id: string;
  name: string;
  balance: number;
  /** Committed but not yet resolved (original bet + doubles/splits). */
  currentBet: number;
  hands: BlackjackHand[];
  activeHandIndex: number;
  insuranceBet: number;
  sideBets: { perfectPairs: number; twentyOnePlusThree: number };
}

export interface BlackjackConfig {
  deckCount: number;
  hitSoft17: boolean;
  blackjackPays: number; // 1.5 = 3:2
  doubleOn: 'any' | '9' | '10' | '11';
  doubleAfterSplit: boolean;
  resplitAces: boolean;
  maxSplits: number; // max hands per player = maxSplits + 1
  lateSurrender: boolean;
  fiveCardCharlie: boolean;
  penetration: number; // cut-card position as fraction of the shoe
  tableMin: number;
  tableMax: number;
  perfectPairs: boolean;
  twentyOnePlusThree: boolean;
  sideBetCapToMain: boolean;
  rng?: Rng;
  /** Test hook: fixed shoe used verbatim instead of a shuffled shoe. Tests only. */
  shoeOverride?: Card[];
}

export const DEFAULT_BLACKJACK_CONFIG: BlackjackConfig = {
  deckCount: 6,
  hitSoft17: false, // S17
  blackjackPays: 1.5, // 3:2
  doubleOn: 'any', // DOA
  doubleAfterSplit: true, // DAS
  resplitAces: true, // RSA
  maxSplits: 4,
  lateSurrender: true,
  fiveCardCharlie: true,
  penetration: 0.75,
  tableMin: 10,
  tableMax: 5000,
  perfectPairs: true,
  twentyOnePlusThree: true,
  sideBetCapToMain: true,
};

export type RoundResultKind = 'win' | 'lose' | 'push' | 'blackjack' | 'charlie' | 'surrender';

export interface HandResultInfo {
  playerId: string;
  name: string;
  handIndex: number;
  result: RoundResultKind;
  /** Net payout (profit only; stake returns are inside). */
  payout: number;
}

export interface BlackjackSnapshot {
  phase: BlackjackPhase;
  players: BlackjackPlayer[];
  dealerCards: Card[];
  dealerRevealed: boolean;
  dealerScore: { total: number; isSoft: boolean } | null;
  deckRemaining: number;
  reshufflePending: boolean;
  currentPlayerId: string | null;
  insuranceOffered: boolean;
  results?: HandResultInfo[];
  roundNumber: number;
}

const err = (message: string, code: string): { error: string; code: string } => ({ error: message, code });

// ===== Engine =====

export class BlackjackEngine {
  private config: BlackjackConfig;
  private rng: Rng;
  private shoe: Card[] = [];
  private cutCardPosition = 0;
  private reshufflePending = false;
  private players: BlackjackPlayer[] = [];
  private dealerCards: Card[] = [];
  private dealerRevealed = false;
  private phase: BlackjackPhase = 'betting';
  private roundNumber = 0;
  private currentPlayerIndex = -1;
  private results: HandResultInfo[] = [];

  constructor(config?: Partial<BlackjackConfig>) {
    this.config = { ...DEFAULT_BLACKJACK_CONFIG, ...config };
    this.rng = this.config.rng ?? Math.random;
  }

  // ===== Player management =====

  addPlayer(id: string, name: string, balance: number): boolean {
    if (this.players.find((p) => p.id === id)) return false;
    this.players.push({
      id,
      name,
      balance,
      currentBet: 0,
      hands: [],
      activeHandIndex: 0,
      insuranceBet: 0,
      sideBets: { perfectPairs: 0, twentyOnePlusThree: 0 },
    });
    return true;
  }

  removePlayer(id: string): void {
    this.players = this.players.filter((p) => p.id !== id);
  }

  // ===== Betting =====

  placeBet(
    playerId: string,
    amount: number,
    sideBets: { perfectPairs?: number; twentyOnePlusThree?: number } = {}
  ): string | null {
    const player = this.players.find((p) => p.id === playerId);
    if (!player) return 'اللاعب غير موجود';
    if (this.phase !== 'betting' && this.phase !== 'complete') return 'انتهى وقت المراهنة';
    if (this.phase === 'complete') {
      // A new betting round begins.
      this.phase = 'betting';
      this.results = [];
    }
    if (amount < this.config.tableMin) return `الحد الأدنى ${this.config.tableMin}`;
    if (amount > this.config.tableMax) return `الحد الأقصى ${this.config.tableMax}`;
    if (amount > player.balance) return 'رصيد غير كاف';

    const pp = sideBets.perfectPairs ?? 0;
    const tp = sideBets.twentyOnePlusThree ?? 0;
    if (this.config.sideBetCapToMain && (pp > amount || tp > amount)) return 'الرهان الجانبي لا يتجاوز الرهان الأساسي';
    if (pp + tp + amount > player.balance) return 'رصيد غير كاف';

    player.currentBet = amount;
    player.balance -= amount + pp + tp;
    player.sideBets = { perfectPairs: pp, twentyOnePlusThree: tp };
    player.hands = [];
    player.insuranceBet = 0;
    return null;
  }

  allPlayersBet(): boolean {
    return this.players.length > 0 && this.players.every((p) => p.currentBet > 0);
  }

  // ===== Shoe =====

  private ensureShoe(): void {
    if (this.config.shoeOverride) {
      // Test hook: use the provided shoe verbatim (deep copy).
      this.shoe = this.config.shoeOverride.map((c) => ({ ...c }));
      this.cutCardPosition = 0;
      this.reshufflePending = false;
      return;
    }
    if (this.shoe.length === 0 || (this.reshufflePending && this.phase === 'betting')) {
      const decks: Card[] = [];
      for (let i = 0; i < this.config.deckCount; i++) decks.push(...createDeck());
      this.shoe = shuffleDeck(decks, this.rng);
      const total = this.shoe.length;
      this.cutCardPosition = Math.max(10, Math.floor(total * (1 - this.config.penetration)));
      this.reshufflePending = false;
    }
  }

  private draw(): Card {
    const card = this.shoe.shift();
    if (!card) throw new Error('SHOE_EMPTY_MID_ROUND');
    if (this.shoe.length <= this.cutCardPosition) this.reshufflePending = true;
    return card;
  }

  // ===== Scoring =====

  /** Returns { total, isSoft }. At most one ace is valued 11. */
  calculateScore(cards: Card[]): { total: number; isSoft: boolean } {
    let total = 0;
    let aces = 0;
    for (const card of cards) {
      const val = getRankValue(card.rank);
      if (val === 14) {
        aces++;
        total += 11;
      } else if (val >= 10) {
        total += 10;
      } else {
        total += val;
      }
    }
    while (total > 21 && aces > 0) {
      total -= 10;
      aces--;
    }
    return { total, isSoft: aces > 0 };
  }

  private isBlackjack(hand: BlackjackHand): boolean {
    return hand.cards.length === 2 && !hand.fromSplit && this.calculateScore(hand.cards).total === 21;
  }

  // ===== Round start =====

  startRound(): BlackjackSnapshot | { error: string; code: string } {
    if (this.phase !== 'betting' && this.phase !== 'complete') return err('الجولة قيد التشغيل', 'ROUND_IN_PROGRESS');
    if (!this.allPlayersBet()) return err('لم يكمل الجميع الرهان', 'BETS_PENDING');

    this.ensureShoe();
    this.roundNumber++;
    this.dealerCards = [];
    this.dealerRevealed = false;
    this.results = [];
    this.phase = 'playing';

    for (const player of this.players) {
      player.hands = [{ cards: [], bet: player.currentBet, status: 'playing', fromSplit: false, isSplitAces: false, doubled: false, preSettled: false }];
      player.activeHandIndex = 0;
      player.insuranceBet = 0;
    }

    // Round-robin dealing: each box one card, dealer upcard, each box second card, dealer hole.
    for (const player of this.players) player.hands[0].cards.push(this.draw());
    this.dealerCards.push(this.draw()); // upcard (face up)
    for (const player of this.players) player.hands[0].cards.push(this.draw());
    this.dealerCards.push(this.draw()); // hole card (face down)

    // 2-card side bets resolve now (before insurance).
    for (const player of this.players) {
      const hand = player.hands[0];
      if (player.sideBets.perfectPairs > 0) {
        const payout = this.resolvePerfectPairs(hand.cards) * player.sideBets.perfectPairs;
        player.balance += payout;
      }
      if (player.sideBets.twentyOnePlusThree > 0) {
        const payout = this.resolve21Plus3(hand.cards, this.dealerCards[0]) * player.sideBets.twentyOnePlusThree;
        player.balance += payout;
      }
    }

    // Mark naturals
    for (const player of this.players) {
      if (this.isBlackjack(player.hands[0])) player.hands[0].status = 'blackjack';
    }

    // Insurance offer iff upcard is an Ace
    const upcard = this.dealerCards[0];
    if (getRankValue(upcard.rank) === 14) {
      this.phase = 'insurance';
      this.currentPlayerIndex = -1;
      return this.snapshot();
    }

    // Peek for a dealer natural (Ace or ten-value upcard)
    if (this.peekForNatural()) {
      this.finishOnDealerNatural();
      return this.snapshot();
    }

    this.setFirstToPlay();
    return this.snapshot();
  }

  /** Peek: dealer checks the hole card. Returns true if the dealer has a natural. */
  private peekForNatural(): boolean {
    const up = getRankValue(this.dealerCards[0].rank);
    if (up !== 14 && up < 10) return false; // 2-9 cannot be natural
    const dealerScore = this.calculateScore(this.dealerCards).total;
    return dealerScore === 21;
  }

  private finishOnDealerNatural(): void {
    this.dealerRevealed = true;
    for (const player of this.players) {
      const hand = player.hands[0];
      if (hand.status === 'blackjack') {
        // Natural vs natural → push: stake returned.
        player.balance += hand.bet;
        this.results.push({ playerId: player.id, name: player.name, handIndex: 0, result: 'push', payout: hand.bet });
      } else {
        // Non-natural players lose their original bet.
        this.results.push({ playerId: player.id, name: player.name, handIndex: 0, result: 'lose', payout: 0 });
      }
      // Insurance pays 2:1
      if (player.insuranceBet > 0) {
        player.balance += player.insuranceBet * 3; // 2:1 + stake
        this.results.push({ playerId: player.id, name: player.name, handIndex: 0, result: 'win', payout: player.insuranceBet * 2 });
      }
      player.currentBet = 0;
    }
    this.phase = 'complete';
  }

  // ===== Insurance =====

  takeInsurance(playerId: string, amount?: number): string | null {
    const player = this.players.find((p) => p.id === playerId);
    if (!player) return 'اللاعب غير موجود';
    if (this.phase !== 'insurance') return 'التأمين غير متاح';
    const mainBet = player.hands[0]?.bet ?? player.currentBet;
    const maxInsurance = Math.floor(mainBet / 2);
    const stake = amount ?? maxInsurance;
    if (stake <= 0) return 'مبلغ غير صالح';
    if (stake > maxInsurance) return `الحد الأقصى للتأمين ${maxInsurance}`;
    if (stake > player.balance) return 'رصيد غير كاف';
    player.balance -= stake;
    player.insuranceBet = stake;
    return null;
  }

  declineInsurance(playerId: string): string | null {
    const player = this.players.find((p) => p.id === playerId);
    if (!player) return 'اللاعب غير موجود';
    if (this.phase !== 'insurance') return 'التأمين غير متاح';
    player.insuranceBet = 0;
    return null;
  }

  finishInsurance(): BlackjackSnapshot | { error: string; code: string } {
    if (this.phase !== 'insurance') return err('التأمين غير متاح', 'NO_INSURANCE_PHASE');
    if (this.peekForNatural()) {
      this.finishOnDealerNatural();
      return this.snapshot();
    }
    this.phase = 'playing';
    this.setFirstToPlay();
    return this.snapshot();
  }

  /** Even money: a natural vs an Ace upcard settles at 1:1 immediately. */
  takeEvenMoney(playerId: string): string | null {
    const player = this.players.find((p) => p.id === playerId);
    if (!player) return 'اللاعب غير موجود';
    if (this.phase !== 'insurance') return 'غير متاح';
    const hand = player.hands[0];
    if (!hand || hand.status !== 'blackjack') return 'يجب أن يكون لديك بلاك جاك';
    // Settled immediately at 1:1; resolveAll must skip it.
    player.balance += hand.bet * 2;
    hand.status = 'stood';
    hand.preSettled = true;
    this.results.push({ playerId: player.id, name: player.name, handIndex: 0, result: 'win', payout: hand.bet });
    return null;
  }

  // ===== Turn management =====

  private setFirstToPlay(): void {
    for (let i = 0; i < this.players.length; i++) {
      const player = this.players[i];
      if (player.hands.some((h) => h.status === 'playing')) {
        this.currentPlayerIndex = i;
        return;
      }
    }
    this.currentPlayerIndex = -1;
    this.dealerPlay();
  }

  getCurrentPlayerId(): string | null {
    if (this.currentPlayerIndex < 0 || this.currentPlayerIndex >= this.players.length) return null;
    return this.players[this.currentPlayerIndex].id;
  }

  private getCurrentHand(): { player: BlackjackPlayer; hand: BlackjackHand } | null {
    if (this.currentPlayerIndex < 0) return null;
    const player = this.players[this.currentPlayerIndex];
    const hand = player.hands[player.activeHandIndex];
    if (!hand) return null;
    return { player, hand };
  }

  /** Move to the next playable hand; dealer plays when none remain. */
  private advanceTurn(): void {
    // First try the next hand of the same player (split hands in creation order).
    const current = this.players[this.currentPlayerIndex];
    if (current) {
      for (let h = current.activeHandIndex + 1; h < current.hands.length; h++) {
        if (current.hands[h].status === 'playing') {
          current.activeHandIndex = h;
          return;
        }
      }
    }
    for (let i = this.currentPlayerIndex + 1; i < this.players.length; i++) {
      const player = this.players[i];
      const idx = player.hands.findIndex((h) => h.status === 'playing');
      if (idx >= 0) {
        this.currentPlayerIndex = i;
        player.activeHandIndex = idx;
        return;
      }
    }
    this.currentPlayerIndex = -1;
    this.dealerPlay();
  }

  // ===== Player actions =====

  performAction(
    playerId: string,
    action: BlackjackAction,
    amount?: number
  ): BlackjackSnapshot | { error: string; code: string } {
    if (this.phase !== 'playing') return err('انتهت الجولة', 'ROUND_OVER');
    if (playerId !== this.getCurrentPlayerId()) return err('ليس دورك', 'NOT_YOUR_TURN');

    const cur = this.getCurrentHand();
    if (!cur) return err('لا توجد يد', 'NO_HAND');
    const { player, hand } = cur;

    switch (action) {
      case 'hit': {
        if (hand.status !== 'playing') return err('انتهت هذه اليد', 'HAND_OVER');
        if (hand.isSplitAces) return err('آص مفصول يحصل على ورقة واحدة فقط', 'SPLIT_ACES_ONE_CARD');
        hand.cards.push(this.draw());
        const score = this.calculateScore(hand.cards).total;
        if (score > 21) {
          hand.status = 'bust';
        } else if (this.config.fiveCardCharlie && hand.cards.length === 5 && !hand.doubled) {
          // Five-card Charlie wins immediately at 1:1.
          hand.status = 'charlie';
          player.balance += hand.bet * 2;
          this.results.push({ playerId: player.id, name: player.name, handIndex: player.activeHandIndex, result: 'charlie', payout: hand.bet });
        } else if (score === 21) {
          hand.status = 'stood';
        }
        if (hand.status === 'playing') return this.snapshot(); // turn stays with this hand (M2 fix)
        this.advanceTurn();
        return this.snapshot();
      }

      case 'stand': {
        if (hand.status !== 'playing') return err('انتهت هذه اليد', 'HAND_OVER');
        hand.status = 'stood';
        this.advanceTurn();
        return this.snapshot();
      }

      case 'double': {
        if (hand.status !== 'playing') return err('انتهت هذه اليد', 'HAND_OVER');
        if (hand.cards.length !== 2) return err('لا يمكن المضاعفة بعد السحب', 'DOUBLE_NOT_ALLOWED');
        if (hand.isSplitAces) return err('لا مضاعفة على آص مفصول', 'DOUBLE_NOT_ALLOWED');
        if (hand.fromSplit && !this.config.doubleAfterSplit) return err('المضاعفة بعد الفصل غير مسموحة', 'NO_DAS');
        if (!this.doubleAllowed(hand)) return err('المضاعفة غير مسموحة على هذا المجموع', 'DOUBLE_NOT_ALLOWED');
        if (player.balance < hand.bet) return err('رصيد غير كاف للمضاعفة', 'INSUFFICIENT_STACK');

        player.balance -= hand.bet;
        player.currentBet += hand.bet;
        hand.bet += hand.bet; // doubled stake lives on the hand (C4 fix)
        hand.doubled = true;
        hand.cards.push(this.draw());
        const score = this.calculateScore(hand.cards).total;
        // A doubled hand that busts is a LOSS (C1 fix)
        hand.status = score > 21 ? 'bust' : 'stood';
        this.advanceTurn();
        return this.snapshot();
      }

      case 'split': {
        if (hand.status !== 'playing') return err('انتهت هذه اليد', 'HAND_OVER');
        if (hand.cards.length !== 2) return err('الفصل ليد بورقتين فقط', 'SPLIT_NOT_ALLOWED');
        const [c1, c2] = hand.cards;
        const sameRank = c1.rank === c2.rank;
        const anyTen = ['10', 'J', 'Q', 'K'].includes(c1.rank) && ['10', 'J', 'Q', 'K'].includes(c2.rank);
        if (!sameRank && !anyTen) return err('الورقتان غير متساويتين', 'SPLIT_NOT_ALLOWED');
        if (player.hands.length > this.config.maxSplits) return err('وصلت الحد الأقصى للفصل', 'MAX_SPLITS');
        if (hand.isSplitAces && !this.config.resplitAces) return err('لا إعادة فصل للآص', 'NO_RESPLIT_ACES');
        if (player.balance < hand.bet) return err('رصيد غير كاف للفصل', 'INSUFFICIENT_STACK');

        player.balance -= hand.bet;
        player.currentBet += hand.bet;

        const isAces = c1.rank === 'A';
        // Second hand gets one of the two cards + a new card.
        const second: BlackjackHand = {
          cards: [c2, this.draw()],
          bet: hand.bet,
          status: 'playing',
          fromSplit: true,
          isSplitAces: isAces,
          doubled: false,
          preSettled: false,
        };
        // First hand keeps the other card + a new card.
        hand.cards = [c1, this.draw()];
        hand.fromSplit = true;
        hand.isSplitAces = isAces;

        // 21 on a split hand is NOT a natural (pays 1:1).
        if (this.calculateScore(hand.cards).total === 21) hand.status = 'stood';
        if (this.calculateScore(second.cards).total === 21) second.status = 'stood';

        if (isAces) {
          // Split aces receive exactly one card each. With RSA, a hand that drew
          // ANOTHER ace remains splittable (resplit) but may never hit or double.
          const firstResplittable = this.config.resplitAces && hand.cards[1].rank === 'A';
          const secondResplittable = this.config.resplitAces && second.cards[1].rank === 'A';
          hand.status = firstResplittable ? 'playing' : 'stood';
          second.status = secondResplittable ? 'playing' : 'stood';
        }

        player.hands.splice(player.activeHandIndex + 1, 0, second);
        if (hand.status === 'playing') return this.snapshot(); // keep turn on the first hand
        this.advanceTurn();
        return this.snapshot();
      }

      case 'surrender': {
        if (!this.config.lateSurrender) return err('الاستسلام غير متاح', 'NO_SURRENDER');
        if (hand.status !== 'playing') return err('انتهت هذه اليد', 'HAND_OVER');
        if (hand.cards.length !== 2 || hand.doubled) return err('الاستسلام ليد بورقتين فقط', 'SURRENDER_NOT_ALLOWED');
        // Late surrender: half the wager is returned.
        const refund = Math.floor(hand.bet / 2);
        player.balance += refund;
        hand.status = 'surrendered';
        this.results.push({ playerId: player.id, name: player.name, handIndex: player.activeHandIndex, result: 'surrender', payout: refund });
        this.advanceTurn();
        return this.snapshot();
      }

      default:
        return err('إجراء غير معروف', 'UNKNOWN_ACTION');
    }
  }

  private doubleAllowed(hand: BlackjackHand): boolean {
    const total = this.calculateScore(hand.cards).total;
    switch (this.config.doubleOn) {
      case 'any': return true;
      case '9': return total === 9;
      case '10': return total === 10;
      case '11': return total === 11;
      default: return true;
    }
  }

  // ===== Dealer =====

  private dealerPlay(): void {
    this.dealerRevealed = true;
    this.phase = 'dealer_turn';

    const hasLiveHand = this.players.some((p) =>
      p.hands.some((h) => h.status === 'stood' || h.status === 'blackjack' || h.status === 'charlie')
    );

    // Dealer draws only if at least one live (non-busted, non-surrendered) hand remains.
    if (hasLiveHand) {
      while (true) {
        const { total, isSoft } = this.calculateScore(this.dealerCards);
        const mustHit = total < 17 || (total === 17 && isSoft && this.config.hitSoft17);
        if (!mustHit) break;
        this.dealerCards.push(this.draw());
      }
    }

    this.resolveAll();
  }

  // ===== Resolution =====

  private resolveAll(): void {
    this.phase = 'complete';
    const dealerScore = this.calculateScore(this.dealerCards);
    const dealerBust = dealerScore.total > 21;
    const dealerNatural = this.dealerCards.length === 2 && dealerScore.total === 21;

    for (const player of this.players) {
      for (let h = 0; h < player.hands.length; h++) {
        const hand = player.hands[h];
        if (hand.status === 'surrendered' || hand.status === 'charlie' || hand.preSettled) continue; // already settled

        const playerScore = this.calculateScore(hand.cards).total;
        let result: RoundResultKind;
        let payout = 0; // profit only; the stake return is implicit in win/push payouts

        if (hand.status === 'blackjack') {
          if (dealerNatural) {
            // Natural vs natural → push (C2 fix)
            result = 'push';
            payout = hand.bet;
          } else {
            result = 'blackjack';
            // 3:2, integral rounding for odd stakes: (bet * 1.5) + bet returned.
            payout = Math.floor(hand.bet * this.config.blackjackPays) + hand.bet;
          }
        } else if (hand.status === 'bust') {
          result = 'lose';
          payout = 0;
        } else if (dealerBust) {
          result = 'win';
          payout = hand.bet * 2;
        } else if (playerScore > dealerScore.total) {
          result = 'win';
          payout = hand.bet * 2;
        } else if (playerScore === dealerScore.total) {
          result = 'push';
          payout = hand.bet;
        } else {
          result = 'lose';
          payout = 0;
        }

        player.balance += payout;
        this.results.push({ playerId: player.id, name: player.name, handIndex: h, result, payout });
      }
      player.currentBet = 0;
      player.insuranceBet = 0;
      player.sideBets = { perfectPairs: 0, twentyOnePlusThree: 0 };
    }
  }

  // ===== Side bets =====

  /** Perfect Pairs table D: Perfect 25:1, Coloured 15:1, Mixed 5:1. Returns the multiple. */
  private resolvePerfectPairs(cards: Card[]): number {
    const [a, b] = cards;
    if (a.rank !== b.rank) return 0;
    if (a.suit === b.suit) return 25;
    const red = (s: string) => s === 'hearts' || s === 'diamonds';
    if (red(a.suit) === red(b.suit)) return 15;
    return 5;
  }

  /** 21+3 variant 7: suited trips 100, SF 40, trips 30, straight 10, flush 5. Returns the multiple. */
  private resolve21Plus3(playerCards: Card[], dealerUpcard: Card): number {
    const cards = [playerCards[0], playerCards[1], dealerUpcard];
    const ranks = cards.map((c) => getRankValue(c.rank)).sort((x, y) => y - x);
    const suitedTrips = cards[0].suit === cards[1].suit && cards[1].suit === cards[2].suit && ranks[0] === ranks[2];
    const isFlush = cards[0].suit === cards[1].suit && cards[1].suit === cards[2].suit;
    const trips = ranks[0] === ranks[2];

    let isStraight = false;
    const [a, b, c] = ranks;
    if (a === 14 && b === 3 && c === 2) isStraight = true; // A-2-3
    else if (a === 14 && b === 13 && c === 12) isStraight = true; // Q-K-A
    else if (a - 1 === b && b - 1 === c) isStraight = true;
    // K-A-2 is NOT a straight (excluded by construction).

    if (suitedTrips) return 100;
    if (isStraight && isFlush) return 40;
    if (trips) return 30;
    if (isStraight) return 10;
    if (isFlush) return 5;
    return 0;
  }

  // ===== Queries =====

  snapshot(): BlackjackSnapshot {
    const dealerVisible = this.dealerRevealed || this.phase === 'complete';
    const dealerCards = this.dealerCards.length > 0
      ? (dealerVisible ? [...this.dealerCards] : [this.dealerCards[0]])
      : [];
    return {
      phase: this.phase,
      players: this.players.map((p) => ({
        ...p,
        hands: p.hands.map((h) => ({ ...h, cards: [...h.cards] })),
      })),
      dealerCards,
      dealerRevealed: dealerVisible,
      dealerScore: this.phase === 'complete' ? this.calculateScore(this.dealerCards) : null,
      deckRemaining: this.shoe.length,
      reshufflePending: this.reshufflePending,
      currentPlayerId: this.getCurrentPlayerId(),
      insuranceOffered: this.phase === 'insurance',
      results: this.phase === 'complete' ? this.results : undefined,
      roundNumber: this.roundNumber,
    };
  }
}
