// ============================================================
// جرب حظك — REST API (مصادقة JWT عبر Supabase)
// ============================================================

import { Router, Request, Response, NextFunction } from 'express';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { getSupabaseAdmin, verifyUserToken } from '../lib/supabaseAdmin';
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

  // إصدار جلسة حقيقية (access + refresh) — العميل يخزّنها ويرسلها كـ Bearer
  const session = await admin.auth.signInWithPassword({ email, password });
  if (session.error || !session.data.session) {
    console.error('[auth/register] session mint failed:', session.error?.message);
    return res.status(500).json({ error: 'SESSION_FAILED' });
  }

  return res.json({
    userId,
    username,
    displayName,
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

export default router;
