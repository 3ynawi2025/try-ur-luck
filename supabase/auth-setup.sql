-- ============================================================
-- جرب حظك — إعداد المصادقة المجهولة وإنشاء الحساب
-- شغّل هذا الملف في Supabase SQL Editor.
--
-- ملاحظة هامة: يجب أيضاً تفعيل "التسجيل المجهول" من لوحة التحكم:
--   Dashboard → Authentication → Sign In / Up → Providers
--   → enable "Anonymous Sign-Ins"
-- ============================================================

-- سياسة السماح للمستخدم بإنشاء ملفه الشخصي (إدراج صف واحد يخصّه)
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- (اختياري) السماح بإدراج الملف حتى لو كانت policy أعلاه غير كافية لبعض إصدارات supabase
-- لا حاجة لسياسة إضافية؛ auth.uid() = id تكفي لحصر الإدراج بمعرّف المستخدم نفسه.