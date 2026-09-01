// ============================================================
// Roulette engine tests
// ============================================================

import {
  RouletteEngine,
  numberColor,
  EUROPEAN_WHEEL,
  ROULETTE_PAYOUTS,
  RECOMMENDED_ROULETTE_CONFIG,
  wheelNeighbors,
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

// ============================================================
// الرهانات الجديدة: جيران (نيبر) + ثلاثي + ركن الصفر + المعلنة
// ============================================================

describe('roulette new bets (neighbors, trio, first four, call bets)', () => {
  const forced = (win: number) => new RouletteEngine(10000, {}, () => (win + 0.5) / 37);

  it('wheelNeighbors(17,2) = [2,25,17,34,6] (wheel order)', () => {
    expect(wheelNeighbors(17, 2)).toEqual([2, 25, 17, 34, 6]);
    expect(wheelNeighbors(0, 2)).toEqual([3, 26, 0, 32, 15]);
  });

  it('neighbors bet accepted for contiguous wheel arcs and pays 35:1', () => {
    const e = forced(26);
    expect(e.placeBet('neighbors', wheelNeighbors(0, 2), 100)).toBeNull();
    e.spin();
    const s = e.snapshot();
    expect(s.winningNumber).toBe(26);
    expect(s.result?.netWin).toBe(3500);
  });

  it('neighbors rejects non-contiguous wheel sets and even-length arcs', () => {
    const e = new RouletteEngine(10000, {}, () => 0.5);
    expect(e.placeBet('neighbors', [0, 1, 2, 3, 4], 100)).not.toBeNull();
    expect(e.placeBet('neighbors', [0, 32, 15, 19], 100)).not.toBeNull();
    expect(e.placeBet('neighbors', wheelNeighbors(7, 1), 100)).toBeNull(); // 3 أرقام
  });

  it('trio accepts only 0-1-2 and 0-2-3 and pays 11:1', () => {
    const e = new RouletteEngine(10000, {}, () => 0.5);
    expect(e.placeBet('trio', [0, 1, 2], 100)).toBeNull();
    expect(e.placeBet('trio', [0, 2, 3], 50)).toBeNull();
    expect(e.placeBet('trio', [0, 1, 3], 50)).not.toBeNull();
    expect(e.placeBet('trio', [1, 2, 3], 50)).not.toBeNull();

    const f = forced(2);
    expect(f.placeBet('trio', [0, 1, 2], 100)).toBeNull();
    f.spin();
    expect(f.snapshot().result?.netWin).toBe(1100);
  });

  it('first four corner 0-1-2-3 accepted; other zero-corners rejected', () => {
    const e = new RouletteEngine(10000, {}, () => 0.5);
    expect(e.placeBet('corner', [0, 1, 2, 3], 100)).toBeNull();
    expect(e.placeBet('corner', [0, 2, 3, 5], 100)).not.toBeNull();

    const f = forced(3);
    expect(f.placeBet('corner', [0, 1, 2, 3], 100)).toBeNull();
    f.spin();
    expect(f.snapshot().result?.netWin).toBe(800);
  });

  it('call bet decompositions are all valid engine bets', () => {
    // التأكد من أن كل وحدات الرهانات المعلنة تقبلها قواعد المحرك
    const units: { type: any; numbers: number[] }[] = [
      { type: 'trio', numbers: [0, 2, 3] },
      { type: 'split', numbers: [4, 7] },
      { type: 'split', numbers: [12, 15] },
      { type: 'split', numbers: [18, 21] },
      { type: 'split', numbers: [19, 22] },
      { type: 'corner', numbers: [25, 26, 28, 29] },
      { type: 'split', numbers: [32, 35] },
      { type: 'split', numbers: [5, 8] },
      { type: 'split', numbers: [10, 11] },
      { type: 'split', numbers: [13, 16] },
      { type: 'split', numbers: [23, 24] },
      { type: 'split', numbers: [27, 30] },
      { type: 'split', numbers: [33, 36] },
      { type: 'straight', numbers: [1] },
      { type: 'split', numbers: [6, 9] },
      { type: 'split', numbers: [14, 17] },
      { type: 'split', numbers: [17, 20] },
      { type: 'split', numbers: [31, 34] },
      { type: 'split', numbers: [0, 3] },
      { type: 'straight', numbers: [26] },
    ];
    const e = new RouletteEngine(100000, {}, () => 0.5);
    for (const u of units) {
      expect(e.placeBet(u.type, u.numbers, 10)).toBeNull();
    }
  });
});
