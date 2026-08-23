// ============================================================
// جرب حظك — Game Server Entry Point
// ============================================================

// تحميل .env محليًا عند التطوير (Node ≥ 20.12) — في Render تأتي من البيئة مباشرة
try {
  (process as { loadEnvFile?: (p?: string) => void }).loadEnvFile?.();
} catch {
  /* لا يوجد .env — البيئة تُضبط خارجيًا */
}

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import apiRouter from './api/router';
import { setupGameHandlers, getTableStats } from './game/gameServer';
import { setupSoloGameHandlers, getSoloStats } from './game/soloGames';
import {
  markUserOnline,
  markUserOffline,
  markSocketConnected,
  markSocketDisconnected,
} from './lib/presence';
import { verifyUserToken } from './lib/supabaseAdmin';

// ===== صفحات عامة لمراجعة متجر التطبيقات (App Store Connect) =====
// تُقدَّم كصفحات HTML ثابتة من خادم اللعبة لتُستخدم كروابط دعم وسياسة خصوصية.

const PUBLIC_PAGE_STYLE = `
* { margin:0; padding:0; box-sizing:border-box; }
body {
  background:#0A0D12; color:#F2EFE9;
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Cairo',Tahoma,sans-serif;
  line-height:1.85; padding:16px; direction:rtl;
  -webkit-text-size-adjust:100%;
}
.wrap { max-width:680px; margin:0 auto; padding:24px 8px 48px; }
h1 { color:#C9A961; font-size:1.55rem; line-height:1.4; margin-bottom:10px; }
h2 { color:#C9A961; font-size:1.12rem; margin:26px 0 8px; }
p { margin:10px 0; color:#E9E4D9; }
a { color:#C9A961; text-decoration:none; word-break:break-all; }
.card {
  background:#11161F; border:1px solid rgba(201,169,97,.32);
  border-radius:12px; padding:16px 18px; margin:18px 0;
}
.q { color:#C9A961; font-weight:700; margin-top:16px; }
.q:first-child { margin-top:0; }
.muted { color:#8A857A; font-size:.9rem; }
.footer {
  margin-top:40px; padding-top:16px; text-align:center;
  border-top:1px solid rgba(201,169,97,.25); color:#8A857A; font-size:.85rem;
}
`;

const SUPPORT_HTML = `<!DOCTYPE html>
<html lang="ar" dir="rtl"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>الدعم — جرب حظك</title>
<style>${PUBLIC_PAGE_STYLE}</style>
</head><body>
<div class="wrap">
  <h1>الدعم — جرب حظك 🎰</h1>
  <p>مرحبًا بك في صفحة دعم لعبة <strong>جرب حظك</strong>. يسعدنا مساعدتك في أي استفسار أو مشكلة تواجهها أثناء اللعب.</p>

  <div class="card">
    <h2>تواصل معنا</h2>
    <p>لأي استفسار أو طلب مساعدة، راسلنا عبر البريد الإلكتروني:</p>
    <p><a href="mailto:support@jareb-hazzak.app">support@jareb-hazzak.app</a></p>
  </div>

  <h2>الأسئلة الشائعة</h2>
  <div class="card">
    <p class="q">هل اللعبة بأموال حقيقية؟</p>
    <p>لا، اللعبة تستخدم <strong>رقاقات افتراضية فقط</strong> ولا يمكن تحويلها إلى نقود حقيقية أو استبدالها بأي قيمة مالية.</p>

    <p class="q">كيف أستعيد حسابي؟</p>
    <p>راسلنا عبر البريد الإلكتروني أعلاه مع ذكر <strong>اسم المستخدم</strong> الخاص بك، وسنساعدك في استعادة حسابك.</p>

    <p class="q">كيف أبلغ عن مشكلة؟</p>
    <p>أرسل تفاصيل المشكلة إلى بريد الدعم مع وصف واضح لما حدث، وسنراجعها ونرد عليك في أقرب وقت.</p>

    <p class="q">هل يُسجَّل الصوت؟</p>
    <p>لا، المكالمات الصوتية بين اللاعبين مباشرة ولا تُسجَّل ولا تُخزَّن.</p>
  </div>

  <div class="footer">جرب حظك — الإصدار 1.0.0</div>
</div>
</body></html>`;

const PRIVACY_HTML = `<!DOCTYPE html>
<html lang="ar" dir="rtl"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>سياسة الخصوصية — جرب حظك</title>
<style>${PUBLIC_PAGE_STYLE}</style>
</head><body>
<div class="wrap">
  <h1>سياسة الخصوصية — جرب حظك</h1>
  <p class="muted">آخر تحديث: نسخة 1.0.0</p>
  <p>نحترم خصوصيتك. توضح هذه السياسة البيانات التي نجمعها وكيف نستخدمها ونحميها عند استخدامك لعبة <strong>جرب حظك</strong>.</p>

  <h2>البيانات التي نجمعها</h2>
  <p>لإنشاء حسابك وتأمينه، قد نجمع:</p>
  <div class="card">
    <p>• البريد الإلكتروني</p>
    <p>• اسم المستخدم</p>
    <p>• اسم العرض</p>
    <p>• معرف الجهاز (لتأمين الحساب ومنع الاحتيال)</p>
  </div>

  <h2>كيف نستخدم بياناتك</h2>
  <div class="card">
    <p>• حفظ تقدمك في اللعبة ورصيد رقاقاتك</p>
    <p>• منع الغش وإساءة الاستخدام</p>
    <p>• تقديم الدعم الفني والرد على استفساراتك</p>
  </div>

  <h2>الصوت</h2>
  <p>تُجرى المكالمات الصوتية <strong>مباشرة بين اللاعبين</strong> عبر خدمة Agora، ولا تُسجَّل ولا تُخزَّن على خوادمنا.</p>

  <h2>لا نبيع بياناتك</h2>
  <p>لا نبيع ولا نؤجر بياناتك الشخصية لأي طرف ثالث، ولا نشاركها لأغراض تسويقية.</p>

  <h2>التخزين والأمان</h2>
  <p>تُخزَّن بياناتك على منصة <strong>Supabase</strong> وتُنقل مشفرة عبر بروتوكول <strong>TLS</strong> لحمايتها أثناء النقل.</p>

  <h2>حذف الحساب</h2>
  <p>يمكنك طلب حذف حسابك وبياناتك في أي وقت عبر التواصل مع الدعم على <a href="mailto:support@jareb-hazzak.app">support@jareb-hazzak.app</a>.</p>

  <h2>العمر</h2>
  <p>هذه اللعبة مخصصة لمن هم بعمر <strong>18 عامًا فما فوق</strong>.</p>

  <h2>التغييرات على السياسة</h2>
  <p>قد نحدّث هذه السياسة من وقت لآخر، وسننشر أي تغييرات على هذه الصفحة مع تحديث تاريخها.</p>

  <div class="footer">جرب حظك — سياسة الخصوصية — الإصدار 1.0.0</div>
</div>
</body></html>`;

const app = express();
app.set('trust proxy', 1); // خلف بروكسي Render — ليعمل تحديد معدل التسجيل بعنوان حقيقي
const httpServer = createServer(app);

// أصول مسموحة (قابلة للضبط عبر CORS_ORIGINS مفصولة بفواصل)
// تطبيقات الجوال الأصلية لا ترسل Origin عادة، لكن RN/Android قد يرسل
// "http://localhost" في مصافحة WebSocket — لهذا ندرجهما دائمًا.
// ملاحظة: السلسلة الفارغة تُعامل كغير مضبوطة (كانت علة سابقة: CORS_ORIGINS=""
// كانت تفرغ القائمة وترفض كل المتصفحات).
const rawOrigins = (process.env.CORS_ORIGINS ?? '').trim();
const DEFAULT_ORIGINS =
  'http://localhost,http://localhost:8081,http://localhost:19006,https://jareb-hazzak-server.onrender.com';
const allowedOrigins = new Set(
  (rawOrigins || DEFAULT_ORIGINS).split(',').map((s) => s.trim()).filter(Boolean)
);

const corsOptions = {
  origin: (origin: string | undefined, cb: (err: Error | null, ok?: boolean) => void) => {
    if (!origin || allowedOrigins.has(origin)) cb(null, true);
    else cb(new Error('Origin not allowed'));
  },
};

const io = new Server(httpServer, { cors: corsOptions });

app.use(cors(corsOptions));
app.use(express.json({ limit: '100kb' }));

// سجل اتصالات حي للتشخيص (آخر 50) — بلا عناوين IP (خصوصية)
const recentConnections: { id: string; at: number; transport: string }[] = [];
io.on('connection', (socket) => {
  recentConnections.push({
    id: socket.id.slice(0, 8),
    at: Date.now(),
    transport: socket.conn.transport.name,
  });
  if (recentConnections.length > 50) recentConnections.shift();
});

// ===== مصادقة السوكت: تحقق من توكن Supabase في المصافحة =====
// المستخدمون الموثّقون يحصلون على socket.data.userId — ولا نثق بأي معرّف من العميل.
io.use(async (socket, next) => {
  const token = typeof socket.handshake.auth?.token === 'string' ? socket.handshake.auth.token : '';
  if (token) {
    try {
      const user = await verifyUserToken(token);
      socket.data.userId = user.id;
      socket.data.email = user.email;
    } catch {
      // توكن غير صالح → اتصال ضيف (لعب بلا حفظ رصيد)
    }
  }
  next();
});

// صحة الخدمة (Healthcheck)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', time: Date.now() });
});

// إحصاء اتصالات السوكت والطاولات للتشخيص
app.get('/diag/stats', (_req, res) => {
  const { tables, seatedPlayers } = getTableStats();
  const { sessions } = getSoloStats();
  res.json({
    totalConnections: recentConnections.length,
    recent: recentConnections.slice(-10).reverse(),
    tables,
    seatedPlayers,
    soloSessions: sessions,
    memoryMB: Math.round(process.memoryUsage().rss / 1048576),
    serverTime: new Date().toISOString(),
  });
});

// تشخيص إعداد الصوت (بلا كشف قيم سرية — فقط مكوّن أم لا)
app.get('/diag/voice', (_req, res) => {
  res.json({
    appIdConfigured: Boolean(process.env.AGORA_APP_ID),
    certificateConfigured: Boolean(process.env.AGORA_APP_CERTIFICATE),
  });
});

// صفحة تشخيص اتصال (تُفتح من جوال اللاعب لفحص الشبكة)
app.get('/diag', (_req, res) => {
  res.type('html').send(`<!DOCTYPE html>
<html dir="rtl"><head><meta charset="utf-8"><title>تشخيص الاتصال</title></head>
<body style="background:#0A0D12;color:#F2EFE9;font-family:sans-serif;padding:24px">
<h2>🔌 تشخيص الاتصال</h2>
<div id="stats" style="background:#151B26;border:1px solid rgba(201,169,97,.35);border-radius:10px;padding:12px;margin:12px 0;line-height:1.9">جارٍ تحميل الإحصاءات…</div>
<div id="log" style="line-height:2"></div>
<script src="https://cdn.socket.io/4.8.3/socket.io.min.js"></script>
<script>
const log = (m) => document.getElementById('log').innerHTML += '<div>' + m + '</div>';
const refresh = () => fetch('/diag/stats').then(r => r.json()).then(d => {
  document.getElementById('stats').innerHTML =
    '🎰 طاولات هولدم نشطة: <b>' + d.tables + '</b> / 500<br>' +
    '🪑 لاعبون جالسون: <b>' + d.seatedPlayers + '</b><br>' +
    '🎲 جلسات فردية: <b>' + d.soloSessions + '</b><br>' +
    '🔌 اتصالات السوكت: <b>' + d.totalConnections + '</b><br>' +
    '🧠 ذاكرة الخادم: <b>' + d.memoryMB + ' MB</b>';
}).catch(() => {});
fetch('/health').then(r => r.ok ? log('🌐 HTTP: ✅') : log('🌐 HTTP: ❌ ' + r.status)).catch(e => log('🌐 HTTP: ❌ ' + e.message));
const s = io({ transports: ['websocket','polling'], timeout: 8000 });
s.on('connect', () => log('🔌 SOCKET: ✅ متصل'));
s.on('connect_error', e => log('🔌 SOCKET: ❌ ' + e.message));
setTimeout(() => { if (!s.connected) log('⏳ SOCKET: مهلة'); }, 12000);
refresh();
setInterval(refresh, 5000);
</script></body></html>`);
});

// صفحة الدعم العامة (رابط الدعم في App Store Connect)
app.get('/support', (_req, res) => {
  res.type('html').send(SUPPORT_HTML);
});

// صفحة سياسة الخصوصية العامة (رابط سياسة الخصوصية في App Store Connect)
app.get('/privacy', (_req, res) => {
  res.type('html').send(PRIVACY_HTML);
});

app.use('/api', apiRouter);

// Setup game handlers
setupGameHandlers(io);
setupSoloGameHandlers(io);

// ===== تتبع الحضور الحي (من متصل) =====
io.on('connection', (socket) => {
  markSocketConnected();
  const uid = socket.data.userId as string | undefined;
  if (uid) markUserOnline(uid);
  socket.on('disconnect', () => {
    markSocketDisconnected();
    if (uid) markUserOffline(uid);
  });
});

// 404 بتنسيق JSON + معالج أخطاء
app.use((_req, res) => {
  res.status(404).json({ error: 'NOT_FOUND' });
});
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[server] unhandled error:', err.message);
  res.status(500).json({ error: 'INTERNAL_ERROR' });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`🎰 جرب حظك server running on port ${PORT}`);
});
