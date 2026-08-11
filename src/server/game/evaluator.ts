// ============================================================
// جرب حظك — Hand Evaluator (Texas Hold'em)
// ============================================================

import { Card, Rank, getRankValue } from './deck';

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

export interface HandResult {
  rank: HandRank;
  name: string;
  score: number; // قيمة رقمية للمقارنة
  bestCards: Card[];
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

/** تقييم أفضل 5 أوراق من 7 */
export function evaluateHand(holeCards: Card[], communityCards: Card[]): HandResult {
  const allCards = [...holeCards, ...communityCards];
  const combinations = getCombinations(allCards, 5);

  let best: HandResult = {
    rank: HandRank.HIGH_CARD,
    name: HAND_NAMES[HandRank.HIGH_CARD],
    score: 0,
    bestCards: [],
  };

  for (const combo of combinations) {
    const result = evaluate5Cards(combo);
    if (result.score > best.score) {
      best = result;
    }
  }

  return best;
}

function evaluate5Cards(cards: Card[]): HandResult {
  const sorted = [...cards].sort((a, b) => getRankValue(b.rank) - getRankValue(a.rank));
  const values = sorted.map((c) => getRankValue(c.rank));
  const suits = sorted.map((c) => c.suit);

  const isFlush = suits.every((s) => s === suits[0]);
  const isStraight = checkStraight(values);

  // Royal flush
  if (isFlush && isStraight && values[0] === 14) {
    return makeResult(HandRank.ROYAL_FLUSH, sorted, [14]);
  }

  // Straight flush
  if (isFlush && isStraight) {
    return makeResult(HandRank.STRAIGHT_FLUSH, sorted, [values[0]]);
  }

  // Four of a kind
  const fourGroup = findGroups(values, 4);
  if (fourGroup) {
    const kicker = values.find((v) => v !== fourGroup)!;
    return makeResult(HandRank.FOUR_OF_KIND, sorted, [fourGroup, kicker]);
  }

  // Full house
  const threeGroup = findGroups(values, 3);
  const pairGroup = findGroups(values, 2);
  if (threeGroup && pairGroup && threeGroup !== pairGroup) {
    return makeResult(HandRank.FULL_HOUSE, sorted, [threeGroup, pairGroup]);
  }

  // Flush
  if (isFlush) {
    return makeResult(HandRank.FLUSH, sorted, values.slice(0, 5));
  }

  // Straight
  if (isStraight) {
    return makeResult(HandRank.STRAIGHT, sorted, [values[0]]);
  }

  // Three of a kind
  if (threeGroup) {
    const kickers = values.filter((v) => v !== threeGroup).slice(0, 2);
    return makeResult(HandRank.THREE_OF_KIND, sorted, [threeGroup, ...kickers]);
  }

  // Two pair / One pair / High card
  const pairs = findAllPairs(values);
  if (pairs.length === 2) {
    const kicker = values.find((v) => v !== pairs[0] && v !== pairs[1])!;
    return makeResult(HandRank.TWO_PAIR, sorted, [...pairs.sort((a, b) => b - a), kicker]);
  }
  if (pairs.length === 1) {
    const kickers = values.filter((v) => v !== pairs[0]).slice(0, 3);
    return makeResult(HandRank.ONE_PAIR, sorted, [pairs[0], ...kickers]);
  }

  return makeResult(HandRank.HIGH_CARD, sorted, values.slice(0, 5));
}

function checkStraight(values: number[]): boolean {
  const unique = [...new Set(values)].sort((a, b) => b - a);
  if (unique.length < 5) return false;

  // Normal straight
  for (let i = 0; i <= unique.length - 5; i++) {
    if (unique[i] - unique[i + 4] === 4) return true;
  }

  // Ace-low straight (A-2-3-4-5)
  const aceLow = unique.map((v) => (v === 14 ? 1 : v)).sort((a, b) => b - a);
  for (let i = 0; i <= aceLow.length - 5; i++) {
    if (aceLow[i] - aceLow[i + 4] === 4) return true;
  }

  return false;
}

function findGroups(values: number[], size: number): number | null {
  const counts = new Map<number, number>();
  for (const v of values) counts.set(v, (counts.get(v) || 0) + 1);
  for (const [val, count] of counts) {
    if (count === size) return val;
  }
  return null;
}

function findAllPairs(values: number[]): number[] {
  const counts = new Map<number, number>();
  for (const v of values) counts.set(v, (counts.get(v) || 0) + 1);
  const pairs: number[] = [];
  for (const [val, count] of counts) {
    if (count >= 2) pairs.push(val);
  }
  return pairs;
}

function makeResult(rank: HandRank, cards: Card[], tiebreakers: number[]): HandResult {
  let score = rank * 10000000000;
  for (let i = 0; i < tiebreakers.length; i++) {
    score += tiebreakers[i] * Math.pow(100, 4 - i);
  }
  return { rank, name: HAND_NAMES[rank], score, bestCards: cards.slice(0, 5) };
}

function getCombinations(arr: Card[], k: number): Card[][] {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  const first = arr[0];
  const rest = arr.slice(1);
  const withFirst = getCombinations(rest, k - 1).map((c) => [first, ...c]);
  const withoutFirst = getCombinations(rest, k);
  return [...withFirst, ...withoutFirst];
}
