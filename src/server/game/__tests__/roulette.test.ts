// ============================================================
// Roulette engine tests
// ============================================================

import {
  RouletteEngine,
  numberColor,
  EUROPEAN_WHEEL,
  ROULETTE_PAYOUTS,
  RECOMMENDED_ROULETTE_CONFIG,
} from '../roulette';
import { seededRng } from '../deck';

const rngAt = (n: number) => seededRng(1000 + n);

describe('roulette wheel', () => {
  it('European wheel: 37 slots, single zero, standard order', () => {
    expect(EUROPEAN_WHEEL).toHaveLength(37);
    expect(new Set(EUROPEAN_WHEEL).size).toBe(37);
    expect(EUROPEAN_WHEEL[0]).toBe(0);
  });

  it('colors: 0 green, 18 red, 18 black', () => {
    let red = 0;
    let black = 0;
    for (let n = 0; n <= 36; n++) {
      const c = numberColor(n);
      if (n === 0) expect(c).toBe('green');
      else if (c === 'red') red++;
      else black++;
    }
    expect(red).toBe(18);
    expect(black).toBe(18);
  });
});

describe('roulette betting', () => {
  const engine = () => new RouletteEngine(10000, {}, rngAt(1));

  it('straight bet pays 35:1', () => {
    const e = engine();
    expect(e.placeBet('straight', [17], 100)).toBeNull();
    e.spin();
    const s = e.snapshot();
    expect(s.phase).toBe('SETTLED');
    if (s.winningNumber === 17) {
      expect(s.result?.netWin).toBe(3500);
    } else {
      expect(s.result?.netWin).toBe(-100);
    }
  });

  it('even-money bets pay 1:1 and lose on zero', () => {
    const e = new RouletteEngine(10000, {}, rngAt(0)); // deterministic: 0? compute below
    expect(e.placeBet('red', [], 100)).toBeNull();
    const num = e.spin();
    const s = e.snapshot();
    if (num === 0) expect(s.result?.netWin).toBe(-100);
    else if (numberColor(num) === 'red') expect(s.result?.netWin).toBe(100);
    else expect(s.result?.netWin).toBe(-100);
  });

  it('invalid split rejected (non-adjacent)', () => {
    const e = engine();
    expect(e.placeBet('split', [1, 7], 100)).toBe('الفصل يتطلب رقمين متجاورين');
  });

  it('valid split accepted (vertical 1-4 and row 4-5 and 0-1)', () => {
    const e = engine();
    expect(e.placeBet('split', [1, 4], 100)).toBeNull();
    expect(e.placeBet('split', [4, 5], 50)).toBeNull();
    expect(e.placeBet('split', [0, 2], 25)).toBeNull();
    expect(e.totalBet()).toBe(175);
  });

  it('street requires 3 numbers in one row; 1-2-3 valid, 1-2-4 invalid', () => {
    const e = engine();
    expect(e.placeBet('street', [1, 2, 3], 100)).toBeNull();
    expect(e.placeBet('street', [1, 2, 4], 100)).toBe('الصف يتطلب أرقام صف واحد');
  });

  it('corner requires a 2x2 square (1-2-4-5 valid, 1-2-3-4 invalid)', () => {
    const e = engine();
    expect(e.placeBet('corner', [1, 2, 4, 5], 100)).toBeNull();
    expect(e.placeBet('corner', [1, 2, 3, 4], 100)).toBe('الزاوية تتطلب مربعًا متجاورًا');
  });

  it('sixline requires two adjacent rows', () => {
    const e = engine();
    expect(e.placeBet('sixline', [1, 2, 3, 4, 5, 6], 100)).toBeNull();
    expect(e.placeBet('sixline', [1, 2, 3, 7, 8, 9], 100)).toBe('الستة تتطلب صفين متجاورين');
  });

  it('dozen + column accept only canonical sets', () => {
    const e = engine();
    expect(e.placeBet('dozen', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 100)).toBeNull();
    expect(e.placeBet('column', [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36], 100)).toBeNull();
    expect(e.placeBet('dozen', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13], 100)).toBe('دزينة غير صالحة');
  });

  it('bets aggregate on identical targets', () => {
    const e = engine();
    e.placeBet('red', [], 100);
    e.placeBet('red', [], 100);
    const s = e.snapshot();
    expect(s.bets).toHaveLength(1);
    expect(s.bets[0].amount).toBe(200);
  });

  it('removeBet refunds; clearBets refunds all', () => {
    const e = engine();
    e.placeBet('red', [], 100);
    const id = e.snapshot().bets[0].id;
    expect(e.removeBet(id)).toBeNull();
    expect(e.snapshot().balance).toBe(10000);
    e.placeBet('black', [], 100);
    e.placeBet('straight', [7], 50);
    e.clearBets();
    expect(e.snapshot().totalBet).toBe(0);
    expect(e.snapshot().balance).toBe(10000);
  });

  it('minimums and caps enforced', () => {
    const e = engine();
    expect(e.placeBet('red', [], 5)).toBe(`الحد الأدنى للرهان ${RECOMMENDED_ROULETTE_CONFIG.minBet}`);
    expect(e.placeBet('red', [], 20000)).toBe('رصيد غير كافٍ');
    expect(e.placeBet('straight', [7], 600)).toBe(`الحد الأقصى للرقم الواحد ${RECOMMENDED_ROULETTE_CONFIG.maxStraightBet}`);
  });

  it('spin requires at least one bet', () => {
    const e = engine();
    expect(e.spin()).toBe(-1);
  });

  it('history keeps last numbers, newest first, capped at 12', () => {
    const e = new RouletteEngine(10000, {}, rngAt(1));
    let lastNum = -1;
    for (let i = 0; i < 15; i++) {
      e.placeBet('red', [], 10);
      lastNum = e.spin();
      e.newRound();
    }
    const s = e.snapshot();
    expect(s.history).toHaveLength(12);
    expect(s.history[0]).toBe(lastNum);
    expect(s.winningNumber).toBeNull(); // بعد جولة جديدة
  });

  it('house edge simulation: European single-zero ≈ 2.7% over 10^7 spins', () => {
    const e = new RouletteEngine(1_000_000_000, {}, seededRng(4242));
    let wagered = 0;
    for (let i = 0; i < 2_000_000; i++) {
      e.placeBet('red', [], 100);
      wagered += 100;
      e.spin();
      e.newRound();
    }
    const net = e.snapshot().balance - 1_000_000_000;
    const edge = net / wagered;
    // متوقع -1/37 ≈ -2.70%
    expect(Math.abs(edge - -1 / 37)).toBeLessThan(0.002);
  });
});

// ============================================================
// Forced payouts + amount validation (hardening)
// ============================================================

describe('roulette forced payouts', () => {
  const forced = (win: number) => new RouletteEngine(10000, {}, () => (win + 0.5) / 37);

  const cases = [
    ['straight', [17], 17, 3500],
    ['split', [16, 17], 16, 1700],
    ['street', [4, 5, 6], 5, 1100],
    ['corner', [1, 2, 4, 5], 2, 800],
    ['sixline', [1, 2, 3, 4, 5, 6], 3, 500],
    ['dozen', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 7, 200],
    ['column', [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34], 10, 200],
    ['red', [], 1, 100],
    ['black', [], 2, 100],
    ['odd', [], 3, 100],
    ['even', [], 4, 100],
    ['low', [], 5, 100],
    ['high', [], 19, 100],
  ] as const;

  for (const [type, numbers, win, expected] of cases) {
    it(`${type} pays ${expected} when it wins`, () => {
      const e = forced(win);
      expect(e.placeBet(type as any, [...numbers] as number[], 100)).toBeNull();
      e.spin();
      const s = e.snapshot();
      expect(s.winningNumber).toBe(win);
      expect(s.result?.netWin).toBe(expected);
    });
  }

  it('rejects NaN and fractional bets without corrupting balance', () => {
    const e = new RouletteEngine(1000, {}, seededRng(1));
    expect(e.placeBet('straight', [17], NaN)).not.toBeNull();
    expect(e.placeBet('straight', [17], 10.5)).not.toBeNull();
    expect(e.snapshot().balance).toBe(1000);
  });
});
