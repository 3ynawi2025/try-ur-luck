-- ============================================================
-- جرب حظك — الإشراف على المحتوى (Moderation)
-- توجيه App Store 1.2 (UGC): الإبلاغ + الحجب + كتم/حظر الإدارة
-- شغّل هذا الملف في Supabase SQL Editor (idempotent)
-- ============================================================

-- ------------------------------------------------------------
-- الحجب: مستخدم يحجب مستخدمًا آخر (يمنع طلبات الصداقة والتواصل)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS blocked_users (
  blocker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked ON blocked_users(blocked_id);

-- ------------------------------------------------------------
-- RLS: يرى المستخدم الحجب الذي قام به فقط (يُنفَّذ عبر service_role)
-- ------------------------------------------------------------
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own blocks" ON blocked_users;
CREATE POLICY "Users can read own blocks"
  ON blocked_users FOR SELECT
  USING (auth.uid() = blocker_id);

DROP POLICY IF EXISTS "Users can create own blocks" ON blocked_users;
CREATE POLICY "Users can create own blocks"
  ON blocked_users FOR INSERT
  WITH CHECK (auth.uid() = blocker_id);

DROP POLICY IF EXISTS "Users can delete own blocks" ON blocked_users;
CREATE POLICY "Users can delete own blocks"
  ON blocked_users FOR DELETE
  USING (auth.uid() = blocker_id);
