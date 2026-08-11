# جرب حظك — try ur luck

> كازينو اجتماعي مجاني 100% للجمهور الخليجي. لا أموال حقيقية، لا قمار، التوكنات افتراضية وتتجدد أسبوعيًا.

---

## 1. نظرة عامة

| البند | التفاصيل |
|-------|----------|
| الاسم العربي | جرب حظك |
| الاسم الإنجليزي | try ur luck |
| الجمهور | الخليج العربي (السعودية، الإمارات، الكويت، قطر، البحرين، عمان) |
| المنصات | iOS + Android (Expo) |
| العملة | دراهم افتراضية (توكنات) |
| التجديد | كل جمعة الساعة 12:00 ظهرًا بتوقيت السعودية |
| MVP games | تكساس هولدم، بلاك جاك |
| التجربة الاجتماعية | طاولات عامة/خاصة، صوت فوري، دردشة نصية، تبليغات |

---

## 2. المكدس التقني

| الطبقة | التقنية | الدور |
|--------|---------|-------|
| Mobile | React Native + Expo SDK 52 | تطبيق اللاعب |
| Routing | expo-router | تنقل الشاشات |
| State | Zustand | حالة الواجهة |
| Backend | Node.js + Express + Socket.io | Game server + API |
| Hosting | Render Pro | تشغيل الخادم |
| Database | Supabase (PostgreSQL) | بيانات اللاعبين والألعاب |
| Auth | Supabase Auth (OTP/Email) | تسجيل الدخول |
| Voice | Agora.io Free Tier | صوت فوري داخل الطاولة |
| Push | Expo Push | إشعارات التجديد والبطولات |
| Assets | Expo + react-native-svg | رسومات الأوراق والطاولات |

---

## 3. بنية النظام

```
┌─────────────────┐
│  React Native   │
│   (Expo App)    │
│  RTL Arabic     │
└────────┬────────┘
         │ HTTPS / WSS
         ▼
┌─────────────────┐     ┌─────────────────┐
│  Render Pro     │────▶│   Supabase      │
│  Node.js +      │     │   PostgreSQL    │
│  Socket.io      │     │   Auth          │
└────────┬────────┘     └─────────────────┘
         │
         │ (Voice token)
         ▼
┌─────────────────┐
│    Agora.io     │
│   Voice Chat    │
└─────────────────┘
```

### مكونات الخادم على Render

| الخدمة | الوصف |
|--------|-------|
| `api` | Express REST API للـ auth والرصيد والبروفايل. |
| `game-server` | Socket.io server authoritative للألعاب. |
| `anti-cheat-worker` | يقرأ hand history ويرفع alerts. |
| `scheduler` | تجديد الرصيد الأسبوعي + إشعارات. |

---

## 4. المستخدم والمصادقة

### تدفق التسجيل

1. المستخدم يدخل رقم الجوال.
2. Supabase يرسل OTP.
3. بعد التحقق، يُنشأ حساب برصيد ابتدائي.
4. يُطلب من المستخدم اختيار `username` و`display_name`.
5. يظهر تنبيه قانوني: "الدراهم ليست نقودًا حقيقية ولا يمكن صرفها."

### جدول المستخدمين

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  balance BIGINT NOT NULL DEFAULT 10000,
  weekly_refill_at TIMESTAMPTZ,
  device_fingerprint TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'active' -- active, muted, banned
);
```

---

## 5. نظام الرصيد الأسبوعي

- كل لاعب جديد يحصل على `10,000` درهم عند التسجيل.
- التجديد: كل **جمعة الساعة 12:00 ظهرًا بتوقيت السعودية** (`Asia/Riyadh`).
- المبلغ الثابت: `10,000` درهم.
- إذا كان الرصيد أعلى من `10,000`، لا يضاف شيء (refill to cap وليس add on top).
- لا يمكن شراء دراهم بأموال حقيقية أبدًا.
- يمكن الحصول على دراهم إضافية من خلال:
  - مشاهدة إعلان (اختياري).
  - البطولات الأسبوعية.
  - Daily login bonus (لاحقًا).

### جدول الرصيد

```sql
CREATE TABLE balance_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  amount BIGINT NOT NULL,
  type TEXT NOT NULL, -- refill, win, loss, ad_reward, tournament
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 6. الألعاب

### 6.1 تكساس هولدم (Texas Hold'em)

#### قواعد MVP

- طاولات 6 لاعبين كحد أقصى.
- Small blind / big blind ثابتين حسب مستوى الطاولة.
- دورة واحدة من الرهان: pre-flop, flop, turn, river.
- Showdown: الخادم يحسب أفضل يد 5 أوراق من 7 (2 hole cards + 5 community cards).
- الفائز يأخذ الـ pot.

#### مستويات الطاولات

| الطاولة | Small Blind | Big Blind | Min Buy-in |
|---------|-------------|-----------|------------|
| مبتدئ | 10 | 20 | 500 |
| متوسط | 50 | 100 | 2,500 |
| محترف | 200 | 400 | 10,000 |
| VIP | 1,000 | 2,000 | 50,000 |

#### البوت

- إذا كانت الطاولة فارغة أو ناقصة، يدخل بوت تلقائي.
- البوت يلعب بمنطق بسيط: fold إذا اليد ضعيفة، call برهان معتدل، raise إذا اليد قوية.
- لا يستخدم AI معقد في MVP.

### 6.2 بلاك جاك (Blackjack)

#### قواعد MVP

- طاولة جماعية ضد الموزع (البوت).
- كل لاعب يراهن، ثم يقرر hit/stand/double/split.
- الموزع يلعب حتى يصل 17 أو أكثر.
- الفوز يدفع 1:1، بلاك جاك يدفع 3:2.

---

## 7. نظام الصوت

### التقنية

- **Agora.io** للصوت الفوري.
- كل طاولة = Agora channel واحد.
- channel name = `table_<table_id>`.
- token يُولد من الخادم عند الانضمام للطاولة.

### الميزات

- المستخدم يستطيع فتح/إغلاق المايك من داخل الطاولة.
- mute آخرين (client-side).
- volume indicator.
- لا تسجيل في MVP.

---

## 8. نظام التبليغ والعقوبات

### التبليغ داخل الطاولة

- زر "تبليغ" بجانب كل لاعب.
- سبب التبليغ: إساءة صوتية، غش، لغة بذيئة، إزعاج.

### العقوبات التلقائية

| عدد التبليغات (مختلفة) | العقوبة |
|------------------------|---------|
| 3 | Mute 24 ساعة |
| 5 | Ban 7 أيام |
| 7 | حذف الحساب |

### العملية

1. عند تلقي تبليغ، يُسجل في `reports`.
2. `moderation-worker` يحسب عدد التبليغات المختلفة.
3. إذا وصل الحد، يُطبق العقوبة تلقائيًا.
4. التبليغات الواضحة تذهب لـ manual review queue.

```sql
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES profiles(id),
  reported_id UUID REFERENCES profiles(id),
  table_id UUID,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, reviewed, actioned
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 9. مكافحة الغش

### 9.1 المبادئ

- **Server-authoritative**: كل قرار على الخادم.
- **Hole cards مشفرة**: لا تُرسل إلا لصاحبها.
- **RNG موثق**: استخدام `crypto.randomBytes` للخلط.
- **Audit logs**: كل يد تُسجل كاملة.

### 9.2 أنواع الغش والحماية

| نوع الغش | الآلية |
|----------|--------|
| **Collusion** | رصد IP/device المشترك، أنماط الرفع المتكررة، seating randomization. |
| **Bots** | reaction time analysis، decision variance، device attestation (App Attest). |
| **Multi-accounting** | device fingerprint، رصد حسابات بنفس الجهاز على نفس الطاولة. |
| **Chip dumping** | رصد تفاوت الرهانات الغير طبيعي بين لاعبين. |
| **Client tampering** | لا يثق بالعميل أبدًا، التحقق من توقيع JWT + certificate pinning. |
| **Superuser** | RBAC للموظفين، لا أحد يرى hole cards، audit logs. |

### 9.3 Anti-Cheat Worker

يُحلل كل يد بعد انتهائها:

```ts
interface HandAnalysis {
  tableId: string;
  handId: string;
  players: PlayerAction[];
  flags: CheatFlag[];
}

type CheatFlag =
  | 'SAME_IP_COLLUSION'
  | 'CHIP_DUMPING'
  | 'BOT_LIKE_TIMING'
  | 'SUSPICIOUS_FOLD_PATTERN';
```

---

## 10. قاعدة البيانات

### الجداول الرئيسية

```sql
-- profiles (أعلاه)
-- balance_transactions (أعلاه)
-- reports (أعلاه)

CREATE TABLE tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_type TEXT NOT NULL, -- texas_holdem, blackjack
  name TEXT NOT NULL,
  min_buy_in BIGINT NOT NULL,
  small_blind BIGINT,
  big_blind BIGINT,
  max_players INT NOT NULL DEFAULT 6,
  is_private BOOLEAN DEFAULT false,
  password TEXT,
  status TEXT DEFAULT 'waiting', -- waiting, playing, closed
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE table_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id UUID REFERENCES tables(id),
  user_id UUID REFERENCES profiles(id),
  seat_number INT NOT NULL,
  balance_at_table BIGINT NOT NULL,
  status TEXT DEFAULT 'active', -- active, folded, left
  joined_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE hands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id UUID REFERENCES tables(id),
  dealer_position INT,
  community_cards JSONB,
  pot BIGINT DEFAULT 0,
  status TEXT DEFAULT 'active', -- active, completed, cancelled
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

CREATE TABLE hand_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hand_id UUID REFERENCES hands(id),
  user_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL, -- fold, check, call, raise, bet, all_in
  amount BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 11. Socket.io Events

### من العميل إلى الخادم

| Event | الوصف |
|-------|-------|
| `table:join` | الانضمام لطاولة. |
| `table:leave` | مغادرة الطاولة. |
| `game:action` | إرسال قرار لعبة (fold/call/raise). |
| `chat:message` | إرسال رسالة نصية. |
| `voice:toggle` | فتح/إغلاق المايك. |
| `player:report` | تبليغ عن لاعب. |

### من الخادم إلى العميل

| Event | الوصف |
|-------|-------|
| `table:state` | تحديث حالة الطاولة كاملة. |
| `game:deal` | توزيع الأوراق. |
| `game:community` | أوراق المجتمع (flop/turn/river). |
| `game:turn` | دور أي لاعب. |
| `game:result` | نتيجة اليد والفائز. |
| `chat:message` | رسالة من لاعب آخر. |
| `voice:token` | Agora token للصوت. |
| `player:muted` | إشعار بـ mute المستخدم. |

---

## 12. REST API Endpoints

| Method | Endpoint | الوصف |
|--------|----------|-------|
| POST | `/auth/otp` | طلب OTP. |
| POST | `/auth/verify` | التحقق من OTP. |
| GET | `/profile` | بيانات المستخدم. |
| GET | `/balance` | الرصيد الحالي. |
| GET | `/tables` | قائمة الطاولات. |
| POST | `/tables` | إنشاء طاولة خاصة. |
| GET | `/leaderboard` | أفضل اللاعبين. |
| GET | `/transactions` | سجل الرصيد. |

---

## 13. خارطة الطريق MVP

| الأسبوع | المهمة |
|---------|--------|
| 1 | إعداد المشروع + Supabase + Render skeleton. |
| 2 | تسجيل الدخول بالـ OTP + بروفايل. |
| 3 | نظام الرصيد الأسبوعي + transactions. |
| 4 | تكساس هولدم: منطق اليد + طاولات + بوت. |
| 5 | تكساس هولدم: UI كامل + Socket.io. |
| 6 | بلاك جاك: منطق + UI + Socket.io. |
| 7 | Agora voice chat + mute/unmute. |
| 8 | تبليغات + moderation queue. |
| 9 | Anti-cheat v1: IP/device checks + bot timing. |
| 10 | Leaderboard + تلميع الأداء. |
| 11 | اختبار iOS + Android. |
| 12 | بناء EAS + إعداد TestFlight. |

---

## 14. Render Deployment

### Services

1. **Web Service**: `api` و`game-server` في نفس العملية (Express + Socket.io).
2. **Background Worker**: `anti-cheat-worker`.
3. **Cron Job**: `scheduler` لتجديد الرصيد الأسبوعي.

### Environment Variables

```env
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
AGORA_APP_ID=
AGORA_APP_CERTIFICATE=
JWT_SECRET=
NODE_ENV=production
```

---

## 15. ملاحظات قانونية واجتماعية

- لا يوجد قمار حقيقي.
- التوكنات لا قيمة نقدية لها.
- يجب إظهار تنبيه واضح عند التسجيل.
- نظام التبليغ إلزامي للحفاظ على بيئة آمنة.
- ممنوع استهداف القصر.

---

## 16. تسمية المتغيرات والملفات

- كل شيء بالإنجليزية.
- UI text بالعربية مع دعم RTL.
- لا قيم صلبة، كل القيم من `theme` أو `constants`.
- TypeScript صارم (`strict: true`).
