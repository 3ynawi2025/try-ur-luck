// ============================================================
// جرب حظك — REST API (مصادقة JWT عبر Supabase)
// ============================================================

import { Router, Request, Response, NextFunction } from 'express';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { getSupabaseAdmin, createSupabaseAdminClient, verifyUserToken } from '../lib/supabaseAdmin';
import { generateAgoraToken } from '../game/agora';
import { secureRandomInt } from '../game/deck';
import { SupabaseClient } from '@supabase/supabase-js';

const router = Router();

function getAdmin(): SupabaseClient {
  try {
    return getSupabaseAdmin();
  } catch {
    throw new Error('Database not configured');
  }
}

// ===== مصادقة =====

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: { id: string; email?: string };
    }
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = String(req.headers.authorization ?? '');
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) {
    return res.status(401).json({ error: 'UNAUTHORIZED' });
  }
  try {
    const user = await verifyUserToken(token);
    req.user = { id: user.id, email: user.email };
    next();
  } catch {
    return res.status(401).json({ error: 'UNAUTHORIZED' });
  }
}

// تحديد معدل إنشاء الحسابات (حماية من سكوات الأسماء)
const registerAttempts = new Map<string, number[]>();
function registerRateLimited(ip: string): boolean {
  const now = Date.now();
  const window = 10 * 60 * 1000; // 10 دقائق
  const list = (registerAttempts.get(ip) ?? []).filter((t) => now - t < window);
  if (list.length >= 5) return true;
  list.push(now);
  registerAttempts.set(ip, list);
  return false;
}

// إنشاء حساب جديد باسم مستخدم (يمنع التكرار عالمياً عبر قيد فريد في قاعدة البيانات)
router.post('/auth/register', async (req: Request, res: Response) => {
  if (registerRateLimited(String(req.ip ?? 'unknown'))) {
    return res.status(429).json({ error: 'TOO_MANY_REGISTRATIONS' });
  }

  const username = String(req.body?.username ?? '').replace(/^@/, '').trim().toLowerCase();
  const displayName = String(req.body?.displayName ?? '').trim().slice(0, 40) || username;

  if (!/^[a-z0-9_]{3,20}$/.test(username)) {
    return res.status(400).json({ error: 'USERNAME_INVALID' });
  }

  const admin = getAdmin();

  // هوية مجهولة: مستخدم ببريد اصطناعي فريد وكلمة مرور عشوائية (لا يُرسل إليه شيء)
  const email = `u_${randomUUID()}@guest.jarebhazzak.app`;
  const password = randomBytes(18).toString('base64url');

  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (created.error || !created.data.user) {
    console.error('[auth/register] createUser failed:', created.error?.message);
    return res.status(500).json({ error: 'CREATE_USER_FAILED' });
  }

  const userId = created.data.user.id;

  // إنشاء البروفايل المرتبط بالمستخدم
  const { error: profileError } = await admin.from('profiles').insert({
    id: userId,
    username,
    display_name: displayName,
  });

  if (profileError) {
    // تراجع: احذف المستخدم الذي أنشأناه للتو حتى لا يبقى مستخدم بلا بروفايل
    await admin.auth.admin.deleteUser(userId).catch(() => {});

    if (profileError.code === '23505') {
      return res.status(409).json({ error: 'USERNAME_TAKEN' });
    }
    console.error('[auth/register] profile insert failed:', profileError.message);
    return res.status(500).json({ error: 'PROFILE_CREATE_FAILED' });
  }

  // إصدار جلسة حقيقية (access + refresh) — عبر عميل مستقل حتى لا تُثبَّت جلسة
  // المستخدم على العميل الإداري المشترك (كان يحوّل دوره إلى authenticated).
  const authClient = createSupabaseAdminClient();
  const session = await authClient.auth.signInWithPassword({ email, password });
  if (session.error || !session.data.session) {
    console.error('[auth/register] session mint failed:', session.error?.message);
    return res.status(500).json({ error: 'SESSION_FAILED' });
  }

  // ===== دعوة صديق: مكافأة 2000 للطرفين عند تسجيل بمرجع صالح =====
  let inviteBonus = false;
  const ref = String(req.body?.ref ?? '').replace(/^@/, '').trim().toLowerCase();
  if (/^[a-z0-9_]{3,20}$/.test(ref) && ref !== username) {
    const { data: inviter } = await admin
      .from('profiles')
      .select('id, username')
      .eq('username', ref)
      .single();

    if (inviter) {
      // كل مدعو يُحسب مرة واحدة (UNIQUE invitee_id) — أمان ضد ازدواج المكافأة
      const { error: invErr } = await admin.from('invites').insert({
        inviter_id: inviter.id,
        invitee_id: userId,
      });
      if (!invErr) {
        await admin.rpc('apply_balance_delta', { p_user_id: inviter.id, p_delta: 2000 });
        await admin.from('balance_transactions').insert({
          user_id: inviter.id,
          amount: 2000,
          type: 'refill',
          description: `مكافأة دعوة ${username}`,
        });
        await admin.rpc('apply_balance_delta', { p_user_id: userId, p_delta: 2000 });
        await admin.from('balance_transactions').insert({
          user_id: userId,
          amount: 2000,
          type: 'refill',
          description: `مكافأة دعوة ${inviter.username}`,
        });
        inviteBonus = true;
      }
    }
  }

  return res.json({
    userId,
    username,
    displayName,
    inviteBonus,
    session: {
      access_token: session.data.session.access_token,
      refresh_token: session.data.session.refresh_token,
    },
  });
});

// رصيد المستخدم الحالي — يُقرأ من التوكن الموثّق (لا معرّف من العميل)
router.get('/balance', authenticate, async (req: Request, res: Response) => {
  const { data, error } = await getAdmin()
    .from('profiles')
    .select('balance')
    .eq('id', req.user!.id)
    .single();

  if (error || !data) return res.json({ balance: 10000 });
  return res.json({ balance: Number(data.balance ?? 0) });
});

// لوحة المتصدرين — عامة (أسماء + XP فقط، بلا بيانات حساسة)
router.get('/leaderboard', async (_req: Request, res: Response) => {
  const { data, error } = await getAdmin()
    .from('profiles')
    .select('id, username, display_name, avatar_url, user_xp, current_tier')
    .order('user_xp', { ascending: false })
    .limit(50);

  if (error) return res.json([]);
  return res.json(data ?? []);
});

// حالة VIP للمستخدم الحالي (XP + الدرجة)
router.get('/vip-status', authenticate, async (req: Request, res: Response) => {
  const { data, error } = await getAdmin()
    .from('profiles')
    .select('user_xp, current_tier')
    .eq('id', req.user!.id)
    .single();

  if (error || !data) return res.json({ user_xp: 0, current_tier: 'bronze' });
  return res.json({ user_xp: Number(data.user_xp ?? 0), current_tier: data.current_tier ?? 'bronze' });
});

// سجل معاملات المستخدم الحالي (الفلاتر: all / wins / losses / tokens)
router.get('/transactions', authenticate, async (req: Request, res: Response) => {
  let query = getAdmin()
    .from('balance_transactions')
    .select('*')
    .eq('user_id', req.user!.id)
    .order('created_at', { ascending: false })
    .limit(50);

  const filter = String(req.query.filter ?? 'all');
  if (filter === 'wins') query = query.eq('type', 'win');
  else if (filter === 'losses') query = query.eq('type', 'loss');
  else if (filter === 'tokens') query = query.in('type', ['refill', 'ad_reward', 'tournament']);

  const { data, error } = await query;
  if (error) return res.json([]);
  return res.json(data ?? []);
});

// البحث عن لاعبين بالاسم أو اسم المستخدم (يتطلب مصادقة)
router.get('/users/search', authenticate, async (req: Request, res: Response) => {
  const q = String(req.query.q ?? '').trim();
  if (q.length < 1) {
    return res.json([]);
  }

  // تهريب أحرف البدل (LIKE) حتى لا تستغل في البحث، مع إبقاء الشرطة السفلية
  // كحرف حقيقي في اسم المستخدم عبر الهروب بـ \_
  const safe = q.replace(/[\\%_]/g, (ch) => `\\${ch}`).slice(0, 40);

  const admin = getAdmin();
  const { data, error } = await admin
    .from('profiles')
    .select('id, username, display_name, avatar_url')
    .or(`username.ilike.%${safe}%,display_name.ilike.%${safe}%`)
    .order('username')
    .limit(20);

  if (error) {
    console.error('[users/search] failed:', error.message);
    return res.status(500).json({ error: 'SEARCH_FAILED' });
  }

  return res.json(data ?? []);
});

// الحصول على بروفايل المستخدم الحالي
router.get('/profile', authenticate, async (req: Request, res: Response) => {
  const { data, error } = await getAdmin()
    .from('profiles')
    .select('*')
    .eq('id', req.user!.id)
    .single();

  if (error || !data) return res.status(404).json({ error: 'PROFILE_NOT_FOUND' });
  return res.json(data);
});

// قائمة الطاولات (بدون كلمة سر الطاولات الخاصة)
router.get('/tables', authenticate, async (_req: Request, res: Response) => {
  const { data, error } = await getAdmin()
    .from('tables')
    .select(
      'id, game_type, name, min_buy_in, small_blind, big_blind, max_players, is_private, status, created_at, table_players(*)'
    )
    .eq('status', 'waiting')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

// إنشاء طاولة خاصة
router.post('/tables', authenticate, async (req: Request, res: Response) => {
  const { game_type, name, min_buy_in, is_private, password } = req.body ?? {};

  if (game_type !== 'texas_holdem' && game_type !== 'blackjack') {
    return res.status(400).json({ error: 'INVALID_GAME_TYPE' });
  }
  const cleanName = String(name ?? '').trim().slice(0, 40);
  if (!cleanName) return res.status(400).json({ error: 'TABLE_NAME_REQUIRED' });
  const buyIn = Number(min_buy_in);
  if (!Number.isInteger(buyIn) || buyIn <= 0) {
    return res.status(400).json({ error: 'INVALID_MIN_BUY_IN' });
  }

  // كلمة السر تُخزَّن مجزّأة لا نصًا صريحًا
  const hashedPassword = password
    ? createHash('sha256').update(String(password)).digest('hex')
    : null;

  const { data, error } = await getAdmin()
    .from('tables')
    .insert({
      game_type,
      name: cleanName,
      min_buy_in: buyIn,
      is_private: Boolean(is_private),
      password: hashedPassword,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

// ============================================================
// المكافآت اليومية (سلسلة الحضور + عجلة الحظ)
// ============================================================

// حالة المكافآت: السلسلة + هل استُلم اليوم؟ + هل دارت العجلة اليوم؟
router.get('/rewards/status', authenticate, async (req: Request, res: Response) => {
  const { data, error } = await getAdmin()
    .from('profiles')
    .select('daily_streak, last_daily_claim, last_wheel_spin')
    .eq('id', req.user!.id)
    .single();

  if (error || !data) {
    return res.json({ streak: 0, claimedToday: false, wheelSpunToday: false });
  }
  const today = new Date().toISOString().slice(0, 10);
  return res.json({
    streak: Number(data.daily_streak ?? 0),
    claimedToday: data.last_daily_claim === today,
    wheelSpunToday: data.last_wheel_spin === today,
  });
});

// استلام مكافأة الحضور اليومية (RPC ذرّية)
router.post('/rewards/daily', authenticate, async (req: Request, res: Response) => {
  const { data, error } = await getAdmin().rpc('claim_daily_reward', {
    p_user_id: req.user!.id,
  });
  if (error) return res.status(500).json({ error: error.message });
  const row = (data as { awarded: number; streak: number }[])?.[0];
  if (!row) return res.status(500).json({ error: 'CLAIM_FAILED' });
  return res.json({ awarded: Number(row.awarded), streak: Number(row.streak) });
});

// تدوير عجلة الحظ (السيرفر يحسم الجائزة أولًا)
router.post('/rewards/wheel', authenticate, async (req: Request, res: Response) => {
  const { data, error } = await getAdmin().rpc('spin_daily_wheel', {
    p_user_id: req.user!.id,
  });
  if (error) return res.status(500).json({ error: error.message });
  const row = (data as { prize: number }[])?.[0];
  if (!row) return res.status(500).json({ error: 'SPIN_FAILED' });
  return res.json({ prize: Number(row.prize) });
});

// ============================================================
// دعوات الأصدقاء
// ============================================================

// مدعوّو المستخدم الحالي (لشارة السفير والعرض)
router.get('/invites', authenticate, async (req: Request, res: Response) => {
  const { data, error } = await getAdmin()
    .from('invites')
    .select('invitee_id, created_at, profiles!invites_invitee_id_fkey(username, display_name)')
    .eq('inviter_id', req.user!.id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return res.json({ count: 0, invitees: [] });
  return res.json({ count: (data ?? []).length, invitees: data ?? [] });
});

// ============================================================
// المجالس الصوتية
// ============================================================

// رمز مجلس خاص آمن (CSPRNG) — لا Math.random لأسرار الوصول
const genCode = () => String(100000 + secureRandomInt(900000));

// قائمة المجالس العامة النشطة (+ عدد الحضور)، أو البحث برمز غرفة خاصة
router.get('/majlis', authenticate, async (req: Request, res: Response) => {
  const code = String(req.query.code ?? '').trim();
  const admin = getAdmin();

  if (/^\d{6}$/.test(code)) {
    const { data, error } = await admin
      .from('majlis_rooms')
      .select('id, name, is_private, owner_id, active, created_at, majlis_members(count)')
      .eq('code', code)
      .eq('active', true)
      .single();
    if (error || !data) return res.status(404).json({ error: 'MAJLIS_NOT_FOUND' });
    return res.json(data);
  }

  const { data, error } = await admin
    .from('majlis_rooms')
    .select('id, name, is_private, owner_id, active, created_at, majlis_members(count)')
    .eq('is_private', false)
    .eq('active', true)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return res.json([]);
  return res.json(data ?? []);
});

// إنشاء مجلس (خاصة برمز 6 أرقام — عامة بلا رمز)
router.post('/majlis', authenticate, async (req: Request, res: Response) => {
  const name = String(req.body?.name ?? '').trim().slice(0, 40);
  if (!name) return res.status(400).json({ error: 'MAJLIS_NAME_REQUIRED' });
  const isPrivate = Boolean(req.body?.is_private);

  const admin = getAdmin();
  const { data, error } = await admin
    .from('majlis_rooms')
    .insert({
      name,
      is_private: isPrivate,
      code: isPrivate ? genCode() : null,
      owner_id: req.user!.id,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  // المالك عضو تلقائيًا
  await admin
    .from('majlis_members')
    .upsert({ room_id: data.id, user_id: req.user!.id })
    .then(() => {}, () => {});

  return res.json(data);
});

// انضمام لمجلس (بمعرّف أو برمز) — يعيد توكن Agora للقناة
router.post('/majlis/join', authenticate, async (req: Request, res: Response) => {
  const admin = getAdmin();
  const roomId = String(req.body?.roomId ?? '').trim();
  const code = String(req.body?.code ?? '').trim();

  let query = admin.from('majlis_rooms').select('*').eq('active', true);
  if (roomId) query = query.eq('id', roomId);
  else if (/^\d{6}$/.test(code)) query = query.eq('code', code);
  else return res.status(400).json({ error: 'MAJLIS_ID_OR_CODE_REQUIRED' });

  const { data, error } = await query.single();
  if (error || !data) return res.status(404).json({ error: 'MAJLIS_NOT_FOUND' });

  await admin
    .from('majlis_members')
    .upsert({ room_id: data.id, user_id: req.user!.id })
    .then(() => {}, () => {});

  const { data: members, error: memErr } = await admin
    .from('majlis_members')
    .select('user_id, profiles!majlis_members_user_id_fkey(username, display_name)')
    .eq('room_id', data.id)
    .limit(30);

  const token = generateAgoraToken(`majlis-${data.id}`, req.user!.id);

  return res.json({
    room: { id: data.id, name: data.name, is_private: data.is_private, code: data.code, owner_id: data.owner_id },
    members: (memErr ? [] : (members ?? [])).map((m: any) => ({
      userId: m.user_id,
      username: m.profiles?.username ?? '',
      displayName: m.profiles?.display_name ?? 'لاعب',
    })),
    token,
  });
});

// مغادرة مجلس
router.post('/majlis/leave', authenticate, async (req: Request, res: Response) => {
  const roomId = String(req.body?.roomId ?? '').trim();
  if (!roomId) return res.status(400).json({ error: 'MAJLIS_ID_REQUIRED' });
  const { error } = await getAdmin()
    .from('majlis_members')
    .delete()
    .eq('room_id', roomId)
    .eq('user_id', req.user!.id);
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ ok: true });
});

export default router;
