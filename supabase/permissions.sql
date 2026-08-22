-- صلاحيات API — سياسة الأمان النهائية:
-- العميل لا يلمس الجداول مباشرة؛ كل القراءة/الكتابة عبر السيرفر (service_role).
-- ⚠️ لم نعد نمنح anon/authenticated أي شيء — أعِد تشغيل hardening.sql بعد أي تغيير هنا.

GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- (لا SELECT/INSERT/UPDATE عمومية — RLS والمنح الصارمة في hardening.sql)
