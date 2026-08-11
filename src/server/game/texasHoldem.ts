// ============================================================
// جرب حظك — Texas Hold'em Game Engine
// Server-Authoritative State Machine
// ============================================================

import { Card, createDeck, shuffleDeck, dealCards } from './deck';
import { evaluateHand, HandResult } from './evaluator';

// ===== Types =====

export type GamePhase =
  | 'waiting'
  | 'preflop'
  | 'flop'
  | 'turn'
  | 'river'
  | 'showdown';

export type PlayerAction = 'fold' | 'check' | 'call' | 'raise' | 'all_in';

export type PlayerStatus = 'active' | 'folded' | 'all_in' | 'sitting_out';

export interface TableConfig {
  maxPlayers: number;
  smallBlind: number;
  bigBlind: number;
  minBuyIn: number;
}

export interface TablePlayer {
  id: string;
  name: string;
  balance: number;
  seatIndex: number;
  holeCards: Card[];
  status: PlayerStatus;
  currentBet: number;
  totalRoundBet: number;
  isDealer: boolean;
  isCurrentTurn: boolean;
}

export interface GameSnapshot {
  tableId: string;
  phase: GamePhase;
  players: Omit<TablePlayer, 'holeCards'>[];
  communityCards: Card[];
  pot: number;
  currentBet: number;
  activePlayerIndex: number;
  dealerIndex: number;
  deckRemaining: number;
  lastAction?: { playerId: string; action: PlayerAction; amount?: number };
  winners?: { playerId: string; name: string; amount: number; handName: string }[];
}

// ===== Engine =====

export class TexasHoldemEngine {
  private config: TableConfig;
  private deck: Card[] = [];
  private players: TablePlayer[] = [];
  private communityCards: Card[] = [];
  private pot: number = 0;
  private phase: GamePhase = 'waiting';
  private dealerIndex: number = 0;
  private activePlayerIndex: number = 0;
  private currentBet: number = 0;

  constructor(config: TableConfig) {
    this.config = config;
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
      currentBet: 0,
      totalRoundBet: 0,
      isDealer: false,
      isCurrentTurn: false,
    });
    return true;
  }

  removePlayer(id: string): void {
    this.players = this.players.filter((p) => p.id !== id);
  }

  private findNextSeat(): number {
    const taken = new Set(this.players.map((p) => p.seatIndex));
    for (let i = 0; i < this.config.maxPlayers; i++) {
      if (!taken.has(i)) return i;
    }
    return this.players.length; // fallback
  }

  // ===== Game Flow =====

  canStart(): boolean {
    const activePlayers = this.players.filter(
      (p) => p.status === 'active' || p.status === 'sitting_out'
    );
    return activePlayers.length >= 2;
  }

  startHand(): GameSnapshot | { error: string } {
    if (!this.canStart()) {
      return { error: 'عدد اللاعبين غير كاف' };
    }

    // Move dealer
    this.dealerIndex = (this.dealerIndex + 1) % this.players.length;

    // Reset state
    this.communityCards = [];
    this.pot = 0;
    this.currentBet = 0;
    this.phase = 'preflop';

    // Mark active players
    const activePlayers = this.players.filter((p) => p.status !== 'sitting_out');
    activePlayers.forEach((p) => {
      p.status = 'active';
      p.holeCards = [];
      p.currentBet = 0;
      p.totalRoundBet = 0;
    });

    // Set dealer
    this.players.forEach((p) => (p.isDealer = false));
    if (this.players[this.dealerIndex]) {
      this.players[this.dealerIndex].isDealer = true;
    }

    // Shuffle and deal
    this.deck = shuffleDeck(createDeck());

    // Deal 2 cards to each active player
    for (const player of activePlayers) {
      const { cards, remaining } = dealCards(this.deck, 2);
      player.holeCards = cards;
      this.deck = remaining;
    }

    // Post blinds
    const sbPlayer = this.getPlayerAfter(this.dealerIndex);
    const bbPlayer = this.getPlayerAfter((this.dealerIndex + 1) % this.players.length);

    if (sbPlayer && bbPlayer) {
      this.postBlind(sbPlayer, this.config.smallBlind);
      this.postBlind(bbPlayer, this.config.bigBlind);
      this.currentBet = this.config.bigBlind;
    }

    // Set first player to act (UTG = after BB)
    this.activePlayerIndex = (this.dealerIndex + 3) % this.players.length;
    this.setCurrentTurn();

    return this.snapshot();
  }

  performAction(playerId: string, action: PlayerAction, amount?: number): GameSnapshot | { error: string } {
    const player = this.players.find((p) => p.id === playerId);
    if (!player) return { error: 'اللاعب غير موجود' };
    if (!player.isCurrentTurn) return { error: 'ليس دورك' };
    if (player.status !== 'active') return { error: 'لا يمكنك اللعب' };

    switch (action) {
      case 'fold':
        player.status = 'folded';
        break;

      case 'check':
        if (this.currentBet > player.totalRoundBet) {
          return { error: 'يجب عليك المطابقة أو الرفع' };
        }
        break;

      case 'call': {
        const toCall = this.currentBet - player.totalRoundBet;
        if (toCall <= 0) return { error: 'يمكنك فقط check' };
        if (toCall > player.balance) {
          // All-in
          this.pot += player.balance;
          player.totalRoundBet += player.balance;
          player.balance = 0;
          player.status = 'all_in';
        } else {
          player.balance -= toCall;
          player.totalRoundBet += toCall;
          this.pot += toCall;
        }
        break;
      }

      case 'raise': {
        if (!amount || amount <= 0) return { error: 'حدد مبلغ الرفع' };
        const minRaise = this.currentBet * 2;
        if (amount < minRaise) return { error: `الحد الأدنى للرفع ${minRaise}` };
        if (amount > player.balance) {
          // All-in
          this.pot += player.balance;
          player.totalRoundBet += player.balance;
          player.balance = 0;
          player.status = 'all_in';
          this.currentBet = Math.max(this.currentBet, player.totalRoundBet);
        } else {
          player.balance -= amount;
          player.totalRoundBet += amount;
          this.pot += amount;
          this.currentBet = player.totalRoundBet;
        }
        break;
      }

      case 'all_in': {
        this.pot += player.balance;
        player.totalRoundBet += player.balance;
        player.balance = 0;
        player.status = 'all_in';
        this.currentBet = Math.max(this.currentBet, player.totalRoundBet);
        break;
      }
    }

    // Move to next player or next phase
    this.advanceTurn();

    return this.snapshot();
  }

  private advanceTurn(): void {
    const activeOrAllIn = this.players.filter(
      (p) => p.status === 'active' || p.status === 'all_in'
    );

    // If only one player active, others folded → winner
    const activePlayers = this.players.filter((p) => p.status === 'active');
    if (activePlayers.length === 1 && activeOrAllIn.length <= 1) {
      this.determineWinner();
      return;
    }

    // Check if betting round is complete
    if (this.isRoundComplete()) {
      this.advancePhase();
      return;
    }

    // Find next active player
    this.activePlayerIndex = (this.activePlayerIndex + 1) % this.players.length;
    let stuck = 0;
    while (
      this.players[this.activePlayerIndex]?.status !== 'active' &&
      stuck < this.players.length + 2
    ) {
      this.activePlayerIndex = (this.activePlayerIndex + 1) % this.players.length;
      stuck++;
    }
    this.setCurrentTurn();
  }

  private isRoundComplete(): boolean {
    const activePlayers = this.players.filter((p) => p.status === 'active');
    if (activePlayers.length === 0) return true;

    // Everyone active has bet the same amount (or all-in)
    const betAmount = this.currentBet;
    return activePlayers.every(
      (p) => p.totalRoundBet === betAmount
    );
  }

  private advancePhase(): void {
    const phases: GamePhase[] = ['preflop', 'flop', 'turn', 'river', 'showdown'];
    const currentIndex = phases.indexOf(this.phase);
    const nextPhase = phases[currentIndex + 1] || 'showdown';
    this.phase = nextPhase;

    // Reset round bets
    this.players.forEach((p) => (p.currentBet = 0));
    this.currentBet = 0;

    // Deal community cards
    switch (nextPhase) {
      case 'flop': {
        const { cards } = dealCards(this.deck, 3);
        this.communityCards = cards;
        break;
      }
      case 'turn':
      case 'river': {
        const { cards, remaining } = dealCards(this.deck, 1);
        this.communityCards = [...this.communityCards, ...cards];
        this.deck = remaining;
        break;
      }
      case 'showdown':
        this.determineWinner();
        return;
    }

    // Next to act = after dealer
    this.activePlayerIndex = (this.dealerIndex + 1) % this.players.length;
    let stuck = 0;
    while (
      this.players[this.activePlayerIndex]?.status !== 'active' &&
      stuck < this.players.length + 2
    ) {
      this.activePlayerIndex = (this.activePlayerIndex + 1) % this.players.length;
      stuck++;
    }
    this.setCurrentTurn();
  }

  private determineWinner(): void {
    const activeOrAllIn = this.players.filter(
      (p) => p.status === 'active' || p.status === 'all_in'
    );

    if (activeOrAllIn.length === 1) {
      // One player left — they win
      activeOrAllIn[0].balance += this.pot;
      this.phase = 'showdown';
      return;
    }

    // Evaluate hands
    const results: { player: TablePlayer; hand: HandResult }[] = [];
    for (const player of activeOrAllIn) {
      results.push({
        player,
        hand: evaluateHand(player.holeCards, this.communityCards),
      });
    }

    results.sort((a, b) => b.hand.score - a.hand.score);

    // Winner takes the pot
    const winner = results[0];
    winner.player.balance += this.pot;
    this.phase = 'showdown';
  }

  private postBlind(player: TablePlayer, amount: number): void {
    const actual = Math.min(amount, player.balance);
    player.balance -= actual;
    player.totalRoundBet += actual;
    this.pot += actual;
  }

  private getPlayerAfter(index: number): TablePlayer | null {
    // Find next active player in circular order
    let next = (index + 1) % this.players.length;
    let stuck = 0;
    while (
      (this.players[next]?.status === 'folded' || !this.players[next]) &&
      stuck < this.players.length + 2
    ) {
      next = (next + 1) % this.players.length;
      stuck++;
    }
    return this.players[next] || null;
  }

  private setCurrentTurn(): void {
    this.players.forEach((p) => (p.isCurrentTurn = false));
    if (this.players[this.activePlayerIndex]) {
      this.players[this.activePlayerIndex].isCurrentTurn = true;
    }
  }

  // ===== Queries =====

  getHoleCards(playerId: string): Card[] {
    const player = this.players.find((p) => p.id === playerId);
    return player?.holeCards || [];
  }

  snapshot(): GameSnapshot {
    return {
      tableId: 'table',
      phase: this.phase,
      players: this.players.map((p) => ({
        id: p.id,
        name: p.name,
        balance: p.balance,
        seatIndex: p.seatIndex,
        status: p.status,
        currentBet: p.totalRoundBet,
        totalRoundBet: p.totalRoundBet,
        isDealer: p.isDealer,
        isCurrentTurn: p.isCurrentTurn,
      })),
      communityCards: this.communityCards,
      pot: this.pot,
      currentBet: this.currentBet,
      activePlayerIndex: this.activePlayerIndex,
      dealerIndex: this.dealerIndex,
      deckRemaining: this.deck.length,
    };
  }
}
