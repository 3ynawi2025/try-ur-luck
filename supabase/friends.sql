-- ============================================================
-- جرب حظك — نظام الأصدقاء (Friends)
-- شغّل هذا الملف في Supabase SQL Editor بعد schema.sql
-- ============================================================

-- طلبات الصداقة
CREATE TABLE friend_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  UNIQUE (sender_id, receiver_id)
);

-- علاقات الصداقة (صف واحد لكل صداقة بين شخصين)
CREATE TABLE friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- منع التكرار بالاتجاهين: الصداقة علاقة غير موجهة
  UNIQUE (user_id, friend_id),
  CHECK (user_id <> friend_id)
);

-- فهارس الأداء
CREATE INDEX idx_friend_requests_receiver ON friend_requests(receiver_id, status);
CREATE INDEX idx_friend_requests_sender ON friend_requests(sender_id, status);
CREATE INDEX idx_friendships_user ON friendships(user_id);
CREATE INDEX idx_friendships_friend ON friendships(friend_id);

-- ============================================================
-- دالة قبول طلب صداقة (تنشئ علاقتين متبادلتين تلقائياً)
-- ============================================================
CREATE OR REPLACE FUNCTION accept_friend_request(request_id UUID)
RETURNS void AS $$
DECLARE
  v_sender UUID;
  v_receiver UUID;
BEGIN
  SELECT sender_id, receiver_id
    INTO v_sender, v_receiver
    FROM friend_requests
   WHERE id = request_id AND status = 'pending'
   FOR UPDATE;

  IF v_sender IS NULL THEN
    RAISE EXCEPTION 'طلب الصداقة غير موجود أو تمت معالجته';
  END IF;

  -- تحديث الطلب
  UPDATE friend_requests
     SET status = 'accepted', responded_at = NOW()
   WHERE id = request_id;

  -- إنشاء علاقتين متبادلتين
  INSERT INTO friendships (user_id, friend_id)
  VALUES (v_sender, v_receiver), (v_receiver, v_sender)
  ON CONFLICT (user_id, friend_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- دالة إرسال طلب صداقة (تتحقق من عدم وجود علاقة/طلب سابق)
-- ============================================================
CREATE OR REPLACE FUNCTION send_friend_request(from_user UUID, to_user UUID)
RETURNS void AS $$
BEGIN
  IF from_user = to_user THEN
    RAISE EXCEPTION 'لا يمكنك إضافة نفسك';
  END IF;

  -- لو كانوا أصدقاء مسبقاً
  IF EXISTS (SELECT 1 FROM friendships WHERE user_id = from_user AND friend_id = to_user) THEN
    RAISE EXCEPTION 'أنتما صديقان بالفعل';
  END IF;

  -- لو يوجد طلب معلق من الطرف الآخر -> قبول فوري
  IF EXISTS (SELECT 1 FROM friend_requests WHERE sender_id = to_user AND receiver_id = from_user AND status = 'pending') THEN
    PERFORM accept_friend_request(
      (SELECT id FROM friend_requests WHERE sender_id = to_user AND receiver_id = from_user AND status = 'pending' LIMIT 1)
    );
    RETURN;
  END IF;

  INSERT INTO friend_requests (sender_id, receiver_id)
  VALUES (from_user, to_user)
  ON CONFLICT (sender_id, receiver_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- سياسات RLS
-- ============================================================
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- طلبات الصداقة: يرى المستخدم طلباته الواردة والصادرة
CREATE POLICY "Users can read own friend requests"
  ON friend_requests FOR SELECT
  USING (auth.uid() IN (sender_id, receiver_id));

CREATE POLICY "Users can create own friend requests"
  ON friend_requests FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update own received requests"
  ON friend_requests FOR UPDATE
  USING (auth.uid() = receiver_id);

-- علاقات الصداقة: يرى المستخدم صداقاته فقط
CREATE POLICY "Users can read own friendships"
  ON friendships FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own friendships"
  ON friendships FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert via accept function"
  ON friendships FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- عرض مناسب: قائمة أصدقائي مع ملفاتهم
-- ============================================================
CREATE OR REPLACE VIEW my_friends AS
SELECT f.user_id AS me,
       f.friend_id,
       p.username,
       p.display_name,
       p.avatar_url
  FROM friendships f
  JOIN profiles p ON p.id = f.friend_id;

-- ============================================================
-- الرسائل الخاصة بين الأصدقاء
-- ============================================================
CREATE TABLE direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

CREATE INDEX idx_direct_messages_conversation
  ON direct_messages(sender_id, receiver_id, created_at DESC);

ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;

-- يرى المستخدم رسائله الخاصة فقط (الصادر والوارد)
CREATE POLICY "Users can read own direct messages"
  ON direct_messages FOR SELECT
  USING (auth.uid() IN (sender_id, receiver_id));

CREATE POLICY "Users can send direct messages"
  ON direct_messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);
