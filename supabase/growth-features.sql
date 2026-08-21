-- ============================================================
-- جرب حظك — ميزات النمو الخليجي (مكافآت + دعوات + مجالس)
-- شغّل في Supabase SQL Editor مرة واحدة (idempotent)
-- ============================================================

-- ------------------------------------------------------------
-- أعمدة المكافآت اليومية على البروفايل
-- ------------------------------------------------------------
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS daily_streak INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_daily_claim DATE,
  ADD COLUMN IF NOT EXISTS last_wheel_spin DATE;

-- ------------------------------------------------------------
-- سلسلة الحضور اليومية (ذرّية — مرة واحدة في اليوم)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION claim_daily_reward(p_user_id UUID)
RETURNS TABLE (awarded BIGINT, streak INT) AS $$
DECLARE
  v_streak INT;
  v_last DATE;
  v_award BIGINT;
  v_today DATE := CURRENT_DATE;
BEGIN
  SELECT daily_streak, last_daily_claim INTO v_streak, v_last
    FROM profiles WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PROFILE_NOT_FOUND'; END IF;

  -- استلم اليوم مسبقًا؟
  IF v_last = v_today THEN
    awarded := 0; streak := v_streak; RETURN NEXT; RETURN;
  END IF;

  -- انقطاع يوم أو أكثر يكسر السلسلة
  IF v_last IS NULL OR v_last < v_today - 1 THEN v_streak := 0; END IF;
  v_streak := v_streak + 1;

  v_award := CASE LEAST(v_streak, 7)
    WHEN 1 THEN 500  WHEN 2 THEN 600  WHEN 3 THEN 800
    WHEN 4 THEN 1000 WHEN 5 THEN 1200 WHEN 6 THEN 1500
    ELSE 2000 END;

  UPDATE profiles
     SET daily_streak = v_streak,
         last_daily_claim = v_today,
         balance = balance + v_award,
         updated_at = NOW()
   WHERE id = p_user_id;

  INSERT INTO balance_transactions (user_id, amount, type, description)
  VALUES (p_user_id, v_award, 'refill', 'مكافأة الحضور اليومية');

  awarded := v_award; streak := v_streak; RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------
-- عجلة الحظ اليومية (السيرفر يحسم الجائزة — مرة واحدة في اليوم)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION spin_daily_wheel(p_user_id UUID)
RETURNS TABLE (prize BIGINT) AS $$
DECLARE
  v_last DATE;
  v_today DATE := CURRENT_DATE;
  v_prize BIGINT;
  r DOUBLE PRECISION;
BEGIN
  SELECT last_wheel_spin INTO v_last FROM profiles WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PROFILE_NOT_FOUND'; END IF;

  IF v_last = v_today THEN
    prize := 0; RETURN NEXT; RETURN;
  END IF;

  r := random();
  v_prize := CASE
    WHEN r < 0.25 THEN 50
    WHEN r < 0.50 THEN 100
    WHEN r < 0.70 THEN 200
    WHEN r < 0.85 THEN 500
    WHEN r < 0.93 THEN 1000
    WHEN r < 0.98 THEN 2000
    ELSE 5000 END;

  UPDATE profiles
     SET last_wheel_spin = v_today,
         balance = balance + v_prize,
         updated_at = NOW()
   WHERE id = p_user_id;

  INSERT INTO balance_transactions (user_id, amount, type, description)
  VALUES (p_user_id, v_prize, 'refill', 'عجلة الحظ اليومية');

  prize := v_prize; RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------
-- الدعوات
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  invitee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (invitee_id)
);
CREATE INDEX IF NOT EXISTS idx_invites_inviter ON invites(inviter_id);
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- المجالس الصوتية
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS majlis_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  is_private BOOLEAN DEFAULT false,
  code TEXT,
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_majlis_active ON majlis_rooms(active, created_at DESC);

CREATE TABLE IF NOT EXISTS majlis_members (
  room_id UUID NOT NULL REFERENCES majlis_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (room_id, user_id)
);
ALTER TABLE majlis_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE majlis_members ENABLE ROW LEVEL SECURITY;
