# 🚀 جرب حظك — دليل النشر

## 1. Render (السيرفر)

### A. ربط GitHub تلقائيًا
1. افتح https://dashboard.render.com
2. **New → Blueprint**
3. اختر مستودع `3ynawi2025/try-ur-luck`
4. أضف متغيرات البيئة في Render:

```
SUPABASE_SERVICE_ROLE_KEY = (من لوحة Supabase → Settings → API — ⚠️ دوّره بعد التسريب السابق)
SUPABASE_URL = https://iycuncfqxjlcqhupyvyq.supabase.co

AGORA_APP_ID = (من dashboard.agora.io)
AGORA_APP_CERTIFICATE = (من dashboard.agora.io — ⚠️ دوّره بعد التسريب السابق)
```

5. اضغط **Apply**

### B. السيرفر بينشأ تلقائيًا:
- **Web Service**: Node.js + Socket.io (يُبنى بـ `server:build` ويُشغَّل `node dist/index.js` مع فحص صحة على `/health`)
- **Cron Job**: تجديد الرصيد كل جمعة 9:00 UTC

---

## 2. EAS Build (تطبيق iOS/Android)

### A. تثبيت EAS
```bash
npm install -g eas-cli
eas login
```

### B. تهيئة المشروع
```bash
cd /path/to/try-ur-luck   # مجلد المشروع محليًا
eas init
# اختر المشروع أو أنشئ جديد
```

### C. بناء iOS
```bash
eas build --platform ios --profile production
```

### D. رفع لـ TestFlight
```bash
eas submit --platform ios
```

---

## 2ب. التحديث الهوائي OTA (بعد أول تثبيت)

التطبيق مفعّل بـ `expo-updates` (قناة `preview` للتجربة، `production` للنشر). بعد تثبيت النسخة الأساسية مرة واحدة:

```bash
# كل تغيير كود (JS/TS/أصول) — يصل للجهازين تلقائيًا عند فتح التطبيق:
eas update --branch preview --message "وصف مختصر للتحديث"

# للنسخة الإنتاجية:
eas update --branch production --message "..."

# عرض آخر التحديثات:
eas update:list
```

**متى تحتاج بناء جديد بدل OTA؟** فقط عندما يتغير كود أصلي: إضافة/إزالة حزم native، تعديل `app.json` (أذونات/plugins)، ترقية SDK، أو تغيير `runtimeVersion` (ارفع الرقم في `app.json` ثم ابنِ من جديد — الأجهزة ذات الرقم القديم تتجاهل تحديثات الرقم الجديد).

---

## 3. Agora (الصوت)

1. سجل في https://console.agora.io
2. أنشئ مشروع → احصل على App ID + App Certificate
3. أضفهم في Render Environment Variables

---

## 4. ملاحظات مهمة

- **قبل النشر الأول:**
  1. شغّل `supabase/hardening.sql` في SQL Editor (تحديث رصيد ذرّي + إصلاح التجديد + قفل RLS/الصلاحيات).
  2. **دوّر مفتاحي `SUPABASE_SERVICE_ROLE_KEY` و`AGORA_APP_CERTIFICATE`** — كانا مكشوفين في مستودع git سابقًا (Supabase Dashboard → Settings → API، وAgora Console).
  3. ضع المفتاحين الجديدين في Render Environment Variables (الخدمة تقرؤهما من البيئة فقط الآن).
- **التطبيق جاهز للتجربة** بعد تشغيل السيرفر على Render
- **EAS Build** يأخذ ~15-20 دقيقة للـ iOS
- **Agora** يحتاج App ID حقيقي ليعمل الصوت (مجاني لـ 10,000 دقيقة)
- **السيرفر** على Render Starter = $7/شهر

---

## 5. الفحوصات

```
tsc --noEmit      ✅ 0 أخطاء
اختبارات المحركات  ✅ 181/181 (6 suites)
eslint            ✅ 0 أخطاء (تحذيرات أسلوبية فقط)
server:build      ✅ dist/index.js
```
