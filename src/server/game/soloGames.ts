// ============================================================
// جرب حظك — Solo Games Socket Layer (Server-authoritative)
// تستضيف ألعاب اللاعب الفردي ضد الموزع على الخادم:
// بلاك جاك، ثلاث أوراق بوكر، البوكر الروسي، الروليت.
// الهوية من توكن السوكت الموثّق (socket.data.userId) —
// لا نثق بأي userId يرسله العميل. حفظ الرصيد ذرّي عبر RPC.
// ============================================================

import { Server, Socket } from 'socket.io';
import { BlackjackEngine, DEFAULT_BLACKJACK_CONFIG } from './blackjack';
import { ThreeCardPokerEngine } from './threeCardPoker';
import { RussianPokerEngine } from './russianPoker';
import { RouletteEngine } from './roulette';
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
}

const DEFAULT_BALANCE = 10_000;

// جلسة واحدة لكل اتصال — اللاعب يواجه الموزع وحده
const sessions = new Map<string, SoloSession>();

/** إحصاءات حية للجلسات الفردية (لمراقبة /diag). */
export function getSoloStats(): { sessions: number } {
  return { sessions: sessions.size };
}

// ===== طاولات فردية مشتركة: حتى 6 لاعبين على نفس الطاولة (كلٌّ ضد الديلر) =====
interface SoloSeat {
  id: string;
  name: string;
  userId: string | null;
}

const soloTables = new Map<string, Map<string, SoloSeat>>(); // solo:<game>:<tableId> -> socketId -> مقعد
const MAX_SOLO_SEATS = 6;

function soloRoomKey(game: SoloGameKind, tableId: string): string {
  return `solo:${game}:${tableId}`;
}

function broadcastSoloPlayers(io: Server, key: string, room: Map<string, SoloSeat>) {
  io.to(key).emit('solo:players', {
    players: Array.from(room.values()).map((s) => ({ id: s.id, name: s.name })),
    count: room.size,
    max: MAX_SOLO_SEATS,
  });
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

function createEngine(game: SoloGameKind, balance: number): SoloEngine {
  switch (game) {
    case 'blackjack':
      return new BlackjackEngine({ ...DEFAULT_BLACKJACK_CONFIG });
    case 'three-card':
      return new ThreeCardPokerEngine(balance);
    case 'russian':
      return new RussianPokerEngine(balance);
    case 'roulette':
      return new RouletteEngine(balance);
  }
}

function snapshotOf(session: SoloSession): unknown {
  return session.engine.snapshot();
}

function currentBalance(session: SoloSession): number {
  const snap: any = session.engine.snapshot();
  if (isBlackjack(session.engine)) {
    return snap.players?.[0]?.balance ?? session.startBalance;
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
        // الهوية الموثّقة أولًا، وللضيف معرّف فريد لكل اتصال (لا guest-* مشترك)
        const guestId = String(data.playerId ?? '').trim().slice(0, 60);
        const playerId = userId ?? (guestId || socket.id);
        const fallbackName = String(data.name ?? '').trim().slice(0, 40) || 'أنت';
        const name = userId ? await loadPlayerDisplayName(userId, fallbackName) : fallbackName;

        // ===== المقاعد المشتركة: حتى 6 لاعبين على نفس الطاولة =====
        const key = soloRoomKey(game, cleanTableId);
        let room = soloTables.get(key);
        if (!room) {
          room = new Map();
          soloTables.set(key, room);
        }
        if (!room.has(socket.id) && room.size >= MAX_SOLO_SEATS) {
          socket.emit('error', { code: 'SOLO_TABLE_FULL', message: 'الطاولة ممتلئة (6 لاعبين كحد أقصى)' });
          return;
        }
        room.set(socket.id, { id: playerId, name, userId });

        const prev = sessions.get(socket.id);
        if (prev) sessions.delete(socket.id);

        const balance = await loadPlayerBalance(userId, DEFAULT_BALANCE);
        const engine = createEngine(game, balance);
        if (isBlackjack(engine)) {
          engine.addPlayer(playerId, name, balance);
        }

        const session: SoloSession = {
          game,
          playerId,
          name,
          userId,
          startBalance: balance,
          settled: false,
          engine,
        };
        sessions.set(socket.id, session);

        socket.join(key);
        broadcastSoloPlayers(io, key, room);
        socket.emit('solo:state', snapshotOf(session));

        // ===== الدردشة الصوتية: نفس قناة طاولة اللعبة =====
        const voiceChannel = `solo-${game}-${cleanTableId}`;
        socket.emit('voice:token', {
          appId: AGORA_APP_ID,
          channelName: voiceChannel,
          token: generateAgoraToken(voiceChannel, playerId),
        });

        console.log(`🎰 Solo join: ${game} @ ${cleanTableId} (balance=${balance}, seats=${room.size})`);
      }
    );

    socket.on(
      'solo:action',
      (data: { playerId?: string; action?: string } & Record<string, unknown>) => {
        const session = sessions.get(socket.id);
        if (!session) return;
        const action = String(data?.action ?? '').slice(0, 30);
        if (!action) return;

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
    const removeSoloSeat = (sid: string) => {
      for (const [key, room] of soloTables) {
        if (room.has(sid)) {
          room.delete(sid);
          broadcastSoloPlayers(io, key, room);
          if (room.size === 0) soloTables.delete(key);
          break;
        }
      }
    };

    socket.on('solo:leave', () => {
      sessions.delete(socket.id);
      removeSoloSeat(socket.id);
    });

    socket.on('disconnect', () => {
      sessions.delete(socket.id);
      removeSoloSeat(socket.id);
      console.log('🎰 Solo player disconnected:', socket.id);
    });
  });
}
