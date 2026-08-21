# Dark Luxe Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** إعادة تصميم واجهة «جرب حظك» بالكامل بهوية Dark Luxe (شامبين مقيّد + عمق ليلي + موشن مصقول) دون أي تغيير في منطق الألعاب أو السوكت أو السيرفر.

**Architecture:** Token-first ثم مكونات ثم شاشات. نعيد كتابة `theme.ts` بنفس واجهة التصدير (حتى لا تنكسر الشاشات القديمة أثناء الترحيل)، ثم نعيد بناء المكونات، ثم نستخرج غلاف `SoloGameScreen` المشترك، ثم نرحّل الشاشات على دفعات. الحركة كلها عبر RN `Animated` المدمج + `expo-blur` + `expo-haptics` (ممنوع reanimated worklets — لا يوجد babel.config.js).

**Tech Stack:** Expo SDK 57 / RN 0.86 / React 19، expo-router، zustand، RN Animated، expo-blur، expo-haptics، خطوط Cairo + Inter (إزالة Playfair).

**Spec:** `docs/superpowers/specs/2026-08-22-dark-luxe-redesign-design.md`

## Global Constraints

- لا تغيير في: `src/server/**`، عقود السوكت (`solo:join/solo:action/table:*`)، أشكال snapshots، `src/lib/**`، `src/stores/**`، `src/hooks/**` (باستثناء hooks جديدة للموشن إن لزمت).
- الحركة: transform/opacity فقط؛ احترام reduced-motion عبر `AccessibilityInfo.isReduceMotionEnabled` في غلاف الشاشة الجديد.
- ألوان/خطوط/مسافات من theme.ts حصرًا (ممنوع hex عشوائي).
- بعد كل مهمة: `npx tsc --noEmit` (0 أخطاء) + `npm run lint` (0 أخطاء) + `npm test` (176/176).
- تحقق بصري: `npx expo start --web` في الخلفية + لقطات عبر chrome-devtools MCP للشاشات المعدلة.

---

### Task 1: نظام التصميم — theme.ts

**Files:**
- Modify: `src/constants/theme.ts` (إعادة كتابة كاملة بنفس أسماء التصدير)

**Interfaces:**
- Produces: نفس التصديرات الحالية (`COLORS`, `GRADIENTS`, `FONTS`, `TYPE`, `FONT_SIZES`, `SPACING`, `RADIUS`, `SIZES`, `SHADOWS`, `ANIMATION`, `WEEKLY_REFILL_AMOUNT`, `formatNumber`, `formatCompact`) بقيم Dark Luxe من المواصفة §1–§4.

- [ ] **Step 1:** أعد كتابة `theme.ts` بالقيم الجديدة (خلفيات `#0A0D12/#10151E/#151B26`، شامبين `#C9A961/#E3C98A/#8C6D2F`، نص عاجي `#F2EFE9`، حدود `rgba(242,239,233,0.08)`، جوخ `#0A3D2E/#0E4635/#02150F`، خشب داكن، انحناءات 4/8/12/20/28، ظلان أساسيان، springs damping 16–20، + `ANIMATION.deal=120/enter=200`، `FONTS.display` تُربط بـ Cairo بدل Playfair، `TYPE` مكبر حسب §2).
- [ ] **Step 2:** تحقق: `npx tsc --noEmit` (0 أخطاء).
- [ ] **Step 3:** Commit: `git commit -am "design: Dark Luxe tokens in theme.ts"`

---

### Task 2: الخطوط — إزالة Playfair

**Files:**
- Modify: `src/app/_layout.tsx` (حذف استيراد/تحميل Playfair)
- Modify: `src/app/(app)/index.tsx:228,272,370,383`، `src/app/(app)/roulette/[id].tsx:836`، `src/app/(app)/leaderboard.tsx:484,546` (استبدال أسماء خط Playfair بـ `FONTS.ar.black` / `FONTS.num.black`)

**Interfaces:**
- Produces: لا يوجد خط Playfair محمّل ولا مُستخدم؛ كل مواضع العرض تستخدم Cairo/Inter.

- [ ] **Step 1:** نفّذ الاستبدالات أعلاه.
- [ ] **Step 2:** `npx tsc --noEmit` + `npm run lint` (0 أخطاء).
- [ ] **Step 3:** Commit: `git commit -am "design: drop Playfair, Cairo/Inter only"`

---

### Task 3: المكونات الأساسية

**Files:**
- Modify: `src/components/ui/Screen.tsx` (خلفية gradient جديدة + دعم reduced-motion)
- Modify: `src/components/ui/GlassCard.tsx` (زجاج حقيقي عبر expo-blur `intensity` + حدود شعرية)
- Modify: `src/components/ui/GoldButton.tsx` (زر فخم: سطح فحمي + إطار شعري + نص عاجي؛ variant=gold للـCTA الوحيد، danger)
- Modify: `src/components/ui/Chip.tsx` (طبقات معدنية شامبين واقعية)
- Modify: `src/components/ui/Avatar.tsx`, `src/components/ui/Bits.tsx` (Badge/StatTile/Divider/SeatCounter بأسلوب هادئ), `src/components/ui/Input.tsx`
- Modify: `src/components/ui/TabBar.tsx` (شريط عائم زجاجي بحواف علوية شعرية)

**Interfaces:**
- Consumes: رموز Task 1.
- Produces: نفس أسماء المكونات وprops الحالية (التوافق)، بنمط جديد.

- [ ] **Step 1:** أعد بناء المكونات واحدًا واحدًا (كل مكون = تعديل + فحص).
- [ ] **Step 2:** `npx tsc --noEmit` + `npm run lint` (0 أخطاء).
- [ ] **Step 3:** تحقق بصري: expo web + لقطة لشاشة الصالة.
- [ ] **Step 4:** Commit: `git commit -am "design: rebuild core UI kit (glass, buttons, chips, tabbar)"`

---

### Task 4: مكونات اللعبة

**Files:**
- Modify: `src/components/game/FeltTable.tsx` (جوخ أعمق متعدد الطبقات + حافة خشبية داكنة)
- Modify: `src/components/game/PlayingCard.tsx` (أبعاد أكبر، وجه عاجي، ظل واحد واضح، زوايا 12)
- Modify: `src/components/game/SuitIcons.tsx`, `src/components/icons/GameIcons.tsx` (ضبط حدود SVG إلى ألوان النظام)
- Modify: `src/components/game/InstructionsModal.tsx` (صفيحة زجاجية)

**Interfaces:**
- Produces: نفس أسماء التصدير (PlayingCard, FeltTable, InstructionsModal, أيقونات).

- [ ] **Step 1:** أعد بناء المكونات أعلاه.
- [ ] **Step 2:** `npx tsc --noEmit` + `npm run lint` (0 أخطاء).
- [ ] **Step 3:** لقطة بصرية لطاولة بلاك جاك.
- [ ] **Step 4:** Commit: `git commit -am "design: rebuild game components (felt, cards, modal)"`

---

### Task 5: غلاف الشاشات المشتركة + موشن أدوات

**Files:**
- Create: `src/hooks/useErrorToast.ts` (توست خطأ متحرك موحد + reduced-motion)
- Create: `src/components/game/GameHeader.tsx` (ترويسة لعبة موحدة: رجوع/عنوان/ميك/معلومات)
- Create: `src/components/game/SoloGameScreen.tsx` (غلاف: خلفية، ترويسة، توست، منطقة محتوى، شريط إجراءات سفلي آمن)
- Create: `src/constants/motion.ts` (ثوابت stagger/springs + `useReducedMotion()` helper)

**Interfaces:**
- Consumes: رموز Task 1؛ `useSoloGame` من `src/hooks/useSoloGame` (snapshot/sendAction/isConnected).
- Produces: `useErrorToast(onError)` → `{ errorNode }`; `GameHeader({title, onBack, muted, onToggleMute, onInfo})`; `SoloGameScreen({insets, header, errorNode, children, footer})`; `useReducedMotion(): boolean`.

- [ ] **Step 1:** أنشئ الملفات الأربعة.
- [ ] **Step 2:** `npx tsc --noEmit` + `npm run lint` (0 أخطاء).
- [ ] **Step 3:** Commit: `git commit -am "design: shared solo-game shell + motion utilities"`

---

### Task 6: الصالة (Lobby)

**Files:**
- Modify: `src/app/(app)/index.tsx` (إعادة بناء كاملة: بطل ضخم هادئ، بطاقات ألعاب فخمة، كروت عروض مرتاحة، موشن دخول متتابع)

**Interfaces:**
- Consumes: مكونات Task 3؛ `apiFetch('/api/balance')` كما هو.
- Produces: شاشة الصالة الجديدة (الرصيد وروابط الألعاب تعمل كما كانت).

- [ ] **Step 1:** أعد بناء الشاشة.
- [ ] **Step 2:** `npx tsc --noEmit` + `npm run lint`.
- [ ] **Step 3:** لقطة بصرية للصالة + تنقل للألعاب.
- [ ] **Step 4:** Commit: `git commit -am "design: rebuild lobby screen"`

---

### Task 7: الطاولات + الترحيب/التسجيل

**Files:**
- Modify: `src/app/(app)/tables.tsx` (قائمة زجاجية مرتاحة)
- Modify: `src/app/(auth)/index.tsx` (بطل ترحيب فاخر + موشن أوراق خفيف)
- Modify: `src/app/(auth)/profile-setup.tsx` (نموذج هادئ بنفس النظام)

- [ ] **Step 1:** أعد بناء الشاشات الثلاث.
- [ ] **Step 2:** فحوصات (tsc/lint) + لقطات.
- [ ] **Step 3:** Commit: `git commit -am "design: rebuild tables + auth screens"`

---

### Task 8: شاشة بلاك جاك (أول ترحيل للغلاف)

**Files:**
- Modify: `src/app/(app)/blackjack/[id].tsx` (ترحيل كامل إلى SoloGameScreen + GameHeader + useErrorToast؛ حذف ActionButton/ScoreBubble المحليين وإعادة استخدام الأنماط المشتركة؛ إبقاء كل إجراءات sendAction كما هي)

- [ ] **Step 1:** هجّر الشاشة مع الحفاظ على كل منطق الإجراءات (bet/hit/stand/double/split/surrender/insurance).
- [ ] **Step 2:** فحوصات + لقطة + اختبار يدوي لتدفق جولة كاملة ضد السيرفر المحلي (`npm run server:dev`).
- [ ] **Step 3:** Commit: `git commit -am "design: migrate blackjack to shared shell"`

---

### Task 9: شاشة الروليت

**Files:**
- Modify: `src/app/(app)/roulette/[id].tsx` (ترحيل للغلاف؛ عجلة أوضح وتخطيط رهانات مرتاح؛ إبقاء placeBet/removeBet/clearBets/spin/next كما هي)

- [ ] **Step 1:** هجّر الشاشة.
- [ ] **Step 2:** فحوصات + لقطة.
- [ ] **Step 3:** Commit.

---

### Task 10: ثلاث أوراق + البوكر الروسي

**Files:**
- Modify: `src/app/(app)/three-card/[id].tsx`, `src/app/(app)/russian/[id].tsx` (ترحيل للغلاف بنفس نمط Task 8)

- [ ] **Step 1:** هجّر الشاشتين.
- [ ] **Step 2:** فحوصات + لقطات.
- [ ] **Step 3:** Commit.

---

### Task 11: طاولة البوكر (هولدم)

**Files:**
- Modify: `src/app/(app)/table/[id].tsx` (جوخ جديد، مقاعد أوضح، صف إجراءات واحد، موشن توزيع متتابع؛ إبقاء joinTable/performAction/on/useAgoraVoice كما هي)

- [ ] **Step 1:** أعد بناء الشاشة (الأكبر — 938 سطرًا).
- [ ] **Step 2:** فحوصات + لقطة + جولة مع لاعبين اثنين محليًا.
- [ ] **Step 3:** Commit.

---

### Task 12: البروفايل + المتصدرين + الأصدقاء

**Files:**
- Modify: `src/app/(app)/profile.tsx`, `src/app/(app)/leaderboard.tsx`, `src/app/(app)/friends.tsx` (توحيد بصري هادئ؛ الحفاظ على كل الـapiFetch الموجودة)

- [ ] **Step 1:** أعد بناء الشاشات الثلاث.
- [ ] **Step 2:** فحوصات + لقطات.
- [ ] **Step 3:** Commit.

---

### Task 13: المسح النهائي

**Files:**
- Modify: أي بقايا (ألوان قديمة، أنماط ميتة، Playfair متبقية، موشن مخالف)
- Modify: `docs/HARDENING.md` أو README (فقرة الهوية الجديدة)

- [ ] **Step 1:** `grep -rn "PlayfairDisplay\|#e9c349\|#0b1326\|#e9c349" src` — تأكد من خلو المصدر من الهوية القديمة.
- [ ] **Step 2:** فحص reduced-motion في كل الشاشات.
- [ ] **Step 3:** `npx tsc --noEmit` + `npm run lint` + `npm test` (176/176).
- [ ] **Step 4:** لقطات نهائية لكل الشاشات.
- [ ] **Step 5:** Commit: `git commit -am "design: final Dark Luxe sweep"`
