# 🍏 دليل رفع «جرب حظك» إلى App Store Connect (خطوة بخطوة)

> هذا الدليل يلخّص كل خطوات التسجيل في Apple Developer وApp Store Connect.
> ملفات البيانات الجاهزة للنسخ/اللصق موجودة في هذا المجلد (`metadata-ar.md`، `compliance-checklist.md`…).
> لقطات الشاشة جاهزة في `store/app-store/screenshots/6.7/` و `5.5/`.

---

## 0. المتطلبات المسبقة

- حساب Apple Developer **مدفوع** ($99/سنة) مسجل بالبريد `al__3ynawi@hotmail.com` (الفريق: `2MQATMMP9B`).
- الـ bundle ID مسجل في Certificates, Identifiers & Profiles: **`com.al3ynawi.jarebhazzak`** (iOS > Identifiers > App IDs).
- شهادة توزيع App Store (Distribution Certificate) — سينشئها EAS تلقائيًا عند أول بناء production.

---

## 1. إنشاء سجل التطبيق في App Store Connect

1. افتح https://appstoreconnect.apple.com → **My Apps** → زر ➕ → **New App**.
2. املأ:
   - Platform: **iOS**
   - Name: **جرب حظك** (من `metadata-ar.md`)
   - Primary Language: **Arabic**
   - Bundle ID: `com.al3ynawi.jarebhazzak`
   - SKU: `jareb-hazzak-001`
   - User Access: Full Access
3. اضغط **Create**.

---

## 2. بناء نسخة الإنتاج ورفعها

من مجلد المشروع (التسجيل في EAS جاهز مسبقًا):

```bash
eas build --platform ios --profile production
```

- يبني `.ipa` بإصدار `1.0.0` و build number تلقائي، بقناة `production`.
- بعد نجاح البناء:

```bash
eas submit --platform ios
```

- إن طلب تسجيل الدخول لـ App Store Connect: أدخل بيانات حساب Apple (قد يتطلب رمز التحقق 2FA مرة واحدة).
- EAS يرفع البناء إلى **TestFlight** تلقائيًا.

> ملاحظة: إن لم ينجح `eas submit` غير التفاعلي من عندي، نفّذ الأمر أعلاه بنفسك من الطرفية — كل شيء مهيأ.

---

## 3. تعبئة بيانات المتجر (App Store Connect → App Information)

انسخ من `metadata-ar.md`:

| الحقل | المكان |
|---|---|
| Name / Subtitle | App Information |
| Category: **Games > Casino** + Secondary: Entertainment | App Information |
| Age Rating: أجب عن الاستبيان كما في `compliance-checklist.md` (سيُحسب **17+** بسبب Simulated Gambling) | App Information |
| Privacy Policy URL: `https://jareb-hazzak-server.onrender.com/privacy` | App Privacy |
| Support URL: `https://jareb-hazzak-server.onrender.com/support` | App Information |

### App Privacy (Nutrition Label)
- **Data Linked to You**: Email Address, User ID, Device ID (تُجمع لأمان الحساب).
- **Data Used to Track You**: **None** (لا يوجد تتبع).
- **Data Not Collected**: كل ما عدا ذلك (الصوت لا يُسجل ولا يُخزن).

### App Store > iOS App > 1.0.0
- Promotional Text، Description، Keywords: انسخ من `metadata-ar.md`.
- Review Notes: الصق نص **Review notes** من `metadata-ar.md` (يوضح أن الرقاقات افتراضية بالكامل ولا مال حقيقي).
- Demo account: سجّل حسابًا تجريبيًا (مثل `ssss`) واذكر بياناته في Review Notes.
- Screenshots: ارفع لقطات `screenshots/6.7/*.png` (مقاس iPhone 6.7") و `screenshots/5.5/*.png` (iPhone 5.5").

---

## 4. التحقق النهائي قبل Submit

- [ ] الأيقونة 1024×1024 PNG **بدون شفافية** (نتحقق منها ونعيد ترميزها آليًا قبل البناء).
- [ ] `ITSAppUsesNonExemptEncryption = false` في `app.json` (موجود).
- [ ] لا مشتريات داخلية حقيقية (المتجر تجريبي حاليًا — مذكور في Review Notes).
- [ ] التطبيق يعمل بلا انهيار (تم اختباره على جهازين حقيقيين).
- [ ] سياسة الخصوصية منشورة على رابط حقيقي (صفحة السيرفر).
- [ ] **الغموض**: الرقاقات افتراضية بالكامل، لا تحويل، لا مال حقيقي — اذكرها في كل مكان (Description + Review Notes + Age Rating).

---

## 5. بعد القبول (أو أثناء المراجعة)

- المراجعة تأخذ عادة 24-48 ساعة للمرة الأولى.
- الرفض الشائع الوحيد المحتمل: اعتبار اللعبة "قمارًا" — الحل الموثق في `compliance-checklist.md` (توضيح Social Casino + Virtual Currency + لا IAP حقيقي).
- التحديثات اللاحقة للكود JS تصل عبر OTA دون مراجعة جديدة: `eas update --branch production`.
- أي تغيير native/أذونات/ترقية SDK يتطلب بناء وإصدار جديد عبر TestFlight → مراجعة.

---

## 📱 نسخة أندرويد للأصدقاء (APK)

```bash
eas build --platform android --profile preview
```

الرابط الناتج يفتح على جهاز الأندرويد فيُثبَّت مباشرة (بدون متجر). لاحظ أن هذه النسخة بقناة `preview` — أي تحديث نجريه سيصلكم جوًا عبر OTA.
