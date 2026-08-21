// ============================================================
// جرب حظك — Card Deck
// CSPRNG-seeded shuffle, injectable RNG for tests/simulations.
// ============================================================

export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  suit: Suit;
  rank: Rank;
}

export const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
export const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

/** RNG source: () => number in [0, 1). Inject a seeded generator for tests. */
export type Rng = () => number;

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank });
    }
  }
  return deck;
}

/**
 * عدد صحيح عشوائي في [0, max) — يستخدم Web Crypto عند توفره (متصفح/Hermes)،
 * وإلا يرجع إلى Math.random. تجنّبنا استيراد node:crypto هنا حتى يعمل الملف
 * نفسه عند حزم تطبيق React Native (Expo) وعلى الخادم (Node).
 */
function randomInt(max: number): number {
  const MAX_UINT = 0x100000000; // 2^32
  const g = (globalThis as any).crypto as
    | { getRandomValues?: (arr: Uint32Array) => Uint32Array }
    | undefined;

  if (g?.getRandomValues) {
    const buf = new Uint32Array(1);
    g.getRandomValues(buf);
    // rejection sampling لإزالة انحياز القسمة (modulo bias)
    const limit = MAX_UINT - (MAX_UINT % max);
    let x = buf[0];
    while (x >= limit) {
      g.getRandomValues(buf);
      x = buf[0];
    }
    return x % max;
  }

  return Math.floor(Math.random() * max);
}

/**
 * Fisher-Yates shuffle driven by a CSPRNG by default.
 * Pass `rng` for deterministic tests.
 */
export function shuffleDeck<T>(deck: T[], rng?: Rng): T[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = rng
      ? Math.floor(rng() * (i + 1))
      : randomInt(i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/** Deterministic seeded PRNG (mulberry32). For tests and simulations only — never production. */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function dealCards(deck: Card[], count: number): { cards: Card[]; remaining: Card[] } {
  return {
    cards: deck.slice(0, count),
    remaining: deck.slice(count),
  };
}

export function getRankValue(rank: Rank): number {
  const values: Record<Rank, number> = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
    '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14,
  };
  return values[rank];
}

export function cardToString(card: Card): string {
  const suitSymbols: Record<Suit, string> = {
    hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠',
  };
  return `${card.rank}${suitSymbols[card.suit]}`;
}

/**
 * تحقق من أن المبلغ شرائح صالحة: عدد صحيح موجب منتهٍ.
 * يمنع NaN/Infinity/كسور من إفساد الأرصدة عبر كل المحركات.
 */
export function isValidChips(amount: number): boolean {
  return Number.isFinite(amount) && Number.isInteger(amount) && amount > 0;
}

/** عدد صحيح عشوائي آمن في [0, max) — للاستخدام المباشر (روليت مثلًا). */
export function secureRandomInt(max: number): number {
  return randomInt(max);
}

/** Canonical card key used by the invariant checker (duplicate detection). */
export function cardKey(card: Card): string {
  return `${card.rank}-${card.suit}`;
}

/**
 * Invariant check: a deck resource must contain exactly the expected composition
 * with no duplicates and no unknown cards. Throws on violation.
 */
export function assertDeckComposition(cards: Card[], expectedMultiples: number = 1): void {
  const seen = new Set<string>();
  const counts = new Map<string, number>();
  for (const c of cards) {
    const key = cardKey(c);
    if (seen.has(key)) throw new Error(`DUPLICATE_CARD: ${key}`);
    seen.add(key);
    counts.set(c.rank, (counts.get(c.rank) ?? 0) + 1);
  }
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      if (expectedMultiples === 1 && !seen.has(cardKey({ suit, rank }))) {
        throw new Error(`MISSING_CARD: ${cardKey({ suit, rank })}`);
      }
    }
  }
}
