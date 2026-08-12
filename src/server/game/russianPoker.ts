// ============================================================
// جرب حظك — Russian Poker Engine (بوكر روسي / "الروشان بوكر")
// Exact spec: docs/game-rules/russian-poker.md
// Signature rules: 2×-ante Bet, 1-ante flat exchange (1–5 cards),
// buy a 6th card, insurance (trips+), dealer qualifies on Ace-King,
// buy-the-dealer-a-card, and the SECOND COMBINATION (payout = sum).
// ============================================================

import { Card, createDeck, shuffleDeck, getRankValue, Rng } from './deck';
import { evaluate5Cards, HandRank } from './evaluator';

// ===== Hand categories (standard 5-card + ACE_KING) =====

export enum RussianCategory {
  HIGH_CARD = 0,
  ACE_KING = 1,
  ONE_PAIR = 2,
  TWO_PAIR = 3,
  THREE_OF_A_KIND = 4,
  STRAIGHT = 5,
  FLUSH = 6,
  FULL_HOUSE = 7,
  FOUR_OF_A_KIND = 8,
  STRAIGHT_FLUSH = 9,
  ROYAL_FLUSH = 10,
}

/** Bet paytable — universal across all 12 sources (spec §5.1). */
export const RUSSIAN_PAYTABLE: Record<RussianCategory, number> = {
  [RussianCategory.HIGH_CARD]: 0,
  [RussianCategory.ACE_KING]: 1,
  [RussianCategory.ONE_PAIR]: 1,
  [RussianCategory.TWO_PAIR]: 2,
  [RussianCategory.THREE_OF_A_KIND]: 3,
  [RussianCategory.STRAIGHT]: 4,
  [RussianCategory.FLUSH]: 5,
  [RussianCategory.FULL_HOUSE]: 7,
  [RussianCategory.FOUR_OF_A_KIND]: 20,
  [RussianCategory.STRAIGHT_FLUSH]: 50,
  [RussianCategory.ROYAL_FLUSH]: 100,
};

export interface RussianHand {
  category: RussianCategory;
  /** Descending rank vector (2..14), most significant first — full 5 ranks. */
  tiebreak: number[];
  /** The 5 cards actually played (best 5 of 5/6). */
  cards: Card[];
  /** The DEFINING cards (2 for a pair, 3 for trips, 4 for two pair/quads, 5 for straight+). */
  coreCards: Card[];
}

const categoryOf = (rank: HandRank): RussianCategory => {
  switch (rank) {
    case HandRank.ROYAL_FLUSH: return RussianCategory.ROYAL_FLUSH;
    case HandRank.STRAIGHT_FLUSH: return RussianCategory.STRAIGHT_FLUSH;
    case HandRank.FOUR_OF_KIND: return RussianCategory.FOUR_OF_A_KIND;
    case HandRank.FULL_HOUSE: return RussianCategory.FULL_HOUSE;
    case HandRank.FLUSH: return RussianCategory.FLUSH;
    case HandRank.STRAIGHT: return RussianCategory.STRAIGHT;
    case HandRank.THREE_OF_KIND: return RussianCategory.THREE_OF_A_KIND;
    case HandRank.TWO_PAIR: return RussianCategory.TWO_PAIR;
    case HandRank.ONE_PAIR: return RussianCategory.ONE_PAIR;
    default: return RussianCategory.HIGH_CARD; // refined below for AK
  }
};

const ck = (c: Card) => `${c.rank}-${c.suit}`;
const sameCard = (a: Card, b: Card) => ck(a) === ck(b);
const cardsContain = (set: Card[], card: Card) => set.some((c) => sameCard(c, card));
const subsetOf = (a: Card[], b: Card[]) => a.every((c) => cardsContain(b, c));

/**
 * Evaluate exactly 5 cards with the Russian Poker ACE_KING category.
 * Core cards = the defining cards of the combination (spec §3.5).
 */
export function evaluateRussian5(cards: Card[]): RussianHand {
  const ev = evaluate5Cards(cards);
  const values = cards.map((c) => getRankValue(c.rank)).sort((a, b) => b - a);
  let category = categoryOf(ev.rank);
  if (category === RussianCategory.HIGH_CARD && values[0] === 14 && values[1] === 13) {
    category = RussianCategory.ACE_KING;
  }

  // Tiebreak: the category's canonical comparison vector (evaluate5Cards is wheel-aware).
  // AK and high card compare all five ranks in descending order.
  const tiebreak = category === RussianCategory.ACE_KING || category === RussianCategory.HIGH_CARD
    ? [...values]
    : [...ev.tiebreakers];

  // Core cards
  const counts = new Map<number, Card[]>();
  for (const c of cards) {
    const v = getRankValue(c.rank);
    counts.set(v, [...(counts.get(v) ?? []), c]);
  }
  const groups = [...counts.entries()].sort((a, b) => b[0] - a[0]);
  let coreCards: Card[] = [];
  switch (category) {
    case RussianCategory.ROYAL_FLUSH:
    case RussianCategory.STRAIGHT_FLUSH:
    case RussianCategory.FLUSH:
    case RussianCategory.STRAIGHT:
    case RussianCategory.FULL_HOUSE:
      coreCards = [...cards];
      break;
    case RussianCategory.FOUR_OF_A_KIND:
      coreCards = groups.find(([, g]) => g.length === 4)![1];
      break;
    case RussianCategory.THREE_OF_A_KIND:
      coreCards = groups.find(([, g]) => g.length === 3)![1];
      break;
    case RussianCategory.TWO_PAIR:
      coreCards = groups.filter(([, g]) => g.length === 2).flatMap(([, g]) => g);
      break;
    case RussianCategory.ONE_PAIR:
      coreCards = groups.find(([, g]) => g.length === 2)![1];
      break;
    case RussianCategory.ACE_KING: {
      const ace = cards.find((c) => c.rank === 'A')!;
      const king = cards.find((c) => c.rank === 'K')!;
      coreCards = [ace, king];
      break;
    }
    default:
      coreCards = [];
  }

  return { category, tiebreak, cards: [...cards], coreCards };
}

/** Best 5 of 5 or 6 cards. */
export function bestRussian5(cards: Card[]): RussianHand {
  if (cards.length === 5) return evaluateRussian5(cards);
  const n = cards.length;
  let best: RussianHand | null = null;
  for (let a = 0; a < n - 4; a++)
    for (let b = a + 1; b < n - 3; b++)
      for (let c = b + 1; c < n - 2; c++)
        for (let d = c + 1; d < n - 1; d++)
          for (let e = d + 1; e < n; e++) {
            const h = evaluateRussian5([cards[a], cards[b], cards[c], cards[d], cards[e]]);
            if (!best || compareRussianHands(h, best) > 0) best = h;
          }
  return best!;
}

export function compareRussianHands(a: RussianHand, b: RussianHand): -1 | 0 | 1 {
  if (a.category !== b.category) return a.category > b.category ? 1 : -1;
  const len = Math.max(a.tiebreak.length, b.tiebreak.length);
  for (let i = 0; i < len; i++) {
    const av = a.tiebreak[i] ?? 0;
    const bv = b.tiebreak[i] ?? 0;
    if (av !== bv) return av > bv ? 1 : -1;
  }
  return 0;
}

/** Dealer qualification: Ace-King high or better (56.3184%). */
export function russianQualifies(h: RussianHand): boolean {
  return h.category >= RussianCategory.ACE_KING;
}

// ===== Second combination (the signature rule) =====

interface Combo {
  category: RussianCategory;
  core: Card[];
  multiple: number;
}

/**
 * Enumerate every paying combination present in the hand, then pick the pair
 * (or single) with the maximum total payout. Validity = mutual non-inclusion
 * of core card sets (spec §3.5). Payout = arithmetic sum of components.
 */
export function findBestCombinationPair(
  cards: Card[]
): { primary: RussianHand; secondaryCategory: RussianCategory | null; totalMultiple: number } {
  const primary = bestRussian5(cards);
  const combos: Combo[] = [];

  const push = (category: RussianCategory, core: Card[]) => {
    const multiple = RUSSIAN_PAYTABLE[category];
    if (multiple <= 0) return;
    // Deduplicate by category + sorted core keys
    const key = `${category}:${core.map(ck).sort().join(',')}`;
    if (!combos.some((c) => `${c.category}:${c.core.map(ck).sort().join(',')}` === key)) {
      combos.push({ category, core, multiple });
    }
  };

  const n = cards.length;
  // 5-card subsets → full evaluation (core per category)
  for (let a = 0; a < n - 4; a++)
    for (let b = a + 1; b < n - 3; b++)
      for (let c = b + 1; c < n - 2; c++)
        for (let d = c + 1; d < n - 1; d++)
          for (let e = d + 1; e < n; e++) {
            const h = evaluateRussian5([cards[a], cards[b], cards[c], cards[d], cards[e]]);
            push(h.category, h.coreCards);
          }

  // Smaller subsets: pairs, trips, quads, AK
  for (let a = 0; a < n; a++)
    for (let b = a + 1; b < n; b++) {
      const pair = [cards[a], cards[b]];
      if (cards[a].rank === cards[b].rank) push(RussianCategory.ONE_PAIR, pair);
      const ranks = pair.map((c) => c.rank).sort();
      if (ranks[0] === 'A' && ranks[1] === 'K') push(RussianCategory.ACE_KING, pair);
      for (let c = b + 1; c < n; c++) {
        const trip = [cards[a], cards[b], cards[c]];
        if (cards[a].rank === cards[b].rank && cards[b].rank === cards[c].rank) {
          push(RussianCategory.THREE_OF_A_KIND, trip);
        }
        for (let d = c + 1; d < n; d++) {
          const quad = [cards[a], cards[b], cards[c], cards[d]];
          if (quad.every((x) => x.rank === cards[a].rank)) {
            push(RussianCategory.FOUR_OF_A_KIND, quad);
          }
          // Two pair from four cards
          const rq = quad.map((x) => x.rank).sort();
          if (rq[0] === rq[1] && rq[2] === rq[3] && rq[1] !== rq[2]) {
            push(RussianCategory.TWO_PAIR, quad);
          }
        }
      }
    }

  let bestTotal = RUSSIAN_PAYTABLE[primary.category];
  let bestSecondaryCategory: RussianCategory | null = null;

  for (let i = 0; i < combos.length; i++) {
    for (let j = i + 1; j < combos.length; j++) {
      const a = combos[i];
      const b = combos[j];
      if (subsetOf(a.core, b.core) || subsetOf(b.core, a.core)) continue; // mutual non-inclusion
      const total = a.multiple + b.multiple;
      if (total > bestTotal) {
        bestTotal = total;
        bestSecondaryCategory = b.category;
      }
    }
  }

  return { primary, secondaryCategory: bestSecondaryCategory, totalMultiple: bestTotal };
}

// ===== Configuration =====

export interface RussianPokerConfig {
  mode: 'SIMPLE' | 'CLASSIC';
  betMultiple: 2;
  exchangeCostAntes: 1;
  buySixthCostAntes: 1;
  buyDealerCardCostAntes: 1;
  maxExchangeCards: 4 | 5;
  allowRepeatSingleExchange: boolean;
  anteOnWin: 'PAY' | 'PUSH';
  anteOnWinAfterPurchase: 'PAY' | 'PUSH';
  insuranceEnabled: boolean;
  onDealerQualifiesInsurance: 'LOSE' | 'RETURN_IF_DEALER_WINS_OR_TIES';
  buyDealerCardEnabled: boolean;
  dealerDiscard: 'LOWEST' | 'HIGHEST' | 'FIRST_DEALT';
  autoDetectSecondCombination: boolean;
}

export const RECOMMENDED_RUSSIAN_CONFIG: RussianPokerConfig = {
  mode: 'SIMPLE',
  betMultiple: 2,
  exchangeCostAntes: 1,
  buySixthCostAntes: 1,
  buyDealerCardCostAntes: 1,
  maxExchangeCards: 5,
  allowRepeatSingleExchange: false,
  anteOnWin: 'PAY',
  anteOnWinAfterPurchase: 'PAY',
  insuranceEnabled: true,
  onDealerQualifiesInsurance: 'LOSE',
  buyDealerCardEnabled: true,
  dealerDiscard: 'LOWEST',
  autoDetectSecondCombination: true,
};

// ===== Engine =====

export type RussianPhase =
  | 'BETTING'
  | 'DEALT'
  | 'EXCHANGE_SELECT'
  | 'POST_ACTION'
  | 'INSURANCE'
  | 'DEALER_REVEAL'
  | 'DEALER_NO_QUALIFY'
  | 'SETTLE'
  | 'COMPLETE';

export type RussianOutcome =
  | 'FOLDED'
  | 'DEALER_NO_QUALIFY'
  | 'PLAYER_WINS'
  | 'DEALER_WINS'
  | 'TIE';

export interface RussianSettlement {
  outcome: RussianOutcome;
  anteReturn: number; // stake + winnings (0 if lost)
  betReturn: number;
  insuranceReturn: number;
  exchangeFee: number;
  buySixthFee: number;
  buyDealerCardFee: number;
  secondCombinationMultiple: number;
  totalMultiple: number;
  lines: Array<{ labelKey: string; amount: number; multiple?: number }>;
  netChange: number;
}

export interface RussianSnapshot {
  phase: RussianPhase;
  handId: number;
  balance: number;
  wagers: { ante: number; bet: number; insurance: number; feesPaid: number };
  playerCards: Card[];
  dealerCards: Card[] | null; // hidden until DEALER_REVEAL
  dealerUpCard: Card | null;
  folded: boolean;
  hasExchanged: boolean;
  hasBoughtSixth: boolean;
  hasInsured: boolean;
  playerHand: RussianHand | null;
  dealerHand: RussianHand | null;
  dealerQualified: boolean | null;
  combinationPair: { totalMultiple: number; secondaryCategory: RussianCategory | null } | null;
  outcome: RussianOutcome | null;
  settlement: RussianSettlement | null;
}

export class RussianPokerEngine {
  private config: RussianPokerConfig;
  private rng: Rng;
  private deck: Card[] = [];
  private balance: number;
  private handId = 0;
  private phase: RussianPhase = 'BETTING';
  private ante = 0;
  private bet = 0;
  private insurance = 0;
  private feesPaid = 0;
  private playerCards: Card[] = [];
  private dealerCards: Card[] = [];
  private folded = false;
  private hasExchanged = false;
  private hasBoughtSixth = false;
  private hasInsured = false;
  private outcome: RussianOutcome | null = null;
  private settlement: RussianSettlement | null = null;

  constructor(
    balance: number,
    config: RussianPokerConfig = RECOMMENDED_RUSSIAN_CONFIG,
    rng?: Rng
  ) {
    this.balance = balance;
    this.config = config;
    this.rng = rng ?? Math.random;
  }

  // ===== Betting =====

  placeAnte(amount: number): string | null {
    if (this.phase !== 'BETTING') return 'انتهى وقت الرهان';
    if (amount <= 0) return 'مبلغ غير صالح';
    // Max ante = floor(balance / 4) so Ante + Bet + one purchase always fit (spec #1).
    const maxAnte = Math.floor(this.balance / 4);
    if (amount > maxAnte) return `الحد الأقصى للرهان ${maxAnte}`;
    this.ante = amount;
    this.balance -= amount;
    return null;
  }

  /** Deal 5 cards to the player and 5 to the dealer (one up). */
  deal(shoeOverride?: Card[]): RussianSnapshot {
    this.phase = 'DEALT';
    this.deck = shoeOverride ? shoeOverride.map((c) => ({ ...c })) : shuffleDeck(createDeck(), this.rng);
    this.handId++;
    this.playerCards = this.deck.splice(0, 5);
    this.dealerCards = this.deck.splice(0, 5);
    this.folded = false;
    this.hasExchanged = false;
    this.hasBoughtSixth = false;
    this.hasInsured = false;
    this.bet = 0;
    this.insurance = 0;
    this.feesPaid = 0;
    this.outcome = null;
    this.settlement = null;
    return this.snapshot();
  }

  // ===== Player decisions =====

  /** Bet = exactly 2 × ante. */
  bet2x(): string | null {
    if (this.phase !== 'DEALT' && this.phase !== 'POST_ACTION') return 'ليس وقت الرهان';
    const amount = this.ante * this.config.betMultiple;
    if (amount > this.balance) return 'رصيد غير كاف';
    this.balance -= amount;
    this.bet = amount;
    this.afterPurchaseDecision();
    return null;
  }

  fold(): string | null {
    if (this.phase !== 'DEALT' && this.phase !== 'POST_ACTION') return 'ليس وقت الانسحاب';
    this.folded = true;
    this.settle();
    return null;
  }

  /** Exchange any number of cards (1..maxExchangeCards) for 1 ante flat. */
  exchange(cardIds: string[]): string | null {
    if (this.hasBoughtSixth) return 'لا يمكن الجمع بين التبديل والورقة السادسة';
    if (this.phase !== 'DEALT' && this.phase !== 'EXCHANGE_SELECT') return 'ليس وقت التبديل';
    if (cardIds.length < 1 || cardIds.length > this.config.maxExchangeCards) {
      return `بدّل من ١ إلى ${this.config.maxExchangeCards} أوراق`;
    }
    const cost = this.ante * this.config.exchangeCostAntes;
    if (cost > this.balance) return 'رصيد غير كاف للتبديل';
    const toReplace = cardIds.map((id) => this.playerCards.findIndex((c) => ck(c) === id)).filter((i) => i >= 0);
    if (toReplace.length !== cardIds.length) return 'ورقة غير موجودة';

    this.balance -= cost;
    this.feesPaid += cost;
    for (const idx of toReplace) {
      this.playerCards[idx] = this.deck.shift()!;
    }
    this.hasExchanged = true;
    this.phase = 'POST_ACTION';
    return null;
  }

  /** Buy a 6th card for 1 ante. Mutually exclusive with exchange. */
  buySixthCard(): string | null {
    if (this.phase !== 'DEALT') return 'ليس وقت الشراء';
    if (this.hasExchanged) return 'لا يمكن الجمع بين التبديل والورقة السادسة';
    const cost = this.ante * this.config.buySixthCostAntes;
    if (cost > this.balance) return 'رصيد غير كاف';
    this.balance -= cost;
    this.feesPaid += cost;
    this.playerCards.push(this.deck.shift()!);
    this.hasBoughtSixth = true;
    this.phase = 'POST_ACTION';
    return null;
  }

  private afterPurchaseDecision(): void {
    // Insurance offer iff final hand is trips or better.
    const hand = bestRussian5(this.playerCards);
    if (this.config.insuranceEnabled && this.config.mode !== 'SIMPLE' && hand.category >= RussianCategory.THREE_OF_A_KIND) {
      this.phase = 'INSURANCE';
    } else {
      this.revealDealer();
    }
  }

  takeInsurance(amount: number): string | null {
    if (this.phase !== 'INSURANCE') return 'التأمين غير متاح';
    const hand = bestRussian5(this.playerCards);
    const potentialBetPayout = this.bet * RUSSIAN_PAYTABLE[hand.category];
    const maxInsurance = Math.floor(potentialBetPayout / 2);
    if (amount < this.ante) return `الحد الأدنى للتأمين ${this.ante}`;
    if (amount > maxInsurance) return `الحد الأقصى للتأمين ${maxInsurance}`;
    if (amount > this.balance) return 'رصيد غير كاف';
    this.balance -= amount;
    this.insurance = amount;
    this.hasInsured = true;
    this.revealDealer();
    return null;
  }

  declineInsurance(): string | null {
    if (this.phase !== 'INSURANCE') return 'التأمين غير متاح';
    this.revealDealer();
    return null;
  }

  private revealDealer(): void {
    this.phase = 'DEALER_REVEAL';
    const dealerHand = bestRussian5(this.dealerCards);
    if (!russianQualifies(dealerHand)) {
      this.phase = 'DEALER_NO_QUALIFY';
      if (!this.hasInsured && this.config.buyDealerCardEnabled && this.config.mode !== 'SIMPLE') {
        return; // offer: buy the dealer a card, or take the ante
      }
      this.settle();
      return;
    }
    this.settle();
  }

  /** Buy the dealer a card (1 ante). Only when the dealer did NOT qualify and box uninsured. */
  buyDealerCard(): string | null {
    if (this.phase !== 'DEALER_NO_QUALIFY') return 'غير متاح';
    if (this.hasInsured) return 'لا يمكن مع التأمين';
    const cost = this.ante * this.config.buyDealerCardCostAntes;
    if (cost > this.balance) return 'رصيد غير كاف';
    this.balance -= cost;
    this.feesPaid += cost;
    // Dealer discards the LOWEST card and draws one replacement.
    let discardIdx = 0;
    if (this.config.dealerDiscard === 'LOWEST') {
      discardIdx = this.dealerCards
        .map((c, i) => ({ v: getRankValue(c.rank), i }))
        .sort((a, b) => a.v - b.v)[0].i;
    } else if (this.config.dealerDiscard === 'HIGHEST') {
      discardIdx = this.dealerCards
        .map((c, i) => ({ v: getRankValue(c.rank), i }))
        .sort((a, b) => b.v - a.v)[0].i;
    }
    this.dealerCards[discardIdx] = this.deck.shift()!;
    this.settle();
    return null;
  }

  /** Decline to buy the dealer a card → take the non-qualify payout. */
  takeAnte(): string | null {
    if (this.phase !== 'DEALER_NO_QUALIFY') return 'غير متاح';
    this.settle();
    return null;
  }

  // ===== Settlement =====

  private settle(): void {
    const playerHand = bestRussian5(this.playerCards);
    const dealerHand = bestRussian5(this.dealerCards);
    const dealerQualified = russianQualifies(dealerHand);
    const purchased = this.hasExchanged || this.hasBoughtSixth;
    const pair = this.config.autoDetectSecondCombination
      ? findBestCombinationPair(this.playerCards)
      : { primary: playerHand, secondaryCategory: null as RussianCategory | null, totalMultiple: RUSSIAN_PAYTABLE[playerHand.category] };

    let anteReturn = 0;
    let betReturn = 0;
    let insuranceReturn = 0;
    let secondCombinationMultiple = 0;
    let totalMultiple = 0;

    if (this.folded) {
      this.outcome = 'FOLDED';
    } else if (!dealerQualified) {
      this.outcome = 'DEALER_NO_QUALIFY';
      anteReturn = this.ante * 2; // pays 1:1 (stake + winnings)
      betReturn = this.bet; // push
      if (this.hasInsured) insuranceReturn = this.insurance * 2; // 1:1 + stake
    } else {
      const cmp = compareRussianHands(playerHand, dealerHand);
      if (cmp > 0) {
        this.outcome = 'PLAYER_WINS';
        // Variant A (recommended): Ante pays 1:1. Sub-variant: merely returned after purchase.
        const antePays = this.config.anteOnWin === 'PAY' && !(purchased && this.config.anteOnWinAfterPurchase === 'PUSH');
        anteReturn = antePays ? this.ante * 2 : this.ante;
        totalMultiple = pair.totalMultiple;
        secondCombinationMultiple = pair.totalMultiple - RUSSIAN_PAYTABLE[playerHand.category];
        betReturn = this.bet * pair.totalMultiple + this.bet; // paytable multiple + stake
      } else if (cmp < 0) {
        this.outcome = 'DEALER_WINS';
      } else {
        this.outcome = 'TIE';
        anteReturn = this.ante;
        betReturn = this.bet;
      }
      if (this.hasInsured) {
        const config = this.config.onDealerQualifiesInsurance;
        if (config === 'RETURN_IF_DEALER_WINS_OR_TIES' && (this.outcome === 'DEALER_WINS' || this.outcome === 'TIE')) {
          insuranceReturn = this.insurance;
        }
        // default 'LOSE': nothing
      }
    }

    this.balance += anteReturn + betReturn + insuranceReturn;
    const netChange = anteReturn + betReturn + insuranceReturn;

    const lines: Array<{ labelKey: string; amount: number; multiple?: number }> = [];
    if (this.outcome === 'FOLDED') lines.push({ labelKey: 'ante_lost', amount: -this.ante });
    if (anteReturn > 0) lines.push({ labelKey: 'ante', amount: anteReturn - this.ante, multiple: 1 });
    if (betReturn > 0 && this.outcome === 'PLAYER_WINS') lines.push({ labelKey: 'bet', amount: betReturn - this.bet, multiple: pair.totalMultiple });
    if (secondCombinationMultiple > 0) lines.push({ labelKey: 'second_combo', amount: this.bet * secondCombinationMultiple, multiple: secondCombinationMultiple });
    if (insuranceReturn > 0) lines.push({ labelKey: 'insurance', amount: insuranceReturn - this.insurance, multiple: 1 });
    if (this.feesPaid > 0) lines.push({ labelKey: 'fees', amount: -this.feesPaid });

    this.settlement = {
      outcome: this.outcome,
      anteReturn,
      betReturn,
      insuranceReturn,
      exchangeFee: this.hasExchanged ? this.ante * this.config.exchangeCostAntes : 0,
      buySixthFee: this.hasBoughtSixth ? this.ante * this.config.buySixthCostAntes : 0,
      buyDealerCardFee: 0,
      secondCombinationMultiple,
      totalMultiple,
      lines,
      netChange,
    };
    this.phase = 'SETTLE';
  }

  newRound(): void {
    this.phase = 'BETTING';
    this.ante = 0;
    this.bet = 0;
    this.insurance = 0;
    this.feesPaid = 0;
    this.playerCards = [];
    this.dealerCards = [];
    this.folded = false;
    this.hasExchanged = false;
    this.hasBoughtSixth = false;
    this.hasInsured = false;
    this.outcome = null;
    this.settlement = null;
  }

  snapshot(): RussianSnapshot {
    const playerHand = this.playerCards.length >= 5 ? bestRussian5(this.playerCards) : null;
    const revealed = this.phase === 'DEALER_REVEAL' || this.phase === 'DEALER_NO_QUALIFY' || this.phase === 'SETTLE' || this.phase === 'COMPLETE';
    const dealerHand = revealed && this.dealerCards.length >= 5 ? bestRussian5(this.dealerCards) : null;
    const pair = this.playerCards.length >= 5 && this.config.autoDetectSecondCombination
      ? findBestCombinationPair(this.playerCards)
      : null;
    return {
      phase: this.phase,
      handId: this.handId,
      balance: this.balance,
      wagers: { ante: this.ante, bet: this.bet, insurance: this.insurance, feesPaid: this.feesPaid },
      playerCards: [...this.playerCards],
      dealerCards: revealed ? [...this.dealerCards] : null,
      dealerUpCard: this.dealerCards[0] ?? null,
      folded: this.folded,
      hasExchanged: this.hasExchanged,
      hasBoughtSixth: this.hasBoughtSixth,
      hasInsured: this.hasInsured,
      playerHand,
      dealerHand,
      dealerQualified: revealed && dealerHand ? russianQualifies(dealerHand) : null,
      combinationPair: pair ? { totalMultiple: pair.totalMultiple, secondaryCategory: pair.secondaryCategory } : null,
      outcome: this.outcome,
      settlement: this.settlement,
    };
  }
}
