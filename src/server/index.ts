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
// تطبيقات الجوال الأصلية لا ترسل Origin أصلًا.
const allowedOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:8081,http://localhost:19006')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const corsOptions = {
  origin: (origin: string | undefined, cb: (err: Error | null, ok?: boolean) => void) => {
    if (!origin || allowedOrigins.includes(origin)) cb(null, true);
    else cb(new Error('Origin not allowed'));
  },
};

const io = new Server(httpServer, { cors: corsOptions });

app.use(cors(corsOptions));
app.use(express.json({ limit: '100kb' }));

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
