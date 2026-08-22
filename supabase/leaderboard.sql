-- جرب حظك — Midnight Royale: XP / VIP Tier + leaderboard
-- يُطبَّق يدويًا في Supabase SQL Editor.

-- عمود نقاط الخبرة والدرجة الحالية
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS user_xp BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_tier TEXT NOT NULL DEFAULT 'bronze'
    CHECK (current_tier IN ('bronze', 'silver', 'gold', 'platinum', 'black'));

-- فهرس لترتيب المتصدرين
CREATE INDEX IF NOT EXISTS idx_profiles_user_xp ON profiles(user_xp DESC);