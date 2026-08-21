// ============================================================
// جرب حظك — Roulette Engine (الروليت الأوروبي — صفر واحد)
// 37 خانة: 0-36. الدفعات القياسية الأوروبية. لا سجن ولا La Partage:
// الصفر يخسر الرهانات المتساوية. RNG قابل للحقن للاختبار.
// ============================================================

import { Rng, isValidChips, secureRandomInt } from './deck';

export type RouletteBetType =
  | 'straight'   // رقم واحد 35:1
  | 'split'      // رقمان متجاوران 17:1
  | 'street'     // صف 3 أرقام 11:1
  | 'corner'     // 4 أرقام 8:1
  | 'sixline'    // صفّان 6 أرقام 5:1
  | 'dozen'      // دزينة 12 رقمًا 2:1
  | 'column'     // عمود 12 رقمًا 2:1
  | 'red' | 'black' | 'odd' | 'even' | 'low' | 'high'; // 1:1

export const ROULETTE_PAYOUTS: Record<RouletteBetType, number> = {
  straight: 35,
  split: 17,
  street: 11,
  corner: 8,
  sixline: 5,
  dozen: 2,
  column: 2,
  red: 1,
  black: 1,
  odd: 1,
  even: 1,
  low: 1,
  high: 1,
};

export const ROULETTE_RED = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
]);

/** ترتيب العجلة الأوروبية القياسي */
export const EUROPEAN_WHEEL = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23,
  10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
];

export const numberColor = (n: number): 'red' | 'black' | 'green' =>
  n === 0 ? 'green' : ROULETTE_RED.has(n) ? 'red' : 'black';

export interface RouletteBet {
  id: string;
  type: RouletteBetType;
  /** أرقام الرهان — لأصناف straight/split/street/corner/sixline/dozen/column */
  numbers: number[];
  amount: number;
}

export interface RouletteSnapshot {
  phase: 'BETTING' | 'SPINNING' | 'SETTLED';
  balance: number;
  totalBet: number;
  bets: RouletteBet[];
  /** آخر رقم فائز (null قبل أول دورة) */
  winningNumber: number | null;
  /** سجل آخر الأرقام (الأحدث أولًا) */
  history: number[];
  roundNumber: number;
  result: {
    winningNumber: number;
    netWin: number; // الأرباح فقط (بدون استرداد الرهان)
    wonBets: string[]; // ids الرهانات الفائزة
    lostBetTotal: number;
  } | null;
}

export interface RouletteConfig {
  minBet: number;
  maxTotalBet: number;
  maxStraightBet: number;
}

export const RECOMMENDED_ROULETTE_CONFIG: RouletteConfig = {
  minBet: 10,
  maxTotalBet: 5000,
  maxStraightBet: 500,
};

// ===== حساب الأرقام لكل صنف =====

const DOZENS: number[][] = [
  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24],
  [25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36],
];

const COLUMNS: number[][] = [
  [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34],
  [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35],
  [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36],
];

/** تحقق من أن أرقام الرهان تشكل شكلًا قانونيًا (متجاورات صحيحة) */
function validateNumbers(type: RouletteBetType, numbers: number[]): string | null {
  const allValid = numbers.every((n) => Number.isInteger(n) && n >= 0 && n <= 36);
  if (!allValid) return 'أرقام غير صالحة';
  const uniq = [...new Set(numbers)];
  switch (type) {
    case 'straight':
      return uniq.length === 1 ? null : 'الرهان المباشر يتطلب رقمًا واحدًا';
    case 'split': {
      if (uniq.length !== 2) return 'الفصل يتطلب رقمين';
      const [a, b] = uniq.sort((x, y) => x - y);
      const adjacent =
        (b - a === 1 && Math.floor((a - 1) / 3) === Math.floor((b - 1) / 3)) || // نفس الصف متجاوران
        (b - a === 3 && a >= 1) || // عمودي متجاوران
        (a === 0 && b === 1) || (a === 0 && b === 2) || (a === 0 && b === 3); // 0 مع أول صف
      return adjacent ? null : 'الفصل يتطلب رقمين متجاورين';
    }
    case 'street': {
      if (uniq.length !== 3) return 'الصف يتطلب 3 أرقام';
      const rows = uniq.filter((n) => n >= 1).map((n) => Math.ceil(n / 3));
      return rows.every((r) => r === rows[0]) && rows.length === 3 ? null : 'الصف يتطلب أرقام صف واحد';
    }
    case 'corner': {
      if (uniq.length !== 4) return 'الزاوية تتطلب 4 أرقام';
      const ns = uniq.filter((n) => n >= 1);
      if (ns.length !== 4) return 'الزاوية لا تشمل الصفر';
      const rows = ns.map((n) => Math.ceil(n / 3));
      const rMin = Math.min(...rows);
      const rMax = Math.max(...rows);
      const cols = ns.map((n) => ((n - 1) % 3) + 1);
      const cMin = Math.min(...cols);
      const cMax = Math.max(...cols);
      return rMax - rMin === 1 && cMax - cMin === 1 ? null : 'الزاوية تتطلب مربعًا متجاورًا';
    }
    case 'sixline': {
      if (uniq.length !== 6) return 'الستة تتطلب 6 أرقام';
      const rows = uniq.map((n) => Math.ceil(n / 3));
      const rMin = Math.min(...rows);
      const rMax = Math.max(...rows);
      return rMax - rMin === 1 ? null : 'الستة تتطلب صفين متجاورين';
    }
    case 'dozen': {
      return uniq.length === 12 && DOZENS.some((d) => d.every((n) => uniq.includes(n)))
        ? null
        : 'دزينة غير صالحة';
    }
    case 'column': {
      return uniq.length === 12 && COLUMNS.some((c) => c.every((n) => uniq.includes(n)))
        ? null
        : 'عمود غير صالح';
    }
    default:
      return null;
  }
}

function numbersFor(type: RouletteBetType, numbers: number[]): number[] | null {
  if (type === 'red') return [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
  if (type === 'black') return [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35];
  if (type === 'odd') return Array.from({ length: 18 }, (_, i) => i * 2 + 1);
  if (type === 'even') return Array.from({ length: 18 }, (_, i) => i * 2 + 2);
  if (type === 'low') return Array.from({ length: 18 }, (_, i) => i + 1);
  if (type === 'high') return Array.from({ length: 18 }, (_, i) => i + 19);
  return numbers;
}

export class RouletteEngine {
  private balance: number;
  private config: RouletteConfig;
  private rng?: Rng; // undefined = CSPRNG افتراضي
  private bets: RouletteBet[] = [];
  private phase: 'BETTING' | 'SPINNING' | 'SETTLED' = 'BETTING';
  private winningNumber: number | null = null;
  private history: number[] = [];
  private roundNumber = 0;
  private result: RouletteSnapshot['result'] = null;
  private betSeq = 0;

  constructor(balance: number, config?: Partial<RouletteConfig>, rng?: Rng) {
    this.balance = balance;
    this.config = { ...RECOMMENDED_ROULETTE_CONFIG, ...config };
    this.rng = rng; // لا Math.random في الإنتاج
  }

  /** وضع شريحة على رهان (يُجمّع تلقائيًا مع رهان مطابق على نفس الأرقام) */
  placeBet(type: RouletteBetType, numbers: number[], amount: number): string | null {
    if (this.phase !== 'BETTING') return 'انتهت الجولة — ابدأ جولة جديدة';
    const errNum = validateNumbers(type, numbers);
    if (errNum) return errNum;
    const realNumbers = numbersFor(type, numbers);
    if (!realNumbers || realNumbers.length === 0) return 'أرقام غير صالحة';
    if (!isValidChips(amount) || amount < this.config.minBet) return `الحد الأدنى للرهان ${this.config.minBet}`;
    if (amount > this.balance) return 'رصيد غير كافٍ';
    if (this.totalBet() + amount > this.config.maxTotalBet) return 'تجاوزت الحد الأقصى لإجمالي الرهان';
    if (type === 'straight' && (this.bets.reduce((s, b) => s + (b.type === 'straight' && b.numbers[0] === numbers[0] ? b.amount : 0), 0) + amount) > this.config.maxStraightBet) {
      return `الحد الأقصى للرقم الواحد ${this.config.maxStraightBet}`;
    }
    if (amount > this.balance) return 'رصيد غير كافٍ';

    this.balance -= amount;
    // تجميع مع رهان مطابق
    const existing = this.bets.find(
      (b) => b.type === type && JSON.stringify([...b.numbers].sort()) === JSON.stringify([...realNumbers].sort())
    );
    if (existing) existing.amount += amount;
    else this.bets.push({ id: `b${++this.betSeq}`, type, numbers: [...realNumbers].sort((a, b) => a - b), amount });
    return null;
  }

  /** إزالة رهان (تردّ رصيده) */
  removeBet(betId: string): string | null {
    if (this.phase !== 'BETTING') return 'انتهت الجولة';
    const idx = this.bets.findIndex((b) => b.id === betId);
    if (idx < 0) return 'الرهان غير موجود';
    this.balance += this.bets[idx].amount;
    this.bets.splice(idx, 1);
    return null;
  }

  clearBets(): void {
    if (this.phase !== 'BETTING') return;
    this.balance += this.totalBet();
    this.bets = [];
  }

  /** تدوير العجلة وتسوية الرهانات */
  spin(): number {
    if (this.phase !== 'BETTING' || this.bets.length === 0) {
      // يُسمح بالتدوير بلا رهانات؟ لا — يتطلب رهانًا
      return -1;
    }
    this.phase = 'SPINNING';
    const num = this.rng ? Math.floor(this.rng() * 37) : secureRandomInt(37);
    this.winningNumber = num;
    this.history = [num, ...this.history].slice(0, 12);

    let netWin = 0;
    const wonBets: string[] = [];
    let lostBetTotal = 0;
    for (const bet of this.bets) {
      if (bet.numbers.includes(num)) {
        const payout = bet.amount * ROULETTE_PAYOUTS[bet.type];
        netWin += payout + bet.amount; // الأرباح + استرداد الرهان
        wonBets.push(bet.id);
      } else {
        lostBetTotal += bet.amount;
      }
    }
    this.balance += netWin;
    this.result = { winningNumber: num, netWin: netWin - this.totalBet(), wonBets, lostBetTotal };
    this.phase = 'SETTLED';
    this.bets = [];
    this.roundNumber += 1;
    return num;
  }

  newRound(): void {
    this.phase = 'BETTING';
    this.result = null;
    this.winningNumber = null;
  }

  totalBet(): number {
    return this.bets.reduce((s, b) => s + b.amount, 0);
  }

  snapshot(): RouletteSnapshot {
    return {
      phase: this.phase,
      balance: this.balance,
      totalBet: this.totalBet(),
      bets: this.bets.map((b) => ({ ...b, numbers: [...b.numbers] })),
      winningNumber: this.winningNumber,
      history: [...this.history],
      roundNumber: this.roundNumber,
      result: this.result ? { ...this.result, wonBets: [...this.result.wonBets] } : null,
    };
  }
}
