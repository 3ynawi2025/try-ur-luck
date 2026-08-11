// ============================================================
// جرب حظك — Blackjack Engine
// Server-Authoritative
// ============================================================

import { Card, createDeck, shuffleDeck, dealCards, getRankValue } from './deck';

export type BlackjackPhase = 'betting' | 'playing' | 'dealer_turn' | 'complete';
export type BlackjackAction = 'hit' | 'stand' | 'double' | 'split';

export interface BlackjackPlayer {
  id: string;
  name: string;
  balance: number;
  currentBet: number;
  hands: {
    cards: Card[];
    status: 'playing' | 'stood' | 'bust' | 'blackjack' | 'doubled';
  }[];
  activeHandIndex: number;
}

export interface BlackjackSnapshot {
  phase: BlackjackPhase;
  players: BlackjackPlayer[];
  dealerCards: Card[];
  dealerRevealed: boolean;
  deckRemaining: number;
  currentPlayerId: string | null;
  results?: { playerId: string; name: string; result: 'win' | 'lose' | 'push' | 'blackjack'; payout: number }[];
}

export class BlackjackEngine {
  private deck: Card[] = [];
  private players: BlackjackPlayer[] = [];
  private dealerCards: Card[] = [];
  private dealerRevealed: boolean = false;
  private phase: BlackjackPhase = 'betting';
  private playerOrder: string[] = [];
  private currentPlayerIndex: number = 0;

  constructor() {}

  // ===== Player Management =====

  addPlayer(id: string, name: string, balance: number): boolean {
    if (this.players.find((p) => p.id === id)) return false;
    this.players.push({
      id,
      name,
      balance,
      currentBet: 0,
      hands: [],
      activeHandIndex: 0,
    });
    return true;
  }

  removePlayer(id: string): void {
    this.players = this.players.filter((p) => p.id !== id);
  }

  // ===== Betting Phase =====

  placeBet(playerId: string, amount: number): string | null {
    const player = this.players.find((p) => p.id === playerId);
    if (!player) return 'اللاعب غير موجود';
    if (amount > player.balance) return 'رصيد غير كاف';
    if (amount <= 0) return 'مبلغ غير صالح';
    if (this.phase !== 'betting') return 'انتهى وقت المراهنة';

    player.currentBet = amount;
    player.balance -= amount;
    return null;
  }

  allPlayersBet(): boolean {
    return this.players.every((p) => p.currentBet > 0);
  }

  // ===== Start Round =====

  startRound(): BlackjackSnapshot {
    this.deck = shuffleDeck(createDeck());
    this.dealerCards = [];
    this.dealerRevealed = false;
    this.phase = 'playing';
    this.currentPlayerIndex = 0;

    // Deal cards
    for (const player of this.players) {
      const { cards: pCards, remaining } = dealCards(this.deck, 2);
      player.hands = [{ cards: pCards, status: 'playing' }];
      player.activeHandIndex = 0;
      this.deck = remaining;
    }

    // Dealer cards
    const { cards: dCards, remaining: rem1 } = dealCards(this.deck, 2);
    this.dealerCards = dCards;
    this.deck = rem1;

    // Check for natural blackjacks
    for (const player of this.players) {
      if (this.calculateScore(player.hands[0].cards) === 21) {
        player.hands[0].status = 'blackjack';
      }
    }

    this.playerOrder = this.players.filter(
      (p) => p.hands[0].status === 'playing'
    ).map((p) => p.id);

    if (this.playerOrder.length === 0) {
      this.revealDealer();
      this.resolveAll();
    }

    return this.snapshot();
  }

  // ===== Player Actions =====

  performAction(playerId: string, action: BlackjackAction): string | null {
    if (this.phase !== 'playing') return 'انتهت الجولة';
    if (playerId !== this.getCurrentPlayerId()) return 'ليس دورك';

    const player = this.players.find((p) => p.id === playerId);
    if (!player) return 'اللاعب غير موجود';

    const hand = player.hands[player.activeHandIndex];
    if (!hand || hand.status !== 'playing') return 'انتهى دور هذه اليد';

    switch (action) {
      case 'hit': {
        const { cards, remaining } = dealCards(this.deck, 1);
        hand.cards.push(...cards);
        this.deck = remaining;

        const score = this.calculateScore(hand.cards);
        if (score > 21) {
          hand.status = 'bust';
        } else if (score === 21) {
          hand.status = 'stood';
        }
        break;
      }

      case 'stand': {
        hand.status = 'stood';
        break;
      }

      case 'double': {
        if (hand.cards.length !== 2) return 'لا يمكن المضاعفة بعد السحب';
        if (player.balance < player.currentBet) return 'رصيد غير كاف';

        player.balance -= player.currentBet;
        player.currentBet *= 2;

        const { cards, remaining } = dealCards(this.deck, 1);
        hand.cards.push(...cards);
        this.deck = remaining;
        hand.status = 'doubled';
        break;
      }
    }

    this.advanceTurn();
    return null;
  }

  private advanceTurn(): void {
    // Move to next active player
    let nextIndex = (this.currentPlayerIndex + 1) % this.playerOrder.length;
    let stuck = 0;

    while (stuck < this.playerOrder.length + 2) {
      const playerId = this.playerOrder[nextIndex];
      const player = this.players.find((p) => p.id === playerId);
      if (player) {
        const hand = player.hands[player.activeHandIndex];
        if (hand && hand.status === 'playing') {
          this.currentPlayerIndex = nextIndex;
          return;
        }
      }
      nextIndex = (nextIndex + 1) % this.playerOrder.length;
      stuck++;
    }

    // No more players to play → dealer's turn
    this.dealerPlay();
  }

  // ===== Dealer =====

  private dealerPlay(): void {
    this.revealDealer();
    this.phase = 'dealer_turn';

    // Dealer hits on soft 17
    while (true) {
      const score = this.calculateScore(this.dealerCards);
      if (score >= 17) break;
      const { cards, remaining } = dealCards(this.deck, 1);
      this.dealerCards.push(...cards);
      this.deck = remaining;
    }

    this.resolveAll();
  }

  private revealDealer(): void {
    this.dealerRevealed = true;
  }

  private resolveAll(): void {
    this.phase = 'complete';
    const dealerScore = this.calculateScore(this.dealerCards);
    const dealerBust = dealerScore > 21;

    const results: BlackjackSnapshot['results'] = [];

    for (const player of this.players) {
      for (let h = 0; h < player.hands.length; h++) {
        const hand = player.hands[h];
        const playerScore = this.calculateScore(hand.cards);

        let result: 'win' | 'lose' | 'push' | 'blackjack';
        let payout = 0;

        if (hand.status === 'blackjack') {
          result = 'blackjack';
          payout = Math.floor(player.currentBet * 2.5); // 3:2
        } else if (hand.status === 'bust') {
          result = 'lose';
          payout = 0;
        } else if (dealerBust) {
          result = 'win';
          payout = player.currentBet * 2;
        } else if (playerScore > dealerScore) {
          result = 'win';
          payout = player.currentBet * 2;
        } else if (playerScore === dealerScore) {
          result = 'push';
          payout = player.currentBet;
        } else {
          result = 'lose';
          payout = 0;
        }

        player.balance += payout;
        results.push({ playerId: player.id, name: player.name, result, payout });
      }

      // Reset bet
      player.currentBet = 0;
    }

    this.phase = 'complete';
  }

  // ===== Queries =====

  getCurrentPlayerId(): string | null {
    if (this.playerOrder.length === 0) return null;
    return this.playerOrder[this.currentPlayerIndex];
  }

  calculateScore(cards: Card[]): number {
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

    return total;
  }

  snapshot(): BlackjackSnapshot {
    return {
      phase: this.phase,
      players: this.players.map((p) => ({
        ...p,
        hands: p.hands,
      })),
      dealerCards: this.dealerRevealed ? this.dealerCards : [this.dealerCards[0]],
      dealerRevealed: this.dealerRevealed,
      deckRemaining: this.deck.length,
      currentPlayerId: this.getCurrentPlayerId(),
    };
  }
}
