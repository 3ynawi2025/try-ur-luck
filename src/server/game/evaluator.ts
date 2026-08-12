// ============================================================
// جرب حظك — Hand Evaluator (Texas Hold'em)
// Best-5-of-7 with a total-order comparator and exact equality.
// Wheel (A-2-3-4-5) is normalised to a 5-high straight.
// ============================================================

import { Card, getRankValue } from './deck';

export enum HandRank {
  HIGH_CARD = 0,
  ONE_PAIR = 1,
  TWO_PAIR = 2,
  THREE_OF_KIND = 3,
  STRAIGHT = 4,
  FLUSH = 5,
  FULL_HOUSE = 6,
  FOUR_OF_KIND = 7,
  STRAIGHT_FLUSH = 8,
  ROYAL_FLUSH = 9,
}

export interface BestCard {
  card: Card;
  fromHole: boolean;
}

export interface HandResult {
  rank: HandRank;
  name: string;
  /** Packed numeric score: rank * 10^10 + tiebreakers. Monotonic but use compareHands for correctness. */
  score: number;
  /** The 5 cards that form the best hand, in display order. */
  bestCards: Card[];
  /** bestCards with hole/board provenance (for bad-beat / high-hand checks). */
  bestCardsDetailed: BestCard[];
  /** Tie-breaker vector, most significant first (ranks as numbers 2..14). */
  tiebreakers: number[];
  /** True when the best five cards are exactly the board (zero hole cards). */
  playingBoard: boolean;
  /** Number of hole cards used in the best five. */
  holeCardsUsed: number;
}

const HAND_NAMES: Record<HandRank, string> = {
  [HandRank.HIGH_CARD]: 'ورقة عالية',
  [HandRank.ONE_PAIR]: 'زوج واحد',
  [HandRank.TWO_PAIR]: 'زوجان',
  [HandRank.THREE_OF_KIND]: 'ثلاثية',
  [HandRank.STRAIGHT]: 'ستريت',
  [HandRank.FLUSH]: 'فلاش',
  [HandRank.FULL_HOUSE]: 'فل هاوس',
  [HandRank.FOUR_OF_KIND]: 'أربع متشابهات',
  [HandRank.STRAIGHT_FLUSH]: 'ستريت فلاش',
  [HandRank.ROYAL_FLUSH]: 'رويال فلاش',
};

interface FiveCardEval {
  rank: HandRank;
  tiebreakers: number[];
}

/**
 * Evaluate exactly 5 cards. Wheel-aware:
 * - A-2-3-4-5 → STRAIGHT with tiebreakers [5] (5-high).
 * - ROYAL_FLUSH only when the straight's high card is the ACE.
 */
export function evaluate5Cards(cards: Card[]): FiveCardEval {
  const values = cards.map((c) => getRankValue(c.rank)).sort((a, b) => b - a);
  const counts = new Map<number, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);

  const isFlush = cards.every((c) => c.suit === cards[0].suit);

  // Straight detection with wheel normalisation.
  const unique = [...new Set(values)].sort((a, b) => b - a);
  let straightHigh: number | null = null;
  if (unique.length === 5) {
    if (unique[0] - unique[4] === 4) {
      straightHigh = unique[0];
    } else if (unique[0] === 14 && unique[1] === 5 && unique[4] === 2) {
      // A-5-4-3-2 → wheel, high card is the 5.
      straightHigh = 5;
    }
  }

  const isStraight = straightHigh !== null;
  const high = straightHigh as number;

  if (isFlush && isStraight) {
    if (high === 14) return { rank: HandRank.ROYAL_FLUSH, tiebreakers: [14] };
    return { rank: HandRank.STRAIGHT_FLUSH, tiebreakers: [high] };
  }

  // Groups
  const groups = [...counts.entries()].sort((a, b) => b[0] - a[0]);
  const quads = groups.filter(([, c]) => c === 4).map(([v]) => v);
  const trips = groups.filter(([, c]) => c === 3).map(([v]) => v);
  const pairs = groups.filter(([, c]) => c === 2).map(([v]) => v);

  if (quads.length === 1) {
    const kicker = values.find((v) => v !== quads[0])!;
    return { rank: HandRank.FOUR_OF_KIND, tiebreakers: [quads[0], kicker] };
  }

  if (trips.length === 1 && pairs.length >= 1) {
    return { rank: HandRank.FULL_HOUSE, tiebreakers: [trips[0], pairs[0]] };
  }

  if (isFlush) {
    return { rank: HandRank.FLUSH, tiebreakers: values };
  }

  if (isStraight) {
    return { rank: HandRank.STRAIGHT, tiebreakers: [high] };
  }

  if (trips.length === 1) {
    const kickers = values.filter((v) => v !== trips[0]).slice(0, 2);
    return { rank: HandRank.THREE_OF_KIND, tiebreakers: [trips[0], ...kickers] };
  }

  if (pairs.length === 2) {
    const kicker = values.find((v) => v !== pairs[0] && v !== pairs[1])!;
    const [hi, lo] = pairs[0] > pairs[1] ? [pairs[0], pairs[1]] : [pairs[1], pairs[0]];
    return { rank: HandRank.TWO_PAIR, tiebreakers: [hi, lo, kicker] };
  }

  if (pairs.length === 1) {
    const kickers = values.filter((v) => v !== pairs[0]).slice(0, 3);
    return { rank: HandRank.ONE_PAIR, tiebreakers: [pairs[0], ...kickers] };
  }

  return { rank: HandRank.HIGH_CARD, tiebreakers: values };
}

function compareTiebreakers(a: number[], b: number[]): number {
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    if (av > bv) return 1;
    if (av < bv) return -1;
  }
  return 0;
}

/** Total-order comparator: -1 if a < b, 0 if exactly equal, +1 if a > b. */
export function compareHandResults(a: HandResult, b: HandResult): -1 | 0 | 1 {
  if (a.rank > b.rank) return 1;
  if (a.rank < b.rank) return -1;
  return compareTiebreakers(a.tiebreakers, b.tiebreakers) as -1 | 0 | 1;
}

/** Exact equality: same rank and every tie-breaker. */
export function handResultsEqual(a: HandResult, b: HandResult): boolean {
  if (a.rank !== b.rank) return false;
  const len = Math.max(a.tiebreakers.length, b.tiebreakers.length);
  for (let i = 0; i < len; i++) {
    if ((a.tiebreakers[i] ?? 0) !== (b.tiebreakers[i] ?? 0)) return false;
  }
  return true;
}

/**
 * Evaluate the best 5-card hand from 2 hole + up to 5 community cards.
 * Returns provenance (hole vs board) and playing-board detection.
 */
export function evaluateHand(holeCards: Card[], communityCards: Card[]): HandResult {
  const all = [...holeCards, ...communityCards];
  if (all.length < 5) {
    // Not enough cards for a full hand (e.g. preflop). Best effort on what exists.
    const pad = all.slice();
    return buildResult(evaluate5Cards(pad.length >= 5 ? pad.slice(0, 5) : pad), pad.slice(0, 5), holeCards);
  }

  const holeKeys = new Set(holeCards.map((c) => `${c.rank}-${c.suit}`));
  let best: FiveCardEval | null = null;
  let bestCombo: Card[] = [];

  const n = all.length;
  for (let a = 0; a < n - 4; a++)
    for (let b = a + 1; b < n - 3; b++)
      for (let c = b + 1; c < n - 2; c++)
        for (let d = c + 1; d < n - 1; d++)
          for (let e = d + 1; e < n; e++) {
            const combo = [all[a], all[b], all[c], all[d], all[e]];
            const ev = evaluate5Cards(combo);
            if (
              best === null ||
              ev.rank > best.rank ||
              (ev.rank === best.rank && compareTiebreakers(ev.tiebreakers, best.tiebreakers) > 0)
            ) {
              best = ev;
              bestCombo = combo;
            }
          }

  return buildResult(best!, bestCombo, holeCards);
}

function buildResult(ev: FiveCardEval, bestCombo: Card[], holeCards: Card[]): HandResult {
  const holeKeys = new Set(holeCards.map((c) => `${c.rank}-${c.suit}`));
  const detailed: BestCard[] = bestCombo.map((card) => ({
    card,
    fromHole: holeKeys.has(`${card.rank}-${card.suit}`),
  }));
  const holeCardsUsed = detailed.filter((d) => d.fromHole).length;

  let score = ev.rank * 10_000_000_000;
  for (let i = 0; i < ev.tiebreakers.length; i++) {
    score += ev.tiebreakers[i] * Math.pow(100, 4 - i);
  }

  return {
    rank: ev.rank,
    name: HAND_NAMES[ev.rank],
    score,
    bestCards: bestCombo.slice(0, 5),
    bestCardsDetailed: detailed,
    tiebreakers: ev.tiebreakers,
    playingBoard: holeCardsUsed === 0 && bestCombo.length === 5,
    holeCardsUsed,
  };
}

/** Packed score of a HandResult (monotonic). */
export function packScore(ev: FiveCardEval): number {
  let score = ev.rank * 10_000_000_000;
  for (let i = 0; i < ev.tiebreakers.length; i++) {
    score += ev.tiebreakers[i] * Math.pow(100, 4 - i);
  }
  return score;
}
