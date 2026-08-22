# 🔒 جولة التحصين — ملخص التغييرات (Security Hardening)

تاريخ: جولة واحدة شاملة بعد مراجعة ثلاثية الطبقات (واجهة / محركات / سيرفر+بنية).
كل الفحوصات خضراء: `tsc --noEmit` = 0 أخطاء، الاختبارات = 176/176، `eslint` = 0 أخطاء.

## ما تغيّر

### 1. الأسرار (Critical)
- `src/server/lib/supabaseAdmin.ts` — المفتاح الحرفي أُزيل؛ يُقرأ من `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` فقط (خطأ واضح عند الغياب).
- `src/server/game/agora.ts` — شهادة Agora من البيئة فقط بلا fallback؛ والتوكن يوقَّع بمعرّف المستخدم الحقيقي (`buildTokenWithAccount`) بدل `uid=0` الثابت.
- `DEPLOY.md` — أُزيل المفتاح الحرفي.
- **مطلوب يدويًا: تدوير المفتاحين** (Supabase Dashboard → Settings → API، وAgora Console) لأنهما كانا في تاريخ git.

### 2. المصادقة (Critical)
- `POST /api/auth/register` — ينشئ المستخدم بكلمة مرور عشوائية ثم يصدر **جلسة حقيقية** (access + refresh)؛ مع تحديد معدل (5/10 دقائق/IP) وتحقق صارم من الاسم `[a-z0-9_]{3,20}`.
- كل المسارات الحساسة (`/balance`, `/transactions`, `/vip-status`, `/profile`, `/users/search`, `/tables`) تتطلب الآن `Authorization: Bearer <JWT>` وتستخدم `req.user.id` — **لا معرّف مستخدم من العميل إطلاقًا**. `/leaderboard` عامة فقط.
- السوكت: `io.use` يتحقق من التوكن في المصافحة → `socket.data.userId`. `solo:join` و`table:join` يشتقان الهوية من التوكن (الضيف = معرّف الاتصال). `game:action` يتحقق من ملكية المقعد.
- العميل: `authStore` يخزّن الجلسة عبر supabase-js (auto-refresh)، و`src/lib/api.ts` يوقّع كل طلب، و`useSoloGame`/`useGameSocket` يرسلان التوكن في المصافحة.

### 3. المال (Critical/High)
- `apply_balance_delta(p_user_id, p_delta)` — تحديث ذرّي بعبارة واحدة (`GREATEST(balance+delta, 0)`)، يستخدمه حفظ ألعاب الفردي وتسوية طاولة البوكر.
- البوكر الجماعي يحفظ الآن دلتا كل لاعب عند نهاية اليد/المغادرة/الانقطاع (كان 10,000 مجانية بلا أي حفظ).
- `weekly_refill()` أُصلحت: لا تخفيض لرصيد عالٍ + مهلة 7 أيام حقيقية + تسجيل المعاملة فعليًا.
- رفض رهانات NaN/كسور/سالبة في كل المحركات (كانت تفسد الرصيد إلى NaN).

### 4. قاعدة البيانات (Critical)
- `supabase/hardening.sql`: REVOKE كامل من `anon`/`authenticated` + RLS على كل الجداول (كانت `hole_cards`/`devices`/`reports` مقروءة للعموم) + فهرس منع طلبات الصداقة المزدوجة + trigger تحديث `updated_at`.

### 5. المحركات (High)
- **CSPRNG مفعّل افتراضيًا** — `Math.random` لم يعد يستخدم في الإنتاج (كان فرع الـCSPRNG كودًا ميتًا).
- بلاك جاك: استبعاد متبادل بين Even Money والتأمين (كانا يتجمعان = دفع زائد) + إزالة نتيجة `lose` الزائفة ليد الـeven-money.
- هولدم: **BBA ante مال ميت** حقيقي (في الوعاء الرئيسي، لا يزيد مبلغ المطابقة، لا يُرد عبر uncalled-excess) + رفض رفع NaN.
- بوكر روسي: إزالة تكرار معرّفات الأوراق في التبديل (كان يحرق بطاقة).
- ثلاث أوراق: ربط `sixCardBonusRequiresAnte` بالتهيئة فعليًا.
- **+22 اختبارًا جديدًا** (دفعات روليت مفروضة لكل صنف، BBA ante، Even Money/تأمين، NaN، تكرار التبديل).

### 6. الواجهة (High/Medium)
- رصيد اللوبي يجلب بالتوكن ويُحدَّث عند كل عودة من لعبة (`useFocusEffect`).
- البروفايل: رصيد حقيقي + عمليات حقيقية + إحصائيات محسوبة (كانت 10250 وهمية).
- طاولة البوكر: هوية من الحساب الحقيقي (كانت `p-random`) + مغادرة صريحة عند الخروج.
- بحث الأصدقاء بالتوكن؛ حذف كود ميت (`useAuth.ts`، دوال supabase غير المستخدمة).

### 7. الأدوات (Medium/Low)
- `npm run lint` يعمل الآن (كان يفشل بسبب مجلد `app/`); `server:start` → `dist/index.js` (كان مسارًا غير موجود).
- `/health` + معالج 404 JSON + CORS مقيد (قابل للضبط عبر `CORS_ORIGINS`).
- `render.yaml`: بناء حقيقي + `healthCheckPath` + إزالة `JWT_SECRET` الميت.
- `.gitignore`: `.env` و`._*` ومجلدات تكرارات التصميم. حُذفت ملفات AppleDouble المهملة.

## خطوات يدوية متبقية (لا يمكن أتمتتها من هنا)

1. **تدوير المفاتيح** (أعلاه) ووضعها في Render + `.env` المحلي.
2. تشغيل `supabase/hardening.sql` في Supabase SQL Editor.
3. ~~تعبئة `extra.eas.projectId` في `app.json`~~ ✅ مكتمل (`6013a7ae-9cd7-4676-98d4-a6f05dcb2229`).
4. إن أردت XP/درجات VIP حقيقية: لا يوجد حتى الآن مسار كتابة لها في السيرفر (تُعرض أصفارًا) — هذه ميزة جديدة تحتاج تسوية XP عند نهاية كل يد.
