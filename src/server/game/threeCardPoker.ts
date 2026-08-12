// ============================================================
// جرب حظك — Three Card Poker Engine
// Exact spec: docs/game-rules/three-card-poker.md
// Rankings: SF > 3K > STRAIGHT > FLUSH > PAIR > HIGH_CARD (3-card order).
// Strategy: Q-6-4 proven optimal (14,900 play / 7,200 fold of 22,100).
// ============================================================

import { Card, createDeck, shuffleDeck, getRankValue, Rng } from './deck';
import { evaluate5Cards, HandRank } from './evaluator';

// ===== Hand evaluation (3-card) =====

export enum ThreeCardCategory {
  HIGH_CARD = 0,
  PAIR = 1,
  FLUSH = 2,
  STRAIGHT = 3,
  THREE_OF_A_KIND = 4,
  STRAIGHT_FLUSH = 5,
}

export interface EvaluatedThreeCardHand {
  category: ThreeCardCategory;
  /** Lexicographic tiebreak keys, most significant first (ranks 2..14). */
  keys: number[];
  /** True iff suited A-K-Q (subset of straight flush). */
  isMiniRoyal: boolean;
  /** category >= PAIR, or (HIGH_CARD and keys[0] >= 12). */
  qualifies: boolean;
  /** Packed monotonic score. */
  score: number;
}

const QUEEN = 12;

/**
 * Evaluate exactly 3 cards with 3-card-poker rankings.
 * A-2-3 is a straight scored 3-high; K-A-2 is NOT a straight.
 */
export function evaluateThreeCards(cards: Card[]): EvaluatedThreeCardHand {
  const r = cards.map((c) => getRankValue(c.rank)).sort((a, b) => b - a);
  const [a, b, c] = r;
  const isFlush = cards[0].suit === cards[1].suit && cards[1].suit === cards[2].suit;

  let isStraight = false;
  let straightHigh = a;
  if (a === 14 && b === 3 && c === 2) {
    isStraight = true;
    straightHigh = 3;
  } else if (a - 1 === b && b - 1 === c) {
    isStraight = true;
    straightHigh = a;
  }

  let category: ThreeCardCategory;
  let keys: number[];
  if (isStraight && isFlush) {
    category = ThreeCardCategory.STRAIGHT_FLUSH;
    keys = [straightHigh];
  } else if (a === b && b === c) {
    category = ThreeCardCategory.THREE_OF_A_KIND;
    keys = [a];
  } else if (isStraight) {
    category = ThreeCardCategory.STRAIGHT;
    keys = [straightHigh];
  } else if (isFlush) {
    category = ThreeCardCategory.FLUSH;
    keys = [a, b, c];
  } else if (a === b) {
    category = ThreeCardCategory.PAIR;
    keys = [a, c]; // pair rank FIRST, then kicker (the classic bug)
  } else if (b === c) {
    category = ThreeCardCategory.PAIR;
    keys = [b, a];
  } else {
    category = ThreeCardCategory.HIGH_CARD;
    keys = [a, b, c];
  }

  const isMiniRoyal = category === ThreeCardCategory.STRAIGHT_FLUSH && straightHigh === 14;
  const qualifies = category > ThreeCardCategory.HIGH_CARD || keys[0] >= QUEEN;

  const k = [keys[0] ?? 0, keys[1] ?? 0, keys[2] ?? 0];
  const score = category * 3375 + k[0] * 225 + k[1] * 15 + k[2];

  return { category, keys, isMiniRoyal, qualifies, score };
}

/** -1 if a < b, 0 if exactly equal, +1 if a > b. Suits never break ties. */
export function compareThreeCards(a: EvaluatedThreeCardHand, b: EvaluatedThreeCardHand): -1 | 0 | 1 {
  if (a.category !== b.category) return a.category > b.category ? 1 : -1;
  const len = Math.max(a.keys.length, b.keys.length);
  for (let i = 0; i < len; i++) {
    const av = a.keys[i] ?? 0;
    const bv = b.keys[i] ?? 0;
    if (av !== bv) return av > bv ? 1 : -1;
  }
  return 0;
}

/** Optimal strategy: Q-6-4 or better. Verified EV-optimal on all 22,100 hands. */
export function shouldPlayThree(h: EvaluatedThreeCardHand): boolean {
  if (h.category > ThreeCardCategory.HIGH_CARD) return true; // any made hand plays
  const [k0, k1, k2] = h.keys;
  if (k0 !== QUEEN) return k0 > QUEEN; // A/K high → play; J or less → fold
  if (k1 !== 6) return k1 > 6; // Q-7-x+ → play; Q-5-x- → fold
  return k2 >= 4; // Q-6-4 plays; Q-6-3 folds
}

// ===== 6 Card Bonus =====

export type SixCardCategory =
  | 'THREE_OF_A_KIND' | 'STRAIGHT' | 'FLUSH' | 'FULL_HOUSE'
  | 'FOUR_OF_A_KIND' | 'STRAIGHT_FLUSH' | 'ROYAL_FLUSH';

/**
 * Best 5-card hand from 6 with STANDARD 5-card rankings.
 * Two pair or worse LOSES (spec §6.3).
 */
export function evaluateSixCardBonus(cards: Card[]): SixCardCategory | null {
  const n = cards.length;
  let best: { rank: HandRank } | null = null;
  for (let a = 0; a < n - 4; a++)
    for (let b = a + 1; b < n - 3; b++)
      for (let c = b + 1; c < n - 2; c++)
        for (let d = c + 1; d < n - 1; d++)
          for (let e = d + 1; e < n; e++) {
            const ev = evaluate5Cards([cards[a], cards[b], cards[c], cards[d], cards[e]]);
            if (!best || ev.rank > best.rank) best = ev;
          }
  switch (best!.rank) {
    case HandRank.ROYAL_FLUSH: return 'ROYAL_FLUSH';
    case HandRank.STRAIGHT_FLUSH: return 'STRAIGHT_FLUSH';
    case HandRank.FOUR_OF_KIND: return 'FOUR_OF_A_KIND';
    case HandRank.FULL_HOUSE: return 'FULL_HOUSE';
    case HandRank.FLUSH: return 'FLUSH';
    case HandRank.STRAIGHT: return 'STRAIGHT';
    case HandRank.THREE_OF_KIND: return 'THREE_OF_A_KIND';
    default: return null; // two pair or worse LOSES
  }
}

// ===== Paytables and configuration =====

export interface AnteBonusPaytable {
  straight: number; // 1
  threeOfAKind: number; // 4
  straightFlush: number; // 5
}

export interface PairPlusPaytable {
  pair: number; // 1
  flush: number; // 4
  straight: number; // 6
  threeOfAKind: number; // 30
  straightFlush: number; // 40
  miniRoyal?: number;
}

export interface SixCardBonusPaytable {
  threeOfAKind: number; // 7
  straight: number; // 10
  flush: number; // 15
  fullHouse: number; // 20
  fourOfAKind: number; // 100
  straightFlush: number; // 200
  royalFlush: number; // 1000
}

export interface ThreeCardConfig {
  anteBonus: AnteBonusPaytable;
  pairPlus: PairPlusPaytable;
  sixCardBonus: SixCardBonusPaytable;
  minBet: number;
  maxBet: number;
  tiesGoToPlayer: boolean;
  allowPairPlusWithoutAnte: boolean;
  sixCardBonusRequiresAnte: boolean;
  payAnteBonusOnFold: boolean;
}

export const RECOMMENDED_THREE_CARD_CONFIG: ThreeCardConfig = {
  anteBonus: { straight: 1, threeOfAKind: 4, straightFlush: 5 }, // HE 3.3730%
  pairPlus: { pair: 1, flush: 4, straight: 6, threeOfAKind: 30, straightFlush: 40 }, // HE 2.3167%
  sixCardBonus: { threeOfAKind: 7, straight: 10, flush: 15, fullHouse: 20, fourOfAKind: 100, straightFlush: 200, royalFlush: 1000 }, // HE 8.5614%
  minBet: 10,
  maxBet: 2500,
  tiesGoToPlayer: false,
  allowPairPlusWithoutAnte: true,
  sixCardBonusRequiresAnte: true,
  payAnteBonusOnFold: false,
};

// ===== Resolution (pure) =====

export type BaseGameOutcome = 'FOLDED' | 'DEALER_NOT_QUALIFIED' | 'PLAYER_WINS' | 'DEALER_WINS' | 'PUSH';

export interface Wagers {
  ante: number;
  play: number;
  pairPlus: number;
  sixCardBonus: number;
}

export interface RoundResult {
  outcome: BaseGameOutcome;
  dealerQualified: boolean;
  anteNet: number;
  playNet: number;
  anteBonusNet: number;
  pairPlusNet: number;
  sixCardBonusNet: number;
  totalNet: number;
  returnedStakes: number;
  anteBonusHand: 'STRAIGHT' | 'THREE_OF_A_KIND' | 'STRAIGHT_FLUSH' | null;
  pairPlusHand: ThreeCardCategory | 'MINI_ROYAL' | null;
  sixCardHand: SixCardCategory | null;
}

export function resolveThreeCardRound(
  playerCards: Card[],
  dealerCards: Card[],
  wagers: Wagers,
  folded: boolean,
  config: ThreeCardConfig
): RoundResult {
  const playerHand = evaluateThreeCards(playerCards);
  const dealerHand = evaluateThreeCards(dealerCards);
  const dealerQualified = dealerHand.qualifies;

  // Money model: stakes are deducted when placed (by the engine). Here we compute
  // WINNINGS only (never negative) plus returnedStakes. Losses are implicit (no return).
  let outcome: BaseGameOutcome;
  let anteNet = 0;
  let playNet = 0;
  let returnedStakes = 0;

  if (folded) {
    outcome = 'FOLDED';
  } else if (!dealerQualified) {
    outcome = 'DEALER_NOT_QUALIFIED';
    anteNet = wagers.ante; // Ante pays 1:1
    returnedStakes += wagers.ante + wagers.play; // both stakes returned
  } else {
    const cmp = compareThreeCards(playerHand, dealerHand);
    if (cmp > 0) {
      outcome = 'PLAYER_WINS';
      anteNet = wagers.ante;
      playNet = wagers.play;
      returnedStakes += wagers.ante + wagers.play;
    } else if (cmp < 0) {
      outcome = 'DEALER_WINS';
      returnedStakes += 0;
    } else {
      outcome = config.tiesGoToPlayer ? 'PLAYER_WINS' : 'PUSH';
      if (config.tiesGoToPlayer) {
        anteNet = wagers.ante;
        playNet = wagers.play;
        returnedStakes += wagers.ante + wagers.play;
      } else {
        returnedStakes += wagers.ante + wagers.play;
      }
    }
  }

  // Ante Bonus: paid on straight or better, requires the Play wager (unless config).
  let anteBonusNet = 0;
  let anteBonusHand: RoundResult['anteBonusHand'] = null;
  const playerMadePlay = !folded && wagers.play > 0;
  const bonusEligible = playerMadePlay || config.payAnteBonusOnFold;
  if (bonusEligible) {
    switch (playerHand.category) {
      case ThreeCardCategory.STRAIGHT:
        anteBonusNet = config.anteBonus.straight * wagers.ante;
        anteBonusHand = 'STRAIGHT';
        break;
      case ThreeCardCategory.THREE_OF_A_KIND:
        anteBonusNet = config.anteBonus.threeOfAKind * wagers.ante;
        anteBonusHand = 'THREE_OF_A_KIND';
        break;
      case ThreeCardCategory.STRAIGHT_FLUSH:
        anteBonusNet = config.anteBonus.straightFlush * wagers.ante;
        anteBonusHand = 'STRAIGHT_FLUSH';
        break;
    }
  }

  // Pair Plus: player's hand only; always resolves, even on a fold.
  let pairPlusNet = 0;
  let pairPlusHand: RoundResult['pairPlusHand'] = null;
  if (wagers.pairPlus > 0) {
    const pp = config.pairPlus;
    let multiple = 0;
    switch (playerHand.category) {
      case ThreeCardCategory.PAIR: multiple = pp.pair; pairPlusHand = ThreeCardCategory.PAIR; break;
      case ThreeCardCategory.FLUSH: multiple = pp.flush; pairPlusHand = ThreeCardCategory.FLUSH; break;
      case ThreeCardCategory.STRAIGHT: multiple = pp.straight; pairPlusHand = ThreeCardCategory.STRAIGHT; break;
      case ThreeCardCategory.THREE_OF_A_KIND: multiple = pp.threeOfAKind; pairPlusHand = ThreeCardCategory.THREE_OF_A_KIND; break;
      case ThreeCardCategory.STRAIGHT_FLUSH:
        if (playerHand.isMiniRoyal && pp.miniRoyal !== undefined) {
          multiple = pp.miniRoyal;
          pairPlusHand = 'MINI_ROYAL';
        } else {
          multiple = pp.straightFlush;
          pairPlusHand = ThreeCardCategory.STRAIGHT_FLUSH;
        }
        break;
    }
    if (multiple > 0) {
      pairPlusNet = multiple * wagers.pairPlus;
      returnedStakes += wagers.pairPlus; // winning side bet returns its stake
    }
  }

  // 6 Card Bonus: best 5 of player's 3 + dealer's 3; resolves even on a fold.
  let sixCardBonusNet = 0;
  let sixCardHand: RoundResult['sixCardHand'] = null;
  if (wagers.sixCardBonus > 0) {
    const cat = evaluateSixCardBonus([...playerCards, ...dealerCards]);
    sixCardHand = cat;
    if (cat) {
      const scb = config.sixCardBonus;
      const multiple = {
        THREE_OF_A_KIND: scb.threeOfAKind,
        STRAIGHT: scb.straight,
        FLUSH: scb.flush,
        FULL_HOUSE: scb.fullHouse,
        FOUR_OF_A_KIND: scb.fourOfAKind,
        STRAIGHT_FLUSH: scb.straightFlush,
        ROYAL_FLUSH: scb.royalFlush,
      }[cat];
      sixCardBonusNet = multiple * wagers.sixCardBonus;
      returnedStakes += wagers.sixCardBonus;
    }
  }

  const totalNet = anteNet + playNet + anteBonusNet + pairPlusNet + sixCardBonusNet;

  return {
    outcome,
    dealerQualified,
    anteNet,
    playNet,
    anteBonusNet,
    pairPlusNet,
    sixCardBonusNet,
    totalNet,
    returnedStakes,
    anteBonusHand,
    pairPlusHand,
    sixCardHand,
  };
}

// ===== Engine (stateful) =====

export type ThreeCardPhase = 'BETTING' | 'DEALING' | 'DECISION' | 'REVEALING' | 'SETTLED';

export interface ThreeCardSnapshot {
  phase: ThreeCardPhase;
  roundId: number;
  balance: number;
  wagers: Wagers;
  reservedForPlay: number;
  playerCards: Card[] | null;
  dealerCards: Card[] | null;
  playerHand: EvaluatedThreeCardHand | null;
  dealerHand: EvaluatedThreeCardHand | null;
  dealerQualified: boolean | null;
  folded: boolean;
  result: RoundResult | null;
}

export class ThreeCardPokerEngine {
  private config: ThreeCardConfig;
  private rng: Rng;
  private balance: number;
  private wagers: Wagers = { ante: 0, play: 0, pairPlus: 0, sixCardBonus: 0 };
  private reservedForPlay = 0;
  private playerCards: Card[] | null = null;
  private dealerCards: Card[] | null = null;
  private phase: ThreeCardPhase = 'BETTING';
  private folded = false;
  private result: RoundResult | null = null;
  private roundId = 0;

  constructor(balance: number, config: ThreeCardConfig = RECOMMENDED_THREE_CARD_CONFIG, rng?: Rng) {
    this.balance = balance;
    this.config = config;
    this.rng = rng ?? Math.random;
  }

  /** Place wagers. Reserves an equal amount for the Play bet (spec edge case #6). */
  placeWagers(w: Partial<Wagers>): string | null {
    if (this.phase !== 'BETTING') return 'انتهى وقت الرهان';
    const ante = w.ante ?? 0;
    const pairPlus = w.pairPlus ?? 0;
    const sixCardBonus = w.sixCardBonus ?? 0;

    if (ante === 0 && pairPlus === 0 && sixCardBonus === 0) return 'ضع رهانًا';
    if (ante > 0) {
      if (ante < this.config.minBet) return `الحد الأدنى ${this.config.minBet}`;
      if (ante > this.config.maxBet) return `الحد الأقصى ${this.config.maxBet}`;
    }
    if (ante === 0 && sixCardBonus > 0) return 'بونص ٦ أوراق يتطلب رهانًا أساسيًا';
    if (!this.config.allowPairPlusWithoutAnte && ante === 0 && pairPlus > 0) return 'الزوج الإضافي يتطلب رهانًا أساسيًا';

    const total = ante + pairPlus + sixCardBonus + ante; // ante is reserved for Play
    if (total > this.balance) return 'رصيد غير كاف';

    this.balance -= ante + pairPlus + sixCardBonus;
    this.wagers = { ante, play: 0, pairPlus, sixCardBonus };
    this.reservedForPlay = ante;
    return null;
  }

  /** Deal 3 cards to the player and 3 to the dealer (face down). */
  deal(shoeOverride?: Card[]): ThreeCardSnapshot {
    this.phase = 'DEALING';
    let deck = shoeOverride ? shoeOverride.map((c) => ({ ...c })) : shuffleDeck(createDeck(), this.rng);
    this.playerCards = [deck[0], deck[1], deck[2]];
    this.dealerCards = [deck[3], deck[4], deck[5]];
    this.folded = false;
    this.result = null;
    this.roundId++;
    if (this.wagers.ante > 0) {
      this.phase = 'DECISION';
    } else {
      // No ante (Pair Plus only): settle immediately.
      this.settle();
    }
    return this.snapshot();
  }

  /** Make the Play wager (=== ante) or fold. */
  play(): string | null {
    if (this.phase !== 'DECISION') return 'ليس وقت القرار';
    this.balance -= this.reservedForPlay;
    this.wagers.play = this.reservedForPlay;
    this.reservedForPlay = 0;
    this.settle();
    return null;
  }

  fold(): string | null {
    if (this.phase !== 'DECISION') return 'ليس وقت القرار';
    this.folded = true;
    // The Play reserve was never deducted — it is simply released. The ante stays lost.
    this.reservedForPlay = 0;
    this.settle();
    return null;
  }

  private settle(): void {
    this.phase = 'REVEALING';
    const result = resolveThreeCardRound(
      this.playerCards!,
      this.dealerCards!,
      this.wagers,
      this.folded,
      this.config
    );
    this.balance += result.totalNet + result.returnedStakes;
    this.result = result;
    this.phase = 'SETTLED';
  }

  /** Begin the next betting round. */
  newRound(): void {
    this.wagers = { ante: 0, play: 0, pairPlus: 0, sixCardBonus: 0 };
    this.reservedForPlay = 0;
    this.playerCards = null;
    this.dealerCards = null;
    this.folded = false;
    this.result = null;
    this.phase = 'BETTING';
  }

  snapshot(): ThreeCardSnapshot {
    const playerHand = this.playerCards ? evaluateThreeCards(this.playerCards) : null;
    const dealerHand = this.dealerCards ? evaluateThreeCards(this.dealerCards) : null;
    return {
      phase: this.phase,
      roundId: this.roundId,
      balance: this.balance,
      wagers: { ...this.wagers },
      reservedForPlay: this.reservedForPlay,
      playerCards: this.playerCards ? [...this.playerCards] : null,
      // Dealer cards must not reach the client before REVEALING.
      dealerCards: this.phase === 'REVEALING' || this.phase === 'SETTLED' ? (this.dealerCards ? [...this.dealerCards] : null) : null,
      playerHand,
      dealerHand: this.phase === 'REVEALING' || this.phase === 'SETTLED' ? dealerHand : null,
      dealerQualified: this.phase === 'SETTLED' ? this.result?.dealerQualified ?? null : null,
      folded: this.folded,
      result: this.result,
    };
  }
}
