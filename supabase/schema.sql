-- جرب حظك — try ur luck
-- Supabase schema

-- امتدادات مطلوبة
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- بروفايل المستخدم
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  balance BIGINT NOT NULL DEFAULT 10000,
  weekly_refill_at TIMESTAMPTZ,
  device_fingerprint TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'muted', 'banned')),
  -- الاشتراك المميز: عادي/ذهبي + صلاحية الذهبي + حساب المدير
  tier TEXT NOT NULL DEFAULT 'regular' CHECK (tier IN ('regular', 'gold')),
  gold_until TIMESTAMPTZ,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- سجل العمليات المالية
CREATE TABLE balance_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount BIGINT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('refill', 'win', 'loss', 'ad_reward', 'tournament', 'penalty', 'gift')),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- الطاولات
CREATE TABLE tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_type TEXT NOT NULL CHECK (game_type IN ('texas_holdem', 'blackjack')),
  name TEXT NOT NULL,
  min_buy_in BIGINT NOT NULL,
  small_blind BIGINT,
  big_blind BIGINT,
  max_players INT NOT NULL DEFAULT 6,
  is_private BOOLEAN DEFAULT false,
  password TEXT,
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'closed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- لاعبو الطاولة
CREATE TABLE table_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id UUID NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  seat_number INT NOT NULL,
  balance_at_table BIGINT NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'folded', 'sitting_out', 'left')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (table_id, seat_number)
);

-- الأياد
CREATE TABLE hands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id UUID NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  dealer_position INT NOT NULL DEFAULT 0,
  community_cards JSONB DEFAULT '[]'::jsonb,
  pot BIGINT DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

-- أوراق كل لاعب (مشفرة وتُرسل فقط لصاحبها)
CREATE TABLE hole_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hand_id UUID NOT NULL REFERENCES hands(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  cards JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (hand_id, user_id)
);

-- حركات اللاعبين داخل اليد
CREATE TABLE hand_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hand_id UUID NOT NULL REFERENCES hands(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('fold', 'check', 'call', 'raise', 'bet', 'all_in', 'ante', 'blind')),
  amount BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- نتائج الأياد
CREATE TABLE hand_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hand_id UUID NOT NULL REFERENCES hands(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount BIGINT NOT NULL,
  hand_rank TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- التبليغات
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reported_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  table_id UUID REFERENCES tables(id) ON DELETE SET NULL,
  reason TEXT NOT NULL CHECK (reason IN ('voice_abuse', 'cheating', 'offensive_language', 'harassment', 'spam')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'actioned', 'dismissed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- سجل العقوبات
CREATE TABLE penalties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('mute', 'ban', 'delete')),
  duration_hours INT,
  reason TEXT NOT NULL,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- سجل الأجهزة لمكافحة multi-accounting
CREATE TABLE devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  fingerprint TEXT NOT NULL,
  ip_address INET,
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, fingerprint)
);

-- فهارس للأداء
CREATE INDEX idx_profiles_username ON profiles(username);
CREATE INDEX idx_profiles_status ON profiles(status);
CREATE INDEX idx_balance_transactions_user_id ON balance_transactions(user_id);
CREATE INDEX idx_tables_game_type ON tables(game_type);
CREATE INDEX idx_tables_status ON tables(status);
CREATE INDEX idx_table_players_table_id ON table_players(table_id);
CREATE INDEX idx_table_players_user_id ON table_players(user_id);
CREATE INDEX idx_hands_table_id ON hands(table_id);
CREATE INDEX idx_hand_actions_hand_id ON hand_actions(hand_id);
CREATE INDEX idx_reports_reported_id ON reports(reported_id);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_devices_fingerprint ON devices(fingerprint);

-- سياسات RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE balance_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE table_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- ⚠️ لا سياسة UPDATE عمومية: الرصيد/XP/الحالة تُعدَّل عبر السيرفر فقط (service_role)
-- (كانت سياسة "Users can update own profile" تسمح بتعديل الرصيد ذاتيًا عند وجود منح قديمة)

CREATE POLICY "Users can read own transactions"
  ON balance_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can read table players"
  ON table_players FOR SELECT
  TO authenticated
  USING (true);

-- دالة تجديد الرصيد الأسبوعي (نسخة صحيحة — مطابقة لـ hardening.sql):
-- لا تخفيض للأرصدة العالية + مهلة 7 أيام حقيقية + تسجيل المعاملة فعليًا
CREATE OR REPLACE FUNCTION weekly_refill()
RETURNS void AS $$
DECLARE
  r RECORD;
  v_credit BIGINT;
BEGIN
  FOR r IN
    SELECT id, balance
      FROM profiles
     WHERE balance < 10000
       AND (weekly_refill_at IS NULL OR weekly_refill_at < NOW() - INTERVAL '7 days')
     FOR UPDATE
  LOOP
    v_credit := 10000 - r.balance;
    UPDATE profiles
       SET balance = 10000, weekly_refill_at = NOW(), updated_at = NOW()
     WHERE id = r.id;
    INSERT INTO balance_transactions (user_id, amount, type, description)
    VALUES (r.id, v_credit, 'refill', 'التجديد الأسبوعي');
  END LOOP;
END;
$$ LANGUAGE plpgsql;
