-- ============================================================
-- جرب حظك — Hardening Migration (جولة التحصين)
-- شغّل هذا الملف في Supabase SQL Editor مرة واحدة (idempotent)
-- ============================================================

-- ------------------------------------------------------------
-- 1) تحديث الرصيد الذرّي — يستخدمه السيرفر بعد كل جولة/يد
--    عبارة واحدة: لا سباق SELECT-then-UPDATE، ولا رصيد سالب
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION apply_balance_delta(p_user_id UUID, p_delta BIGINT)
RETURNS void AS $$
BEGIN
  UPDATE profiles
     SET balance = GREATEST(balance + p_delta, 0),
         updated_at = NOW()
   WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------
-- 2) إصلاح التجديد الأسبوعي:
--    - لا يخفض رصيدًا عاليًا أبدًا (الشرط القديم كان يعيد >10000 إلى 10000)
--    - فترة 7 أيام حقيقية (كان يتجدد عند أي رصيد < 10000 بلا مهلة)
--    - يسجل المعاملة فعليًا (كان الـINSERT يعمل بعد الـUPDATE فيطابق صفر صفوف)
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- 3) قفل قاعدة البيانات: إلغاء المنح العمومية الزائدة
--    (permissions.sql القديم منح anon/authenticated قراءة كل الجداول
--     بما فيها hole_cards و devices و reports — يُلغى هنا)
-- ------------------------------------------------------------
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;

-- RLS على كل الجداول (بلا سياسات = منع افتراضي للعموم؛ السيرفر يعمل بـservice_role)
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE hands ENABLE ROW LEVEL SECURITY;
ALTER TABLE hole_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE hand_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE hand_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE penalties ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- 4) صيانة updated_at تلقائيًا
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------
-- 5) منع طلبات الصداقة المزدوجة المتزامنة (A→B و B→A معلقتان معًا)
--    (يُنشأ الفهرس فقط إذا كان جدول friend_requests موجودًا)
-- ------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'friend_requests') THEN
    EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS uq_friend_requests_pair_pending
      ON friend_requests (LEAST(sender_id, receiver_id), GREATEST(sender_id, receiver_id))
      WHERE status = ''pending''';
  END IF;
END;
$$;
