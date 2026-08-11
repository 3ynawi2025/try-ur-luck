# 🚀 جرب حظك — دليل النشر

## 1. Render (السيرفر)

### A. ربط GitHub تلقائيًا
1. افتح https://dashboard.render.com
2. **New → Blueprint**
3. اختر مستودع `3ynawi2025/try-ur-luck`
4. أضف متغيرات البيئة في Render:

```
SUPABASE_SERVICE_ROLE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5Y3VuY2ZxeGpsY3FodXB5dnlxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjQ4Njc0NywiZXhwIjoyMTAyMDYyNzQ3fQ.KRj7aq3gnNGsfVrd4cseCdZPptgnpAe9ZAbELfvlM3Q

AGORA_APP_ID = (من dashboard.agora.io)
AGORA_APP_CERTIFICATE = (من dashboard.agora.io)
```

5. اضغط **Apply**

### B. السيرفر بينشأ تلقائيًا:
- **Web Service**: Node.js + Socket.io
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
cd ~/projects/try-ur-luck
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

## 3. Agora (الصوت)

1. سجل في https://console.agora.io
2. أنشئ مشروع → احصل على App ID + App Certificate
3. أضفهم في Render Environment Variables

---

## 4. ملاحظات مهمة

- **التطبيق جاهز للتجربة** بعد تشغيل السيرفر على Render
- **EAS Build** يأخذ ~15-20 دقيقة للـ iOS
- **Agora** يحتاج App ID حقيقي ليعمل الصوت (مجاني لـ 10,000 دقيقة)
- **السيرفر** على Render Starter = $7/شهر

---

## 5. هيكل المشروع النهائي

```
38 ملفًا | 7 commits | 0 errors
✅ 14/16 مهمة مكتملة
```
