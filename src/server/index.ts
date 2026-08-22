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
import { setupGameHandlers } from './game/gameServer';
import { setupSoloGameHandlers } from './game/soloGames';
import { verifyUserToken } from './lib/supabaseAdmin';

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

// إحصاء اتصالات السوكت للتشخيص
app.get('/diag/stats', (_req, res) => {
  res.json({
    totalConnections: recentConnections.length,
    recent: recentConnections.slice(-10).reverse(),
    serverTime: new Date().toISOString(),
  });
});

// صفحة تشخيص اتصال (تُفتح من جوال اللاعب لفحص الشبكة)
app.get('/diag', (_req, res) => {
  res.type('html').send(`<!DOCTYPE html>
<html dir="rtl"><head><meta charset="utf-8"><title>تشخيص الاتصال</title></head>
<body style="background:#0A0D12;color:#F2EFE9;font-family:sans-serif;padding:24px">
<h2>🔌 تشخيص الاتصال</h2><div id="log" style="line-height:2"></div>
<script src="https://cdn.socket.io/4.8.3/socket.io.min.js"></script>
<script>
const log = (m) => document.getElementById('log').innerHTML += '<div>' + m + '</div>';
fetch('/health').then(r => r.ok ? log('🌐 HTTP: ✅') : log('🌐 HTTP: ❌ ' + r.status)).catch(e => log('🌐 HTTP: ❌ ' + e.message));
const s = io({ transports: ['websocket','polling'], timeout: 8000 });
s.on('connect', () => log('🔌 SOCKET: ✅ متصل'));
s.on('connect_error', e => log('🔌 SOCKET: ❌ ' + e.message));
setTimeout(() => { if (!s.connected) log('⏳ SOCKET: مهلة'); }, 12000);
</script></body></html>`);
});

app.use('/api', apiRouter);

// Setup game handlers
setupGameHandlers(io);
setupSoloGameHandlers(io);

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
