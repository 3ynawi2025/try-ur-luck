// ============================================================
// جرب حظك — REST API (مصادقة JWT عبر Supabase)
// ============================================================

import { Router, Request, Response, NextFunction } from 'express';
import { randomBytes, randomUUID } from 'node:crypto';
import { getSupabaseAdmin, createSupabaseAdminClient, verifyUserToken } from '../lib/supabaseAdmin';
import { generateAgoraToken } from '../game/agora';
import { secureRandomInt } from '../game/deck';
import { hashTablePassword } from '../lib/tablePassword';
import { getTierInfo, activateGold } from '../lib/tier';
import { applyBalanceDelta } from '../lib/playerPersistence';
import { getLiveSoloCounts, getSoloStats } from '../game/soloGames';
import { getHoldemCounts, getTableStats } from '../game/gameServer';
import { isUserOnline, onlineUsersCount, totalSocketCount } from '../lib/presence';
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
      user?: { id: string; email?: string; status?: 'active' | 'muted' | 'banned' };
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

    // حالة الحساب من قاعدة البيانات (مرة واحدة لكل طلب) — كتم/حظر
    let status: 'active' | 'muted' | 'banned' = 'active';
    try {
      const { data } = await getAdmin()
        .from('profiles')
        .select('status')
        .eq('id', user.id)
        .single();
      if (data?.status === 'muted' || data?.status === 'banned') status = data.status;
    } catch {
      /* بدون بروفايل → نعامل الحساب كـ active */
    }

    if (status === 'banned') {
      return res.status(403).json({ error: 'ACCOUNT_BANNED', message: 'تم حظر حسابك' });
    }
    req.user.status = status;
    next();
  } catch {
    return res.status(401).json({ error: 'UNAUTHORIZED' });
  }
}

/** مصادقة المدير: مستخدم موثّق + is_admin في قاعدة البيانات. */
export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user?.id) return res.status(401).json({ error: 'UNAUTHORIZED' });
  try {
    const { data } = await getAdmin()
      .from('profiles')
      .select('is_admin')
      .eq('id', req.user.id)
      .single();
    if (!data?.is_admin) return res.status(403).json({ error: 'ADMIN_ONLY' });
    next();
  } catch {
    return res.status(403).json({ error: 'ADMIN_ONLY' });
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

// تحديد معدل محاولات تسجيل الدخول الفاشلة (حماية من تخمين كلمات المرور)
const loginFailures = new Map<string, number[]>();
function loginRateLimited(ip: string): boolean {
  const now = Date.now();
  const window = 10 * 60 * 1000; // 10 دقائق
  const list = (loginFailures.get(ip) ?? []).filter((t) => now - t < window);
  return list.length >= 10;
}
function recordLoginFailure(ip: string): void {
  const now = Date.now();
  const window = 10 * 60 * 1000;
  const list = (loginFailures.get(ip) ?? []).filter((t) => now - t < window);
  list.push(now);
  loginFailures.set(ip, list);
}

// إنشاء حساب جديد باسم مستخدم (يمنع التكرار عالمياً عبر قيد فريد في قاعدة البيانات)
router.post('/auth/register', async (req: Request, res: Response) => {
  if (registerRateLimited(String(req.ip ?? 'unknown'))) {
    return res.status(429).json({ error: 'TOO_MANY_REGISTRATIONS' });
  }

  const username = String(req.body?.username ?? '').replace(/^@/, '').trim().toLowerCase();
  const displayName = String(req.body?.displayName ?? '').trim().slice(0, 40) || username;
  const passwordRaw = String(req.body?.password ?? '');

  if (!/^[a-z0-9_]{3,20}$/.test(username)) {
    return res.status(400).json({ error: 'USERNAME_INVALID' });
  }

  // توافق خلفي: العملاء القدامى (قبل وصول تحديث OTA) يسجّلون بدون كلمة مرور —
  // نولّد لهم كلمة مرور عشوائية كما كان النظام القديم، وجلساتهم تبقى تعمل.
  // العملاء الجدد يُلزمون بكلمة مرور ≥ 6 أحرف من واجهتهم، وإذا أرسلوها أقصر نرفض.
  let password: string;
  let legacy = false;
  if (!passwordRaw) {
    password = randomBytes(18).toString('base64url');
    legacy = true;
  } else if (passwordRaw.length < 6) {
    return res.status(400).json({ error: 'PASSWORD_TOO_SHORT' });
  } else {
    password = passwordRaw;
  }

  const admin = getAdmin();

  // هوية مجهولة: مستخدم ببريد اصطناعي فريد (لا يُرسل إليه شيء) + كلمة مرور المستخدم الحقيقية
  const email = `u_${randomUUID()}@guest.jarebhazzak.app`;

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

  // إنشاء البروفايل المرتبط بالمستخدم (يُخزَّن البريد الاصطناعي لتمكين تسجيل الدخول لاحقًا —
  // الحسابات القديمة المولّدة بكلمة مرور عشوائية تُترك auth_email فارغة حتى تعيّن كلمة مرور)
  const { error: profileError } = await admin.from('profiles').insert({
    id: userId,
    username,
    display_name: displayName,
    ...(legacy ? {} : { auth_email: email }),
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

// تسجيل الدخول باسم المستخدم وكلمة المرور — يعمل بعد إعادة التثبيت أو على جهاز آخر
router.post('/auth/login', async (req: Request, res: Response) => {
  const ip = String(req.ip ?? 'unknown');
  if (loginRateLimited(ip)) {
    return res.status(429).json({ error: 'LOGIN_RATE_LIMITED' });
  }

  const username = String(req.body?.username ?? '').replace(/^@/, '').trim().toLowerCase();
  const password = String(req.body?.password ?? '');

  if (!/^[a-z0-9_]{3,20}$/.test(username)) {
    return res.status(400).json({ error: 'USERNAME_INVALID' });
  }
  if (!password) {
    return res.status(400).json({ error: 'PASSWORD_REQUIRED' });
  }

  const admin = getAdmin();

  // البحث عن الحساب → البريد الاصطناعي المُخزَّن في البروفايل
  const { data: profile } = await admin
    .from('profiles')
    .select('id, username, display_name, auth_email')
    .eq('username', username)
    .maybeSingle();

  // حسابات قديمة بلا كلمة مرور (auth_email = null) لا يمكنها تسجيل الدخول
  // حتى تعيّن كلمة مرور من داخل الإعدادات — جلساتها المحفوظة تبقى تعمل.
  if (!profile?.auth_email) {
    return res.status(404).json({ error: 'USER_NOT_FOUND' });
  }

  // عميل مستقل حتى لا تثبت جلسة المستخدم على العميل الإداري المشترك
  const authClient = createSupabaseAdminClient();
  const session = await authClient.auth.signInWithPassword({
    email: profile.auth_email,
    password,
  });

  if (session.error || !session.data.session) {
    recordLoginFailure(ip);
    return res.status(401).json({ error: 'WRONG_PASSWORD' });
  }

  return res.json({
    userId: profile.id,
    username: profile.username,
    displayName: profile.display_name ?? profile.username,
    session: {
      access_token: session.data.session.access_token,
      refresh_token: session.data.session.refresh_token,
    },
  });
});

// تعيين/تغيير كلمة المرور لحساب قائم (للحسابات القديمة التي أُنشئت بدون كلمة مرور)
router.post('/auth/set-password', authenticate, async (req: Request, res: Response) => {
  const password = String(req.body?.password ?? '');
  if (password.length < 6) {
    return res.status(400).json({ error: 'PASSWORD_TOO_SHORT' });
  }

  const admin = getAdmin();
  const { error } = await admin.auth.admin.updateUserById(req.user!.id, { password });
  if (error) {
    console.error('[auth/set-password] updateUserById failed:', error.message);
    return res.status(500).json({ error: 'SET_PASSWORD_FAILED' });
  }

  // تثبيت البريد الاصطناعي في البروفايل حتى يعمل تسجيل الدخول لاحقًا
  if (req.user?.email) {
    await admin
      .from('profiles')
      .update({ auth_email: req.user.email })
      .eq('id', req.user!.id)
      .then(() => {}, () => {});
  }

  return res.json({ ok: true });
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

// مرتبة المستخدم الحالي في المتصدرين (عدد من يسبقه بـ XP + 1)
router.get('/rank', authenticate, async (req: Request, res: Response) => {
  const { data: me, error } = await getAdmin()
    .from('profiles')
    .select('user_xp')
    .eq('id', req.user!.id)
    .single();
  if (error || !me) return res.json({ rank: null });

  const { count } = await getAdmin()
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .gt('user_xp', Number(me.user_xp ?? 0));
  return res.json({ rank: (count ?? 0) + 1 });
});

// حذف الحساب نهائيًا من داخل التطبيق (متطلب App Store 5.1.1(v))
// حذف auth.user يحذف البروفايل وكل ما يرتبط به تلقائيًا (ON DELETE CASCADE)
router.delete('/account', authenticate, async (req: Request, res: Response) => {
  const admin = getAdmin();
  const { error } = await admin.auth.admin.deleteUser(req.user!.id);
  if (error) return res.status(500).json({ error: 'DELETE_FAILED', message: error.message });
  return res.json({ ok: true });
});

// ============================================================
// المتجر والاشتراك الذهبي
// ============================================================

// حالة اشتراك المستخدم الحالي
router.get('/store/status', authenticate, async (req: Request, res: Response) => {
  const info = await getTierInfo(req.user!.id);
  return res.json(info);
});

// تفعيل الاشتراك الذهبي (شهر)
// ⚠️ نسخة تجريبية: لا يوجد مزود دفع بعد — عند الربط يجب تأكيد الدفع قبل الاستدعاء
router.post('/store/activate', authenticate, async (req: Request, res: Response) => {
  try {
    const info = await activateGold(req.user!.id);
    return res.json(info);
  } catch (e) {
    return res.status(500).json({ error: (e as Error).message });
  }
});

// ============================================================
// لوحة المدير (هدايا وجوائز من مدير اللعبة)
// ============================================================

// بحث عن لاعب بالاسم (لإرسال هدية)
router.get('/admin/users', authenticate, requireAdmin, async (req: Request, res: Response) => {
  const q = String(req.query.q ?? '').trim().slice(0, 30);
  if (!q) return res.json([]);
  const { data, error } = await getAdmin()
    .from('profiles')
    .select('id, username, display_name, balance, tier')
    .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data ?? []);
});

// إرسال هدية رقاقات للاعب (من المدير فقط)
router.post('/admin/gift', authenticate, requireAdmin, async (req: Request, res: Response) => {
  const userId = String(req.body?.userId ?? '');
  const amount = Math.round(Number(req.body?.amount ?? 0));
  const description = String(req.body?.description ?? '').trim().slice(0, 80) || 'هدية من إدارة اللعبة 🎁';

  if (!userId) return res.status(400).json({ error: 'USER_REQUIRED' });
  if (!Number.isInteger(amount) || amount <= 0 || amount > 1_000_000) {
    return res.status(400).json({ error: 'INVALID_AMOUNT', message: 'المبلغ يجب أن يكون بين 1 و 1,000,000' });
  }

  // تحقق من وجود اللاعب (يمنع الهدايا لمعرفات وهمية)
  const { data: target, error: findErr } = await getAdmin()
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .single();
  if (findErr || !target) return res.status(404).json({ error: 'USER_NOT_FOUND' });

  try {
    await applyBalanceDelta(userId, amount, description, 'gift');
    return res.json({ ok: true, amount });
  } catch (e) {
    return res.status(500).json({ error: (e as Error).message });
  }
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

  // حالة الاتصال الحية لكل نتيجة
  const withPresence = (data ?? []).map((u: any) => ({
    ...u,
    online: isUserOnline(String(u.id)),
  }));
  return res.json(withPresence);
});

// ============================================================
// الأصدقاء (طلبات وعلاقات حقيقية عبر قاعدة البيانات)
// ============================================================

// قائمة أصدقائي مع حالة الاتصال
router.get('/friends', authenticate, async (req: Request, res: Response) => {
  const admin = getAdmin();
  const { data, error } = await admin
    .from('friendships')
    .select('friend_id, profiles!friendships_friend_id_fkey(id, username, display_name, avatar_url, tier)')
    .eq('user_id', req.user!.id);

  if (error) return res.status(500).json({ error: error.message });
  const friends = (data ?? []).map((f: any) => {
    const p = f.profiles;
    return {
      id: p?.id,
      username: p?.username ?? '',
      displayName: p?.display_name ?? '',
      avatarUrl: p?.avatar_url ?? null,
      tier: p?.tier ?? 'regular',
      online: isUserOnline(String(p?.id ?? '')),
    };
  });
  return res.json(friends);
});

// طلبات الصداقة الواردة (معلقة)
router.get('/friends/requests', authenticate, async (req: Request, res: Response) => {
  const admin = getAdmin();
  const { data, error } = await admin
    .from('friend_requests')
    .select('id, sender_id, created_at, profiles!friend_requests_sender_id_fkey(username, display_name, avatar_url)')
    .eq('receiver_id', req.user!.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  return res.json(
    (data ?? []).map((r: any) => ({
      id: r.id,
      username: r.profiles?.username ?? '',
      displayName: r.profiles?.display_name ?? '',
      avatarUrl: r.profiles?.avatar_url ?? null,
    }))
  );
});

// إرسال طلب صداقة (المرسِل من auth.uid داخل الدالة — لا يمكن انتحال غيره)
// يقبل اسم المستخدم أو معرّف المستخدم مباشرة (من الطاولة نعرف المعرّف فقط)
router.post('/friends/request', authenticate, async (req: Request, res: Response) => {
  const username = String(req.body?.username ?? '').replace(/^@/, '').trim().toLowerCase();
  const userId = String(req.body?.user_id ?? '').trim();

  if (!/^[a-z0-9_]{3,20}$/.test(username) && !/^[0-9a-f-]{36}$/.test(userId)) {
    return res.status(400).json({ error: 'INVALID_TARGET' });
  }
  const admin = getAdmin();
  let query = admin.from('profiles').select('id');
  if (/^[0-9a-f-]{36}$/.test(userId)) query = query.eq('id', userId);
  else query = query.eq('username', username);
  const { data: target } = await query.single();
  if (!target) return res.status(404).json({ error: 'USER_NOT_FOUND' });

  // منع طلبات الصداقة إذا حظر أحد الطرفين الآخر (كلا الاتجاهين)
  const { data: blocked } = await admin
    .from('blocked_users')
    .select('blocker_id')
    .or(`and(blocker_id.eq.${req.user!.id},blocked_id.eq.${target.id}),and(blocker_id.eq.${target.id},blocked_id.eq.${req.user!.id})`)
    .limit(1);
  if (blocked && blocked.length > 0) {
    return res.status(403).json({ error: 'BLOCKED', message: 'محظور' });
  }

  const { error } = await admin.rpc('send_friend_request', { to_user: target.id });
  if (error) {
    // رسائل الدالة العربية: علاقة سابقة / إضافة النفس / طلب معلق
    return res.status(400).json({ error: 'REQUEST_FAILED', message: String(error.message) });
  }
  return res.json({ ok: true });
});

// قبول طلب صداقة (RPC محمية: المستقبِل فقط)
router.post('/friends/accept', authenticate, async (req: Request, res: Response) => {
  const requestId = String(req.body?.request_id ?? '');
  if (!requestId) return res.status(400).json({ error: 'REQUEST_ID_REQUIRED' });
  const { error } = await getAdmin().rpc('accept_friend_request', { request_id: requestId });
  if (error) return res.status(400).json({ error: 'ACCEPT_FAILED', message: String(error.message) });
  return res.json({ ok: true });
});

// رفض طلب صداقة (المستقبِل فقط)
router.post('/friends/reject', authenticate, async (req: Request, res: Response) => {
  const requestId = String(req.body?.request_id ?? '');
  if (!requestId) return res.status(400).json({ error: 'REQUEST_ID_REQUIRED' });
  const { error } = await getAdmin()
    .from('friend_requests')
    .update({ status: 'declined', responded_at: new Date().toISOString() })
    .eq('id', requestId)
    .eq('receiver_id', req.user!.id);
  if (error) return res.status(400).json({ error: 'REJECT_FAILED', message: error.message });
  return res.json({ ok: true });
});

// إزالة صديق (الاتجاهان)
router.post('/friends/remove', authenticate, async (req: Request, res: Response) => {
  const friendId = String(req.body?.friend_id ?? '');
  if (!friendId) return res.status(400).json({ error: 'FRIEND_ID_REQUIRED' });
  const admin = getAdmin();
  const { error } = await admin
    .from('friendships')
    .delete()
    .or(`and(user_id.eq.${req.user!.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${req.user!.id})`);
  if (error) return res.status(400).json({ error: 'REMOVE_FAILED', message: error.message });
  return res.json({ ok: true });
});

// ============================================================
// الإشراف: البلاغات والحجب (توجيه App Store 1.2 — محتوى المستخدمين)
// ============================================================

const REPORT_REASONS = ['voice_abuse', 'harassment', 'offensive_language', 'cheating', 'spam'];

// إرسال بلاغ عن لاعب (إساءة صوتية/نصية/غش)
router.post('/reports', authenticate, async (req: Request, res: Response) => {
  const targetId = String(req.body?.target_id ?? '').trim();
  const reason = String(req.body?.reason ?? '').trim();

  if (!/^[0-9a-f-]{36}$/.test(targetId)) {
    return res.status(400).json({ error: 'INVALID_TARGET' });
  }
  if (targetId === req.user!.id) {
    return res.status(400).json({ error: 'SELF_REPORT', message: 'لا يمكنك الإبلاغ عن نفسك' });
  }
  if (!REPORT_REASONS.includes(reason)) {
    return res.status(400).json({ error: 'INVALID_REASON' });
  }

  const { data: target } = await getAdmin()
    .from('profiles')
    .select('id')
    .eq('id', targetId)
    .maybeSingle();
  if (!target) return res.status(404).json({ error: 'USER_NOT_FOUND' });

  const { error } = await getAdmin().from('reports').insert({
    reporter_id: req.user!.id,
    reported_id: targetId,
    reason,
    status: 'pending',
  });
  if (error) {
    console.error('[reports] insert failed:', error.message);
    return res.status(500).json({ error: 'REPORT_FAILED' });
  }
  return res.json({ ok: true });
});

// حجب لاعب (يمنع طلبات الصداقة والتواصل)
router.post('/block', authenticate, async (req: Request, res: Response) => {
  const targetId = String(req.body?.target_id ?? '').trim();
  if (!/^[0-9a-f-]{36}$/.test(targetId)) {
    return res.status(400).json({ error: 'INVALID_TARGET' });
  }
  if (targetId === req.user!.id) {
    return res.status(400).json({ error: 'SELF_BLOCK', message: 'لا يمكنك حجب نفسك' });
  }

  const admin = getAdmin();
  const { data: target } = await admin
    .from('profiles')
    .select('id')
    .eq('id', targetId)
    .maybeSingle();
  if (!target) return res.status(404).json({ error: 'USER_NOT_FOUND' });

  const { error } = await admin.from('blocked_users').insert({
    blocker_id: req.user!.id,
    blocked_id: targetId,
  });
  if (error && error.code !== '23505') {
    console.error('[block] insert failed:', error.message);
    return res.status(500).json({ error: 'BLOCK_FAILED' });
  }
  return res.json({ ok: true });
});

// إلغاء حجب لاعب
router.post('/unblock', authenticate, async (req: Request, res: Response) => {
  const targetId = String(req.body?.target_id ?? '').trim();
  if (!targetId) return res.status(400).json({ error: 'INVALID_TARGET' });

  const { error } = await getAdmin()
    .from('blocked_users')
    .delete()
    .eq('blocker_id', req.user!.id)
    .eq('blocked_id', targetId);
  if (error) {
    console.error('[unblock] delete failed:', error.message);
    return res.status(500).json({ error: 'UNBLOCK_FAILED' });
  }
  return res.json({ ok: true });
});

// البلاغات المفتوحة (للوحة المدير) — مقرونة بمعلومات المُبلِّغ والمُبلَّغ عنه
router.get('/admin/reports', authenticate, requireAdmin, async (_req: Request, res: Response) => {
  const { data, error } = await getAdmin()
    .from('reports')
    .select(
      'id, reason, status, created_at, reporter_id, reported_id, ' +
        'reporter:profiles!reports_reporter_id_fkey(username, display_name), ' +
        'reported:profiles!reports_reported_id_fkey(username, display_name)'
    )
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('[admin/reports] failed:', error.message);
    return res.status(500).json({ error: error.message });
  }

  return res.json(
    (data ?? []).map((r: any) => ({
      id: r.id,
      reason: r.reason,
      status: r.status,
      createdAt: r.created_at,
      reporter: {
        id: r.reporter_id,
        username: r.reporter?.username ?? '',
        displayName: r.reporter?.display_name ?? '',
      },
      reported: {
        id: r.reported_id,
        username: r.reported?.username ?? '',
        displayName: r.reported?.display_name ?? '',
      },
    }))
  );
});

// إجراء إداري على بلاغ: كتم / حظر / تجاهل
router.post('/admin/report/action', authenticate, requireAdmin, async (req: Request, res: Response) => {
  const reportId = String(req.body?.report_id ?? '').trim();
  const action = String(req.body?.action ?? '').trim();

  if (!/^[0-9a-f-]{36}$/.test(reportId)) {
    return res.status(400).json({ error: 'INVALID_REPORT' });
  }
  if (!['mute', 'ban', 'dismiss'].includes(action)) {
    return res.status(400).json({ error: 'INVALID_ACTION' });
  }

  const admin = getAdmin();
  const { data: report } = await admin
    .from('reports')
    .select('id, reported_id')
    .eq('id', reportId)
    .maybeSingle();
  if (!report) return res.status(404).json({ error: 'REPORT_NOT_FOUND' });
  const reportedId = String(report.reported_id);

  const logPenalty = (type: 'mute' | 'ban', hours: number | null, reason: string) =>
    admin
      .from('penalties')
      .insert({ user_id: reportedId, type, duration_hours: hours, reason })
      .then(
        () => {},
        (e: unknown) => console.error('[penalty] insert failed:', (e as Error)?.message)
      );

  if (action === 'mute') {
    await admin.from('profiles').update({ status: 'muted' }).eq('id', reportedId);
    await admin.from('reports').update({ status: 'actioned' }).eq('id', reportId);
    await logPenalty('mute', 24, 'إساءة صوتية — كتم من الإدارة');
  } else if (action === 'ban') {
    await admin.from('profiles').update({ status: 'banned' }).eq('id', reportedId);
    await admin.from('reports').update({ status: 'actioned' }).eq('id', reportId);
    await logPenalty('ban', null, 'إساءة متكررة — حظر دائم من الإدارة');
  } else {
    await admin.from('reports').update({ status: 'dismissed' }).eq('id', reportId);
  }

  return res.json({ ok: true });
});

// إحصاءات حية للوحة المدير (متصلون + طاولات + جلسات)
router.get('/admin/stats', authenticate, requireAdmin, async (_req: Request, res: Response) => {
  res.json({
    onlineUsers: onlineUsersCount(),
    sockets: totalSocketCount(),
    tables: getTableStats(),
    soloSessions: getSoloStats().sessions,
  });
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

// الطاولات الثابتة الحية (أرضية اللعب) + عدادات الجالسين الفعليين
router.get('/live-tables', async (_req: Request, res: Response) => {
  const solo = getLiveSoloCounts();
  const holdem = getHoldemCounts();
  res.json([
    { id: 'bj-1', game_type: 'blackjack', name: 'بلاك جاك — طاولة مشتركة', min_bet: 50, players: solo['solo:blackjack:bj-1'] ?? 0, maxPlayers: 6, route: '/(app)/blackjack/1' },
    { id: 'tc-1', game_type: 'three_card', name: 'ثلاث أوراق بوكر', min_bet: 50, players: solo['solo:three-card:tc-1'] ?? 0, maxPlayers: 6, route: '/(app)/three-card/1' },
    { id: 'ru-1', game_type: 'russian', name: 'البوكر الروسي', min_bet: 50, players: solo['solo:russian:ru-1'] ?? 0, maxPlayers: 6, route: '/(app)/russian/1' },
    { id: 'ro-1', game_type: 'roulette', name: 'روليت — منخفضة (10+)', min_bet: 10, players: solo['solo:roulette:ro-1'] ?? 0, maxPlayers: 50, route: '/(app)/roulette/1' },
    { id: 'ro-2', game_type: 'roulette', name: 'روليت — متوسطة (50+)', min_bet: 50, players: solo['solo:roulette:ro-2'] ?? 0, maxPlayers: 50, route: '/(app)/roulette/2' },
    { id: 'ro-3', game_type: 'roulette', name: 'روليت — عالية (200+)', min_bet: 200, players: solo['solo:roulette:ro-3'] ?? 0, maxPlayers: 50, route: '/(app)/roulette/3' },
    { id: 'table-1', game_type: 'texas_holdem', name: 'تكساس هولدم — الطاولة العامة', min_bet: 500, players: holdem['table-1'] ?? 0, maxPlayers: 6, route: '/(app)/table/1' },
  ]);
});

// إنشاء طاولة خاصة
router.post('/tables', authenticate, async (req: Request, res: Response) => {
  const { game_type, name, min_buy_in, is_private, password } = req.body ?? {};

  // إنشاء الطاولات الخاصة حصري لأصحاب الاشتراك الذهبي
  const tier = await getTierInfo(req.user!.id);
  if (!tier.goldActive) {
    return res.status(403).json({ error: 'GOLD_REQUIRED', message: 'إنشاء الطاولات الخاصة متاح للاشتراك الذهبي فقط' });
  }

  if (game_type !== 'texas_holdem' && game_type !== 'blackjack') {
    return res.status(400).json({ error: 'INVALID_GAME_TYPE' });
  }
  const cleanName = String(name ?? '').trim().slice(0, 40);
  if (!cleanName) return res.status(400).json({ error: 'TABLE_NAME_REQUIRED' });
  const buyIn = Number(min_buy_in);
  if (!Number.isInteger(buyIn) || buyIn <= 0) {
    return res.status(400).json({ error: 'INVALID_MIN_BUY_IN' });
  }

  // كلمة السر تُخزَّن مجزّأة (HMAC+pepper) لا نصًا صريحًا
  const hashedPassword = password ? hashTablePassword(String(password)) : null;

  const { data, error } = await getAdmin()
    .from('tables')
    .insert({
      game_type,
      name: cleanName,
      min_buy_in: buyIn,
      is_private: Boolean(is_private),
      password: hashedPassword,
      host_id: req.user!.id,
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
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Riyadh' }).format(new Date());
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
// عجلة الحظ: الجائزة يقررها السيرفر (CSPRNG) بالأوزان 25/25/20/15/8/5/2
router.post('/rewards/wheel', authenticate, async (req: Request, res: Response) => {
  const r = secureRandomInt(100);
  const prize = r < 25 ? 50 : r < 50 ? 100 : r < 70 ? 200 : r < 85 ? 500 : r < 93 ? 1000 : r < 98 ? 2000 : 5000;
  const { data, error } = await getAdmin().rpc('spin_daily_wheel', {
    p_user_id: req.user!.id,
    p_prize: prize,
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

// إنشاء مجلس — حصري لمدير اللعبة (خاصة برمز 6 أرقام — عامة بلا رمز)
router.post('/majlis', authenticate, requireAdmin, async (req: Request, res: Response) => {
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
