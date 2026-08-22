// ============================================================
// جرب حظك — Socket.io Game Server (Texas Hold'em متعدد اللاعبين)
//
// الهوية من توكن السوكت الموثّق (socket.data.userId) — لا نثق
// بمعرّف يرسله العميل. الرصيد يُحمَّل من Supabase عند الانضمام
// وتُحفظ نتائج كل يد ذرّيًا عبر apply_balance_delta.
// ============================================================

import { Server, Socket } from 'socket.io';
import { TexasHoldemEngine } from '../game/texasHoldem';
import { generateAgoraToken, AGORA_APP_ID } from '../game/agora';
import { getSupabaseAdmin } from '../lib/supabaseAdmin';

interface TableSeat {
  id: string; // معرّف اللاعب داخل المحرك
  name: string;
  userId: string | null; // معرف Supabase الموثّق (null = ضيف)
  startBalance: number; // الرصيد عند الانضمام — أساس حساب دلتا اليد
  persisting: boolean; // منع تسوية مزدوجة لنفس اللحظة (سباق إيداع متكرر)
}

interface TableRoom {
  engine: TexasHoldemEngine;
  players: Map<string, TableSeat>; // socketId -> seat
  autoStartTimer?: NodeJS.Timeout;
}

const tables = new Map<string, TableRoom>();
const MAX_TABLES = 200; // حماية من إنشاء غرف لا نهائي (DoS)
const TABLE_BUYIN = 10_000;

const CHAT_REPORT_REASONS = ['voice_abuse', 'cheating', 'offensive_language', 'harassment', 'spam'];

function getOrCreateTable(tableId: string): TableRoom | null {
  if (!tableId || tableId.length > 64) return null;
  const existing = tables.get(tableId);
  if (existing) return existing;
  if (tables.size >= MAX_TABLES) return null;

  const room: TableRoom = {
    engine: new TexasHoldemEngine({
      maxPlayers: 6,
      smallBlind: 10,
      bigBlind: 20,
      minBuyIn: 500,
    }),
    players: new Map(),
  };
  tables.set(tableId, room);
  return room;
}

function removeRoomIfEmpty(tableId: string, table: TableRoom) {
  if (table.players.size === 0) {
    if (table.autoStartTimer) clearTimeout(table.autoStartTimer);
    tables.delete(tableId);
    console.log(`🧹 Table ${tableId} removed (empty)`);
  }
}

async function loadBalanceFor(userId: string | null, fallback: number): Promise<number> {
  if (!userId) return fallback;
  try {
    const { data } = await getSupabaseAdmin()
      .from('profiles')
      .select('balance')
      .eq('id', userId)
      .single();
    if (data && typeof data.balance === 'number') return Math.max(0, data.balance);
  } catch {
    /* ignore */
  }
  return fallback;
}

async function loadDisplayName(userId: string | null, fallback: string): Promise<string> {
  if (!userId) return fallback;
  try {
    const { data } = await getSupabaseAdmin()
      .from('profiles')
      .select('display_name')
      .eq('id', userId)
      .single();
    if (data?.display_name) return String(data.display_name).slice(0, 40);
  } catch {
    /* ignore */
  }
  return fallback;
}

/** حفظ دلتا رصيد اللاعب في Supabase بذرّية (عبارة واحدة). يعيد true عند النجاح فقط. */
async function persistSeatDelta(seat: TableSeat, engineBalance: number): Promise<boolean> {
  if (!seat.userId) return true;
  // منع التسوية المزدوجة لنفس اللحظة (كانت startBalance تتحدث بعد await فقط)
  if (seat.persisting) return false;
  const delta = Math.round(engineBalance) - Math.round(seat.startBalance);
  if (delta === 0) return true;
  seat.persisting = true;
  try {
    const sb = getSupabaseAdmin();
    const { error } = await sb.rpc('apply_balance_delta', {
      p_user_id: seat.userId,
      p_delta: delta,
    });
    if (error) throw error;
    await sb.from('balance_transactions').insert({
      user_id: seat.userId,
      amount: delta,
      type: delta > 0 ? 'win' : 'loss',
      description: 'طاولة بوكر',
    });
    seat.startBalance = engineBalance; // يحدَّث فورًا — الدلتا التالية تبدأ من هنا
    return true;
  } catch (e) {
    console.error('[poker] persistSeatDelta failed:', (e as Error).message);
    return false; // يبقى startBalance كما هو ليُعاد حساب الدلتا المتراكمة لاحقًا
  } finally {
    seat.persisting = false;
  }
}

/** تسوية كل مقاعد الطاولة (تُستدعى عند نهاية يد أو مغادرة أو انقطاع). */
function settleRoom(io: Server, tableId: string, table: TableRoom) {
  const snapshot = table.engine.snapshot();
  for (const [, seat] of table.players) {
    const p = snapshot.players.find((sp) => sp.id === seat.id);
    if (p) void persistSeatDelta(seat, p.balance);
  }
}

function broadcastState(io: Server, tableId: string, table: TableRoom) {
  const snapshot = table.engine.snapshot();

  // إرسال أوراق كل لاعب له وحده
  for (const [socketId, player] of table.players) {
    const sock = io.sockets.sockets.get(socketId);
    if (sock) {
      const holes = table.engine.getHoleCards(player.id);
      sock.emit('game:holeCards', { cards: holes });
    }
  }

  // بث حالة الطاولة بدون أوراق
  io.to(tableId).emit('table:state', {
    ...snapshot,
    holeCards: null,
  });
}

export function setupGameHandlers(io: Server) {
  io.on('connection', (socket: Socket) => {
    console.log('🎮 Player connected:', socket.id);

    // ===== Join Table =====
    socket.on('table:join', async (data: { tableId?: string; name?: string } | undefined) => {
      const tableId = String(data?.tableId ?? '').trim();
      const table = getOrCreateTable(tableId);
      if (!table) {
        socket.emit('error', { message: 'طاولة غير صالحة' });
        return;
      }

      // الهوية من التوكن الموثّق — لا من العميل
      const userId: string | null = socket.data.userId ?? null;
      const playerId = userId ?? socket.id;
      const fallbackName = String(data?.name ?? '').trim().slice(0, 40) || 'لاعب';
      const name = await loadDisplayName(userId, fallbackName);

      // منع انضمام نفس السوكت مرتين لنفس الطاولة
      if (table.players.has(socket.id)) return;

      const dbBalance = await loadBalanceFor(userId, TABLE_BUYIN);
      const stack = Math.min(dbBalance, TABLE_BUYIN);
      if (stack < 500) {
        socket.emit('error', { message: 'رصيدك غير كافٍ للجلوس (الحد الأدنى 500)' });
        return;
      }

      const seat: TableSeat = { id: playerId, name, userId, startBalance: stack, persisting: false };

      // addPlayer يفشل إذا كان اللاعب موجودًا مسبقًا (إعادة انضمام) — نسمح بذلك
      table.engine.addPlayer(playerId, name, stack);
      table.players.set(socket.id, seat);
      socket.join(tableId);

      // يعرّف الخادم اللاعب بمعرّف مقعده الفعلي — يستخدمه العميل في إجراءاته
      socket.emit('table:seat', { playerId });

      socket.to(tableId).emit('table:notice', {
        text: `انضم ${name} إلى الطاولة`,
      });

      const holeCards = table.engine.getHoleCards(playerId);
      socket.emit('game:holeCards', { cards: holeCards });
      broadcastState(io, tableId, table);

      // توكن Agora للدردشة الصوتية
      const agoraToken = generateAgoraToken(tableId, playerId);
      socket.emit('voice:token', {
        appId: AGORA_APP_ID,
        channelName: tableId,
        token: agoraToken,
      });

      // بدء تلقائي عند اكتمال العدد
      if (table.engine.canStart() && !table.autoStartTimer) {
        io.to(tableId).emit('table:notice', {
          text: 'اكتمل العدد — ستبدأ الجولة خلال ثوانٍ',
        });
        table.autoStartTimer = setTimeout(() => {
          if (tables.get(tableId) !== table) return; // أُزيلت الغرفة
          const result = table.engine.startHand();
          if (!('error' in result)) {
            broadcastState(io, tableId, table);
          }
          table.autoStartTimer = undefined;
        }, 5000);
      }
    });

    // ===== Leave Table =====
    socket.on('table:leave', (data: { tableId?: string } | undefined) => {
      const tableId = String(data?.tableId ?? '');
      const table = tables.get(tableId);
      if (!table) return;
      const seat = table.players.get(socket.id);
      if (!seat) return;

      table.engine.removePlayer(seat.id);
      table.players.delete(socket.id);
      socket.leave(tableId);
      settleRoom(io, tableId, table);
      broadcastState(io, tableId, table);
      removeRoomIfEmpty(tableId, table);
    });

    // ===== Game Action (تحقق من ملكية المقعد) =====
    socket.on(
      'game:action',
      (data: {
        tableId?: string;
        playerId?: string;
        action?: string;
        amount?: unknown;
      }) => {
        const tableId = String(data?.tableId ?? '');
        const table = tables.get(tableId);
        if (!table) return;

        const seat = table.players.get(socket.id);
        if (!seat || seat.id !== data?.playerId) {
          socket.emit('error', { message: 'لست صاحب هذا المقعد' });
          return;
        }

        const action = data.action;
        if (!['fold', 'check', 'call', 'raise', 'all_in', 'bet'].includes(String(action))) {
          socket.emit('error', { message: 'إجراء غير معروف' });
          return;
        }

        const amount = data.amount === undefined ? undefined : Number(data.amount);
        if (amount !== undefined && (!Number.isFinite(amount) || amount < 0)) {
          socket.emit('error', { message: 'مبلغ غير صالح' });
          return;
        }

        const result = table.engine.performAction(seat.id, action as any, amount);

        if ('error' in result) {
          socket.emit('error', { message: result.error });
          return;
        }

        broadcastState(io, tableId, table);

        // إذا انتهت اليد: تسوية الأرصدة ثم بدء اليد التالية
        if (result.phase === 'showdown') {
          settleRoom(io, tableId, table);
          setTimeout(() => {
            if (tables.get(tableId) !== table) return;
            const startResult = table.engine.startHand();
            if (!('error' in startResult)) {
              broadcastState(io, tableId, table);
            }
          }, 5000);
        }
      }
    );

    // ===== Chat (حد معدل + حد طول + الاسم من المقعد لا من العميل) =====
    let lastChatAt = 0;
    socket.on('chat:message', (data: { tableId?: string; text?: string }) => {
      const now = Date.now();
      if (now - lastChatAt < 600) return; // رسالة كل 600ms كحد أقصى
      lastChatAt = now;

      const tableId = String(data?.tableId ?? '');
      const table = tables.get(tableId);
      if (!table) return;
      const seat = table.players.get(socket.id);
      if (!seat) return;

      const text = String(data?.text ?? '')
        .replace(/[\u0000-\u001f\u007f]/g, '')
        .trim()
        .slice(0, 200);
      if (!text) return;

      io.to(tableId).emit('chat:message', {
        tableId,
        playerId: seat.id,
        name: seat.name,
        text,
      });
    });

    // ===== Report (يُحفظ في قاعدة البيانات) =====
    socket.on(
      'player:report',
      async (data: { reportedId?: string; reason?: string } | undefined) => {
        if (!socket.data.userId) {
          socket.emit('error', { message: 'سجّل الدخول للإبلاغ' });
          return;
        }
        const reportedId = String(data?.reportedId ?? '');
        const reason = String(data?.reason ?? '');
        if (!reportedId || !CHAT_REPORT_REASONS.includes(reason)) {
          socket.emit('error', { message: 'بلاغ غير صالح' });
          return;
        }
        try {
          const sb = getSupabaseAdmin();
          await sb.from('reports').insert({
            reporter_id: socket.data.userId,
            reported_id: reportedId,
            reason,
          });
          socket.emit('table:notice', { text: 'تم استلام البلاغ' });
        } catch (e) {
          console.error('[poker] report failed:', (e as Error).message);
          socket.emit('error', { message: 'تعذّر إرسال البلاغ' });
        }
      }
    );

    // ===== Disconnect =====
    socket.on('disconnect', () => {
      console.log('🎮 Player disconnected:', socket.id);
      for (const [tableId, table] of tables) {
        const seat = table.players.get(socket.id);
        if (seat) {
          table.engine.removePlayer(seat.id);
          table.players.delete(socket.id);
          settleRoom(io, tableId, table);
          broadcastState(io, tableId, table);
          removeRoomIfEmpty(tableId, table);
        }
      }
    });
  });
}
