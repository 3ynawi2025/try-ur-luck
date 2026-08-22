// ============================================================
// جرب حظك — Solo Games Socket Layer (Server-authoritative)
// تستضيف ألعاب اللاعب الفردي ضد الموزع على الخادم:
// بلاك جاك، ثلاث أوراق بوكر، البوكر الروسي، الروليت.
// الهوية من توكن السوكت الموثّق (socket.data.userId) —
// لا نثق بأي userId يرسله العميل. حفظ الرصيد ذرّي عبر RPC.
// ============================================================

import { Server, Socket } from 'socket.io';
import { BlackjackEngine, BlackjackSnapshot, DEFAULT_BLACKJACK_CONFIG } from './blackjack';
import { ThreeCardPokerEngine } from './threeCardPoker';
import { RussianPokerEngine } from './russianPoker';
import { RouletteEngine, RouletteBet } from './roulette';
import { secureRandomInt } from './deck';
import { applyBalanceDelta, loadPlayerBalance, loadPlayerDisplayName } from '../lib/playerPersistence';
import { generateAgoraToken, AGORA_APP_ID } from './agora';

export type SoloGameKind = 'blackjack' | 'three-card' | 'russian' | 'roulette';

type SoloEngine = BlackjackEngine | ThreeCardPokerEngine | RussianPokerEngine | RouletteEngine;

interface SoloSession {
  game: SoloGameKind;
  playerId: string;
  name: string;
  userId: string | null; // معرف Supabase الحقيقي (من التوكن الموثّق) لحفظ الرصيد
  startBalance: number;
  settled: boolean; // يُمنع حفظ الرصيد مرتين لنفس الجولة
  engine: SoloEngine;
  roomKey: string; // غرفة السوكت المشتركة
  shared: boolean; // بلاك جاك مشترك: محرك واحد لكل الطاولة
}

const DEFAULT_BALANCE = 10_000;

// جلسة واحدة لكل اتصال — اللاعب يواجه الموزع وحده
const sessions = new Map<string, SoloSession>();

/** إحصاءات حية للجلسات الفردية (لمراقبة /diag). */
export function getSoloStats(): { sessions: number } {
  return { sessions: sessions.size };
}

/** أحجام الغرف الحية للألعاب الفردية (مفتاح الغرفة -> عدد الجالسين). */
export function getLiveSoloCounts(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [key, room] of soloTables) out[key] = room.size;
  return out;
}

// ===== طاولات فردية مشتركة: حتى 6 لاعبين على نفس الطاولة =====
// البلاك جاك: محرك مشترك لكل الطاولة — ديلر واحد وكل اللاعبين يرون بعضهم.
// باقي الألعاب: مقاعد مشتركة (حضور + صوت) مع محرك مستقل لكل لاعب.
interface SoloSeat {
  id: string;
  name: string;
  userId: string | null;
  startBalance: number;
  leaving?: boolean;
  leaveAt?: number; // موعد الطرد النهائي للغائب (بلاك جاك: 3 دقائق)
  skipRound?: boolean; // جلس خارج الجولة الحالية لعدم الرهان
  // إعادة الرهان التلقائي في الروليت (آخر رهانات الجولة السابقة)
  lastBets: RouletteBet[];
  autoRebet: boolean;
}

interface SoloRoomMeta {
  lastPhase: string;
  insuranceResponded: Set<string>;
  // عداد بدء البلاك جاك: 30 ثانية من أول رهان — من لم يراهن يجلس خارج الجولة
  bjTimer: NodeJS.Timeout | null;
  bjCountdown: number;
  afkTimer: NodeJS.Timeout | null;
}

const soloTables = new Map<string, Map<string, SoloSeat>>(); // solo:<game>:<tableId> -> socketId -> مقعد
const blackjackRooms = new Map<string, BlackjackEngine>(); // محرك البلاك جاك المشترك لكل طاولة
const soloRoomMeta = new Map<string, SoloRoomMeta>();
const MAX_SOLO_SEATS = 6;
const MAX_ROULETTE_SEATS = 50; // طاولة الروليت مفتوحة لأكثر من 20 لاعبًا

// ===== الروليت المشترك: دوران تلقائي كل 30 ثانية مع عدّاد تنازلي =====
const ROULETTE_BET_SECONDS = 30;
const ROULETTE_RESULT_SECONDS = 10;
// ثلاث طاولات حسب الحد الأدنى للرهان (آخر حرف من tableId يحدد الفئة)
const ROULETTE_STAKES: Record<string, number> = { '1': 10, '2': 50, '3': 200 };

interface RouletteRoomState {
  phase: 'betting' | 'spinning' | 'result';
  endsAt: number;
  countdown: number;
  winningNumber: number | null;
  timer: NodeJS.Timeout | null;
}
const rouletteRooms = new Map<string, RouletteRoomState>();

function rouletteMinBet(tableId: string): number {
  const last = tableId.slice(-1);
  return ROULETTE_STAKES[last] ?? 10;
}

function seatCapFor(game: SoloGameKind): number {
  return game === 'roulette' ? MAX_ROULETTE_SEATS : MAX_SOLO_SEATS;
}

function soloRoomKey(game: SoloGameKind, tableId: string): string {
  return `solo:${game}:${tableId}`;
}

function getRoomMeta(key: string): SoloRoomMeta {
  let meta = soloRoomMeta.get(key);
  if (!meta) {
    meta = { lastPhase: 'betting', insuranceResponded: new Set(), bjTimer: null, bjCountdown: 0, afkTimer: null };
    soloRoomMeta.set(key, meta);
  }
  return meta;
}

/** إيقاف مؤقتات الغرفة قبل حذفها. */
function clearRoomTimers(key: string) {
  const meta = soloRoomMeta.get(key);
  if (meta?.bjTimer) {
    clearInterval(meta.bjTimer);
    meta.bjTimer = null;
  }
  const rState = rouletteRooms.get(key);
  if (rState?.timer) {
    clearInterval(rState.timer);
    rState.timer = null;
  }
}

function broadcastSoloPlayers(io: Server, key: string, room: Map<string, SoloSeat>) {
  io.to(key).emit('solo:players', {
    players: Array.from(room.values()).map((s) => ({ id: s.id, name: s.name })),
    count: room.size,
    max: MAX_SOLO_SEATS,
  });
}

/** تسوية أرصدة كل الجالسين على طاولة بلاك جاك مشتركة بعد نهاية الجولة. */
async function settleSharedBlackjack(io: Server, key: string, engine: BlackjackEngine): Promise<void> {
  const room = soloTables.get(key);
  if (!room || room.size === 0) return;
  const snap = engine.snapshot();

  for (const seat of room.values()) {
    const p = snap.players.find((x) => x.id === seat.id);
    const newBalance = p ? Math.max(0, Math.round(p.balance)) : Math.round(seat.startBalance);
    if (seat.userId && p && newBalance !== Math.round(seat.startBalance)) {
      const delta = newBalance - Math.round(seat.startBalance);
      try {
        await applyBalanceDelta(seat.userId, delta, 'بلاك جاك — طاولة مشتركة');
      } catch (err) {
        console.error('[solo] shared settle failed:', (err as Error).message);
      }
    }
    seat.startBalance = newBalance;
  }

  // حذف المغادرين بعد تسوية أرصدتهم (المغادرة الصريحة فورًا، والمنقطع بعد انتهاء مهلة 3 دقائق)
  const now = Date.now();
  const leaving = Array.from(room.entries()).filter(
    ([, s]) => s.leaving && (!s.leaveAt || now >= s.leaveAt)
  );
  for (const [sid, seat] of leaving) {
    engine.removePlayer(seat.id);
    room.delete(sid);
    sessions.delete(sid);
  }
  if (room.size === 0) {
    clearRoomTimers(key);
    soloTables.delete(key);
    blackjackRooms.delete(key);
    soloRoomMeta.delete(key);
    return;
  }
  // إعادة من لم يراهنوا (جلسوا خارج الجولة) ليشاركوا الجولة القادمة
  const reAdd: SoloSeat[] = [];
  for (const seat of room.values()) {
    if (seat.skipRound && !seat.leaving) {
      seat.skipRound = false;
      engine.addPlayer(seat.id, seat.name, Math.round(seat.startBalance));
      reAdd.push(seat);
    }
  }
  if (reAdd.length > 0) broadcastSoloPlayers(io, key, room);
}

// ===== عداد بدء البلاك جاك: 30 ثانية من أول رهان — من لم يراهن يجلس خارج الجولة (لا يُطرد) =====

function startBlackjackCountdown(io: Server, key: string, engine: BlackjackEngine, room: Map<string, SoloSeat>) {
  const meta = getRoomMeta(key);
  if (meta.bjTimer) return; // العداد يعمل بالفعل
  let remain = 30;
  meta.bjCountdown = remain;
  io.to(key).emit('solo:countdown', { seconds: remain });
  meta.bjTimer = setInterval(() => {
    remain -= 1;
    const snap = engine.snapshot();
    const waiting = snap.players.filter((p) => p.currentBet === 0);
    if (waiting.length === 0) {
      // الجميع راهنوا — ابدأ فورًا
      if (meta.bjTimer) clearInterval(meta.bjTimer);
      meta.bjTimer = null;
      meta.bjCountdown = 0;
      if (snap.phase === 'betting') {
        const r = engine.startRound();
        io.to(key).emit('solo:state', 'error' in r ? engine.snapshot() : r);
      }
      return;
    }
    if (remain <= 0) {
      if (meta.bjTimer) clearInterval(meta.bjTimer);
      meta.bjTimer = null;
      meta.bjCountdown = 0;
      // من لم يراهن يجلس خارج هذه الجولة (يبقى على الطاولة) — لا يُطرد
      const skipIds = waiting.map((p) => p.id);
      for (const p of waiting) {
        const seat = Array.from(room.values()).find((s) => s.id === p.id);
        if (seat) seat.skipRound = true;
        engine.removePlayer(p.id);
      }
      io.to(key).emit('solo:countdown', { seconds: 0 });
      const s2 = engine.snapshot();
      const r = s2.players.length > 0 && s2.phase === 'betting' ? engine.startRound() : s2;
      io.to(key).emit('solo:state', 'error' in r ? s2 : r);
      if (skipIds.length > 0) {
        // إشعار الجالسين خارج الجولة
        io.to(key).emit('solo:notice', { text: 'انتهى وقت الرهان — من لم يراهن يجلس خارج هذه الجولة' });
      }
      return;
    }
    meta.bjCountdown = remain;
    io.to(key).emit('solo:countdown', { seconds: remain });
  }, 1000);
}

// ===== طرد الغائب: يبقى مقعد المنقطع 3 دقائق ثم يُحذف إن لم يعد =====
const BLACKJACK_AFK_MS = 3 * 60 * 1000;

function scheduleBlackjackAfkSweep(io: Server, key: string) {
  const meta = getRoomMeta(key);
  if (meta.afkTimer) return;
  meta.afkTimer = setTimeout(() => {
    meta.afkTimer = null;
    const room = soloTables.get(key);
    const engine = blackjackRooms.get(key);
    if (!room || !engine) return;
    const now = Date.now();
    let removed = false;
    for (const [sid, seat] of Array.from(room.entries())) {
      if (seat.leaving && seat.leaveAt && now >= seat.leaveAt && !io.sockets.sockets.has(sid)) {
        engine.removePlayer(seat.id);
        room.delete(sid);
        sessions.delete(sid);
        removed = true;
      }
    }
    if (removed) {
      broadcastSoloPlayers(io, key, room);
      if (room.size === 0) {
        clearRoomTimers(key);
        soloTables.delete(key);
        blackjackRooms.delete(key);
        soloRoomMeta.delete(key);
        return;
      }
      scheduleBlackjackAfkSweep(io, key);
    }
  }, BLACKJACK_AFK_MS);
}

// ===== الروليت المشترك: دورة موقّتة (رهان 30 ثانية → دوران → نتيجة) =====

function broadcastRouletteRoom(io: Server, key: string, state: RouletteRoomState) {
  io.to(key).emit('roulette:room', {
    phase: state.phase,
    endsAt: state.endsAt,
    winningNumber: state.winningNumber,
  });
}

function startRouletteBetting(io: Server, key: string, state: RouletteRoomState) {
  state.phase = 'betting';
  state.countdown = 0;
  state.winningNumber = null;
  state.endsAt = Date.now() + ROULETTE_BET_SECONDS * 1000;
  broadcastRouletteRoom(io, key, state);

  // إعادة فتح محركات كل الجالسين لجولة رهان جديدة + إعادة الرهان التلقائي
  const room = soloTables.get(key);
  if (room) {
    for (const [sid, seat] of room) {
      const session = sessions.get(sid);
      if (session && isRoulette(session.engine)) {
        session.engine.newRound();
        // إعادة الرهان السابق تلقائيًا (فقط للمتصلين — المقعد الموجود = متصل)
        if (seat.autoRebet && seat.lastBets.length > 0) {
          let failed = false;
          for (const b of seat.lastBets) {
            const err = session.engine.placeBet(b.type, b.numbers, b.amount);
            if (err) {
              failed = true;
              break;
            }
          }
          if (failed) {
            seat.autoRebet = false;
            io.sockets.sockets.get(sid)?.emit('roulette:auto', {
              enabled: false,
              reason: 'رصيد غير كافٍ — توقف إعادة الرهان',
            });
          }
        }
        io.sockets.sockets.get(sid)?.emit('solo:state', session.engine.snapshot());
      }
    }
    broadcastRouletteBets(io, key, room);
  }

  if (state.timer) clearInterval(state.timer);
  state.timer = setInterval(() => {
    const remain = state.endsAt - Date.now();
    if (remain <= 0) {
      if (state.timer) clearInterval(state.timer);
      state.timer = null;
      void settleRouletteRound(io, key, state);
      return;
    }
    const c = Math.ceil(remain / 1000);
    if (c <= 10 && c !== state.countdown) {
      state.countdown = c;
      io.to(key).emit('roulette:countdown', { seconds: c, endsAt: state.endsAt });
    }
  }, 250);
}

async function settleRouletteRound(io: Server, key: string, state: RouletteRoomState): Promise<void> {
  const room = soloTables.get(key);
  if (!room || room.size === 0) {
    rouletteRooms.delete(key);
    return;
  }
  state.phase = 'spinning';
  state.countdown = 0;
  const num = secureRandomInt(37);
  state.winningNumber = num;
  state.endsAt = Date.now() + ROULETTE_RESULT_SECONDS * 1000;
  broadcastRouletteRoom(io, key, state);

  const winners: { name: string; netWin: number }[] = [];
  for (const [sid, seat] of room) {
    const session = sessions.get(sid);
    if (!session || !isRoulette(session.engine)) continue;
    const e = session.engine;
    // احفظ رهانات هذه الجولة لإعادة الرهان التلقائي
    seat.lastBets = e.snapshot().bets.map((b) => ({ ...b, numbers: [...b.numbers] }));
    const didSpin = e.spinWithResult(num);
    if (!didSpin) continue;
    const after = e.snapshot();
    if (seat.userId) {
      const delta = Math.round(after.balance) - Math.round(seat.startBalance);
      if (delta !== 0) {
        try {
          await applyBalanceDelta(seat.userId, delta, 'روليت — طاولة مشتركة');
        } catch (err) {
          console.error('[roulette] settle failed:', (err as Error).message);
        }
      }
    }
    seat.startBalance = after.balance;
    if (after.result) winners.push({ name: seat.name, netWin: after.result.netWin });
    const sock = io.sockets.sockets.get(sid);
    sock?.emit('solo:state', after);
    sock?.emit('roulette:result', {
      number: num,
      netWin: after.result?.netWin ?? 0,
      endsAt: state.endsAt,
    });
  }

  // إعلان عام للطاولة (الفائزون + الرقم)
  io.to(key).emit('roulette:winners', { number: num, winners });

  // حذف المغادرين بعد تسوية دورتهم (لا يخسرون رهاناتهم)
  let removedLeaving = false;
  for (const [sid, seat] of Array.from(room.entries())) {
    if (seat.leaving) {
      room.delete(sid);
      sessions.delete(sid);
      removedLeaving = true;
    }
  }
  if (removedLeaving) broadcastSoloPlayers(io, key, room);
  if (room.size === 0) {
    clearRoomTimers(key);
    soloTables.delete(key);
    rouletteRooms.delete(key);
    return;
  }

  // بعد عرض النتيجة: دورة رهان جديدة
  if (state.timer) clearTimeout(state.timer);
  state.timer = setTimeout(() => {
    if (soloTables.get(key)?.size) startRouletteBetting(io, key, state);
    else rouletteRooms.delete(key);
  }, ROULETTE_RESULT_SECONDS * 1000);
}

/** جمع رهانات كل الجالسين (لإظهارها على الطاولة المشتركة). */
function broadcastRouletteBets(io: Server, key: string, room: Map<string, SoloSeat>) {
  const all: { name: string; bets: RouletteBet[] }[] = [];
  for (const [sid, seat] of room) {
    const session = sessions.get(sid);
    if (!session || !isRoulette(session.engine)) continue;
    const snap = session.engine.snapshot();
    if (snap.bets.length > 0) {
      all.push({ name: seat.name, bets: snap.bets.map((b) => ({ ...b, numbers: [...b.numbers] })) });
    }
  }
  io.to(key).emit('roulette:bets', { players: all });
}

function isBlackjack(e: SoloEngine): e is BlackjackEngine {
  return e instanceof BlackjackEngine;
}
function isThreeCard(e: SoloEngine): e is ThreeCardPokerEngine {
  return e instanceof ThreeCardPokerEngine;
}
function isRussian(e: SoloEngine): e is RussianPokerEngine {
  return e instanceof RussianPokerEngine;
}
function isRoulette(e: SoloEngine): e is RouletteEngine {
  return e instanceof RouletteEngine;
}

function createEngine(game: SoloGameKind, balance: number, rouletteMinBet = 10): SoloEngine {
  switch (game) {
    case 'blackjack':
      return new BlackjackEngine({ ...DEFAULT_BLACKJACK_CONFIG });
    case 'three-card':
      return new ThreeCardPokerEngine(balance);
    case 'russian':
      return new RussianPokerEngine(balance);
    case 'roulette':
      return new RouletteEngine(balance, { minBet: rouletteMinBet });
  }
}

function snapshotOf(session: SoloSession): unknown {
  return session.engine.snapshot();
}

function currentBalance(session: SoloSession): number {
  const snap: any = session.engine.snapshot();
  if (isBlackjack(session.engine)) {
    const mine = snap.players?.find((p: any) => p.id === session.playerId);
    return mine?.balance ?? session.startBalance;
  }
  return typeof snap.balance === 'number' ? snap.balance : session.startBalance;
}

function isSettled(session: SoloSession): boolean {
  const snap: any = session.engine.snapshot();
  if (isBlackjack(session.engine)) return snap.phase === 'complete';
  if (isThreeCard(session.engine)) return snap.phase === 'SETTLED';
  if (isRussian(session.engine)) return snap.phase === 'SETTLE';
  if (isRoulette(session.engine)) return snap.phase === 'SETTLED';
  return false;
}

// ===== حفظ الرصيد في Supabase (ذرّي عبر RPC — مساعد مشترك) =====
async function persistBalance(session: SoloSession): Promise<void> {
  if (!session.userId || session.settled) return; // وضع ضيف بدون حفظ + منع الازدواج
  // منع إعادة الدخول: يُضبط العلم فورًا قبل أي await (كان يُضبط بعده — سباق إيداع مزدوج)
  session.settled = true;
  const raw = currentBalance(session);
  if (!Number.isFinite(raw)) {
    console.error('[solo] persistBalance skipped: non-finite balance');
    return;
  }
  const newBalance = Math.max(0, Math.round(raw));
  const delta = newBalance - Math.round(session.startBalance);

  try {
    if (delta !== 0) {
      await applyBalanceDelta(session.userId, delta, `جولة ${session.game}`);
    }
    session.startBalance = newBalance;
  } catch (e) {
    // لا نخسر الرصيد في الذاكرة — نعيد فتح العلم ليُعاد الحساب التراكمي في الجولة القادمة
    console.error('[solo] persistBalance failed:', (e as Error).message);
    session.settled = false;
  }
}

// ===== تطبيق إجراء حسب نوع اللعبة =====
function applyAction(
  session: SoloSession,
  action: string,
  data: Record<string, unknown>
): { error?: string } {
  const e = session.engine;

  if (isBlackjack(e)) {
    switch (action) {
      case 'bet': {
        const amount = Number(data.amount ?? 0);
        const sideBets = (data.sideBets as any) ?? {};
        const err = e.placeBet(session.playerId, amount, sideBets);
        if (err) return { error: err };
        const r = e.startRound();
        return 'error' in r ? { error: r.error } : {};
      }
      case 'hit':
      case 'stand':
      case 'double':
      case 'split':
      case 'surrender': {
        const r = e.performAction(session.playerId, action as any, Number(data.amount));
        return 'error' in r ? { error: r.error } : {};
      }
      case 'insurance': {
        const wants = Boolean(data.wants);
        const stake = Number(data.amount);
        if (wants) {
          const mainBet = Number(data.mainBet ?? 0);
          const maxInsurance = Math.floor(mainBet / 2);
          const err = e.takeInsurance(session.playerId, Math.min(stake || maxInsurance, maxInsurance));
          if (err) return { error: err };
        } else {
          const err = e.declineInsurance(session.playerId);
          if (err) return { error: err };
        }
        const r = e.finishInsurance();
        return 'error' in r ? { error: r.error } : {};
      }
      case 'even-money': {
        const err = e.takeEvenMoney(session.playerId);
        if (err) return { error: err };
        const r = e.finishInsurance();
        return 'error' in r ? { error: r.error } : {};
      }
      default:
        return { error: 'إجراء غير معروف' };
    }
  }

  if (isThreeCard(e)) {
    switch (action) {
      case 'bet': {
        const err = e.placeWagers((data.wagers as any) ?? {});
        if (err) return { error: err };
        e.deal();
        return {};
      }
      case 'play': {
        const err = e.play();
        return err ? { error: err } : {};
      }
      case 'fold': {
        const err = e.fold();
        return err ? { error: err } : {};
      }
      case 'next': {
        e.newRound();
        return {};
      }
      default:
        return { error: 'إجراء غير معروف' };
    }
  }

  if (isRussian(e)) {
    switch (action) {
      case 'ante': {
        const err = e.placeAnte(Number(data.amount ?? 0));
        if (err) return { error: err };
        e.deal();
        return {};
      }
      case 'bet2x': {
        const err = e.bet2x();
        return err ? { error: err } : {};
      }
      case 'fold': {
        const err = e.fold();
        return err ? { error: err } : {};
      }
      case 'exchange': {
        const err = e.exchange((data.cardIds as string[]) ?? []);
        return err ? { error: err } : {};
      }
      case 'sixth': {
        const err = e.buySixthCard();
        return err ? { error: err } : {};
      }
      case 'insurance': {
        const wants = Boolean(data.wants);
        const err = wants
          ? e.takeInsurance(Number(data.amount ?? 0))
          : e.declineInsurance();
        return err ? { error: err } : {};
      }
      case 'buyDealerCard': {
        const err = e.buyDealerCard();
        return err ? { error: err } : {};
      }
      case 'takeAnte': {
        const err = e.takeAnte();
        return err ? { error: err } : {};
      }
      case 'next': {
        e.newRound();
        return {};
      }
      default:
        return { error: 'إجراء غير معروف' };
    }
  }

  if (isRoulette(e)) {
    switch (action) {
      case 'placeBet': {
        const type = (data.type as any) ?? 'straight';
        const numbers = (data.numbers as number[]) ?? [];
        const amount = Number(data.amount ?? 0);
        const err = e.placeBet(type, numbers, amount);
        return err ? { error: err } : {};
      }
      case 'removeBet': {
        const err = e.removeBet(String(data.betId ?? ''));
        return err ? { error: err } : {};
      }
      case 'clearBets': {
        e.clearBets();
        return {};
      }
      case 'spin': {
        e.spin();
        return {};
      }
      case 'next': {
        e.newRound();
        return {};
      }
      default:
        return { error: 'إجراء غير معروف' };
    }
  }

  return { error: 'إجراء غير معروف' };
}

// ===== ربط المعالجات =====
export function setupSoloGameHandlers(io: Server) {
  io.on('connection', (socket: Socket) => {
    console.log('🎰 Solo player connected:', socket.id);

    socket.on(
      'solo:join',
      async (data: {
        game: SoloGameKind;
        tableId: string;
        playerId?: string;
        name?: string;
      }) => {
        const { game, tableId } = data ?? {};
        if (!game || !['blackjack', 'three-card', 'russian', 'roulette'].includes(game)) return;
        const cleanTableId = String(tableId ?? '').trim().slice(0, 40) || '1';

        const userId: string | null = socket.data.userId ?? null;
        // الهوية الموثّقة أولًا، وللضيف معرّف فريد لكل اتصال (socket.id — لا guest-* مشترك)
        const playerId = userId ?? socket.id;
        const fallbackName = String(data.name ?? '').trim().slice(0, 40) || 'أنت';
        const name = userId ? await loadPlayerDisplayName(userId, fallbackName) : fallbackName;

        // ===== المقاعد المشتركة: حتى 6 لاعبين على نفس الطاولة =====
        const key = soloRoomKey(game, cleanTableId);
        let room = soloTables.get(key);
        if (!room) {
          room = new Map();
          soloTables.set(key, room);
        }
        if (!room.has(socket.id) && room.size >= seatCapFor(game)) {
          socket.emit('error', { code: 'SOLO_TABLE_FULL', message: 'الطاولة ممتلئة' });
          return;
        }

        const prev = sessions.get(socket.id);
        if (prev) sessions.delete(socket.id);

        const balance = await loadPlayerBalance(userId, DEFAULT_BALANCE);
        const shared = game === 'blackjack';

        let engine: SoloEngine;
        if (shared) {
          // بلاك جاك: محرك واحد مشترك لكل الطاولة — ديلر واحد وكل الأيدي ظاهرة
          let bj = blackjackRooms.get(key);
          if (!bj) {
            bj = new BlackjackEngine({ ...DEFAULT_BLACKJACK_CONFIG });
            blackjackRooms.set(key, bj);
          }
          if (!bj.addPlayer(playerId, name, balance)) {
            // إعادة انضمام لنفس المعرّف: مسموح فقط إذا كان جالسًا أصلًا
            const exists = bj.snapshot().players.some((p) => p.id === playerId);
            if (!exists) {
              socket.emit('error', { code: 'SOLO_TABLE_FULL', message: 'الطاولة ممتلئة (6 لاعبين كحد أقصى)' });
              return;
            }
          }
          engine = bj;
        } else {
          engine = createEngine(game, balance, game === 'roulette' ? rouletteMinBet(cleanTableId) : undefined);
          if (isBlackjack(engine)) engine.addPlayer(playerId, name, balance);
        }

        // عودة لاعب غائب (بلاك جاك): استعد مقعده القديم — المحرك ما زال يحتفظ به
        // ونقل startBalance الحقيقي (لا رصيد DB الجديد) حتى تبقى التسوية صحيحة
        let restoredStartBalance: number | null = null;
        if (shared) {
          for (const [oldSid, oldSeat] of Array.from(room.entries())) {
            if (oldSeat.id === playerId && oldSeat.leaving && oldSid !== socket.id) {
              restoredStartBalance = oldSeat.startBalance;
              oldSeat.leaving = false;
              oldSeat.leaveAt = undefined;
              room.delete(oldSid);
              sessions.delete(oldSid);
              break;
            }
          }
        }

        room.set(socket.id, {
          id: playerId,
          name,
          userId,
          startBalance: restoredStartBalance ?? balance,
          lastBets: [],
          autoRebet: false,
        });

        const session: SoloSession = {
          game,
          playerId,
          name,
          userId,
          startBalance: balance,
          settled: false,
          engine,
          roomKey: key,
          shared,
        };
        sessions.set(socket.id, session);

        socket.join(key);
        broadcastSoloPlayers(io, key, room);
        // معرّف المقعد من السيرفر — يستخدمه العميل لتمييز يده
        socket.emit('solo:seat', { playerId });
        socket.emit('solo:state', snapshotOf(session));

        // ===== الروليت: دورة موقّتة مشتركة (تبدأ مع أول لاعب) =====
        if (game === 'roulette') {
          let rState = rouletteRooms.get(key);
          if (!rState) {
            rState = { phase: 'betting', endsAt: 0, countdown: 0, winningNumber: null, timer: null };
            rouletteRooms.set(key, rState);
            startRouletteBetting(io, key, rState);
          } else {
            socket.emit('roulette:room', {
              phase: rState.phase,
              endsAt: rState.endsAt,
              winningNumber: rState.winningNumber,
            });
            broadcastRouletteBets(io, key, room);
          }
        }

        // ===== الدردشة الصوتية: نفس قناة طاولة اللعبة =====
        const voiceChannel = `solo-${game}-${cleanTableId}`;
        socket.emit('voice:token', {
          appId: AGORA_APP_ID,
          channelName: voiceChannel,
          token: generateAgoraToken(voiceChannel, playerId),
        });

        console.log(`🎰 Solo join: ${game} @ ${cleanTableId} (balance=${balance}, seats=${room.size}, shared=${shared})`);
      }
    );

    socket.on(
      'solo:action',
      (data: { playerId?: string; action?: string } & Record<string, unknown>) => {
        const session = sessions.get(socket.id);
        if (!session) return;
        const action = String(data?.action ?? '').slice(0, 30);
        if (!action) return;

        // ===== روليت مشترك: رهان مقفول خارج النافذة، والدوران تلقائي =====
        if (isRoulette(session.engine)) {
          const rState = rouletteRooms.get(session.roomKey);
          // تفعيل/إيقاف إعادة الرهان التلقائي
          if (action === 'autoRebet') {
            const seat = soloTables.get(session.roomKey)?.get(socket.id);
            if (!seat) return;
            seat.autoRebet = Boolean(data.enabled);
            socket.emit('roulette:auto', { enabled: seat.autoRebet });
            return;
          }
          if (action === 'spin') {
            socket.emit('error', { message: 'الدوران تلقائي كل ٣٠ ثانية — لا زر يدوي' });
            return;
          }
          if (rState && rState.phase !== 'betting') {
            socket.emit('error', { message: 'الرهانات مغلقة — انتظر الدورة القادمة' });
            return;
          }
          const result = applyAction(session, action, data ?? {});
          if (result.error) {
            socket.emit('error', { message: result.error });
            return;
          }
          socket.emit('solo:state', snapshotOf(session));
          const room = soloTables.get(session.roomKey);
          if (room) broadcastRouletteBets(io, session.roomKey, room);
          return;
        }

        // ===== بلاك جاك مشترك: معالجة خاصة للتأمين (ينتظر رد الجميع) =====
        if (session.shared && isBlackjack(session.engine)) {
          const e = session.engine;
          const room = soloTables.get(session.roomKey);
          const meta = getRoomMeta(session.roomKey);

          if (action === 'insurance' || action === 'even-money') {
            let err: string | null = null;
            if (action === 'insurance' && !Boolean(data.wants)) {
              err = e.declineInsurance(session.playerId);
            } else if (action === 'insurance') {
              const mainBet = Number(data.mainBet ?? 0);
              const maxInsurance = Math.floor(mainBet / 2);
              err = e.takeInsurance(session.playerId, Math.min(Number(data.amount) || maxInsurance, maxInsurance));
            } else {
              err = e.takeEvenMoney(session.playerId);
            }
            if (err) {
              socket.emit('error', { message: err });
              return;
            }
            meta.insuranceResponded.add(session.playerId);
            // الجميع ردّوا؟ (بحسب لاعبي المحرك الفعليين) → أنهِ التأمين
            if (room && meta.insuranceResponded.size >= e.snapshot().players.length) {
              const r = e.finishInsurance();
              if ('error' in r) {
                socket.emit('error', { message: r.error });
                return;
              }
            }
          } else {
            const result = applyAction(session, action, data ?? {});
            if (result.error) {
              // 'bet' مع بقاء لاعبين لم يراهنوا: ابدأ عداد الـ30 ثانية بدل الخطأ
              const snapNow = e.snapshot();
              const meNow = snapNow.players.find((p) => p.id === session.playerId);
              if (action === 'bet' && snapNow.phase === 'betting' && meNow && meNow.currentBet > 0) {
                startBlackjackCountdown(io, session.roomKey, e, room ?? new Map());
              } else {
                socket.emit('error', { message: result.error });
                return;
              }
            }
          }

          const snap = snapshotOf(session) as BlackjackSnapshot;
          io.to(session.roomKey).emit('solo:state', snap);
          // نهاية الجولة (عادت لمرحلة الرهان) → تسوية أرصدة الجميع
          if (snap.phase === 'betting') {
            if (meta.lastPhase !== 'betting') {
              meta.lastPhase = 'betting';
              meta.insuranceResponded.clear();
              void settleSharedBlackjack(io, session.roomKey, e);
            }
          } else {
            meta.lastPhase = snap.phase;
            if (meta.bjTimer) {
              clearInterval(meta.bjTimer);
              meta.bjTimer = null;
            }
          }
          return;
        }

        // ===== الألعاب الأخرى: تدفق فردي كما كان =====
        const result = applyAction(session, action, data ?? {});

        if (result.error) {
          socket.emit('error', { message: result.error });
          return;
        }

        socket.emit('solo:state', snapshotOf(session));

        if (isSettled(session)) {
          void persistBalance(session);
        }
      }
    );

    // مغادرة/انقطاع: إزالة المقعد + إشعار الباقين
    const removeSoloSeat = (sid: string, explicit = false) => {
      const session = sessions.get(sid);
      if (!session) return;

      const room = soloTables.get(session.roomKey);
      const seat = room?.get(sid);
      if (!room || !seat) {
        sessions.delete(sid);
        return;
      }

      // بلاك جاك مشترك: لا تكسر الجولة الجارية
      if (session.shared && isBlackjack(session.engine)) {
        const e = session.engine;
        const snap = e.snapshot();
        // إن كان دوره: وقوف تلقائي حتى لا تتعطل الجولة
        if ((snap.phase === 'playing' && snap.currentPlayerId === seat.id)) {
          e.performAction(seat.id, 'stand', 0);
        }
        if (snap.phase === 'insurance') {
          e.declineInsurance(seat.id);
          const meta = getRoomMeta(session.roomKey);
          meta.insuranceResponded.add(seat.id);
          if (meta.insuranceResponded.size >= e.snapshot().players.length) {
            e.finishInsurance();
            const s2 = e.snapshot();
            io.to(session.roomKey).emit('solo:state', s2);
            if (s2.phase === 'betting') {
              meta.lastPhase = 'betting';
              void settleSharedBlackjack(io, session.roomKey, e);
            }
          }
        }

        if (explicit) {
          // مغادرة صريحة: إزالة فورية (تُحذف من المحرك نهاية الجولة إن كانت جارية)
          if (snap.phase === 'betting' || snap.phase === 'complete') {
            e.removePlayer(seat.id);
            sessions.delete(sid);
            room.delete(sid);
            broadcastSoloPlayers(io, session.roomKey, room);
          } else {
            seat.leaving = true;
            seat.leaveAt = Date.now(); // يُحذف في أول تسوية
            broadcastSoloPlayers(io, session.roomKey, room);
            return;
          }
        } else {
          // انقطاع: يبقى المقعد 3 دقائق — إن عاد يُستعاد، وإلا يُطرد
          seat.leaving = true;
          seat.leaveAt = Date.now() + BLACKJACK_AFK_MS;
          sessions.delete(sid); // جلسته الحالية تنتهي، لكن المقعد والمحرك يبقيان
          broadcastSoloPlayers(io, session.roomKey, room);
          scheduleBlackjackAfkSweep(io, session.roomKey);
          return;
        }
      }

      // روليت: رهان قائم أو دورة جارية → تبقى دورته حتى التسوية (لا يخسر رهانه)
      if (isRoulette(session.engine)) {
        const rState = rouletteRooms.get(session.roomKey);
        const hasBets = session.engine.snapshot().bets.length > 0;
        const midRound = rState && (rState.phase === 'spinning' || rState.phase === 'result');
        if (midRound || hasBets) {
          seat.leaving = true;
          sessions.delete(sid);
          return; // تُحذف في نهاية التسوية
        }
      }

      sessions.delete(sid);
      room.delete(sid);
      broadcastSoloPlayers(io, session.roomKey, room);
      if (room.size === 0) {
        clearRoomTimers(session.roomKey);
        soloTables.delete(session.roomKey);
        blackjackRooms.delete(session.roomKey);
        soloRoomMeta.delete(session.roomKey);
        rouletteRooms.delete(session.roomKey);
      }
    };

    socket.on('solo:leave', () => removeSoloSeat(socket.id, true));

    socket.on('disconnect', () => {
      console.log('🎰 Solo player disconnected:', socket.id);
      removeSoloSeat(socket.id, false);
    });
  });
}
