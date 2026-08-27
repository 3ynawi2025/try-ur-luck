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

## 2. بناء نسخة الإنتاج ورفعها (آلي — تم إنجازه)

البناء والرفع مؤتمتان الآن ببيانات اعتماد محلية + مفتاح App Store Connect API:

```bash
# بناء الإنتاج (بيانات الاعتماد من .eas-credentials/ — لا يتطلب تفاعلًا)
npx eas-cli build --platform ios --profile production --non-interactive

# رفع البناء إلى App Store Connect (TestFlight)
npx eas-cli submit --platform ios --profile production --id <BUILD_ID> --non-interactive
```

- **البيانات الحساسة** (غير مرفوعة في Git): مجلد `.eas-credentials/`:
  - `jareb_distribution.p12` (شهادة Apple Distribution من البوابة — كلمة المرور محفوظة محليًا في `credentials.json` غير المرفوع).
  - `Jareb_Hazzak_AppStore.mobileprovision` (بروفايل App Store).
  - `AuthKey_8BK9FT6FTN.p8` (مفتاح App Store Connect API — Key ID `8BK9FT6FTN`، Issuer `69a6de92-2723-47e3-e053-5b8c7c11a4d1`).
- `credentials.json` في جذر المشروع يشير لهذه الملفات (وضع `credentialsSource: local` في eas.json).
- إن ضاعت هذه الملفات: أنشئ شهادة جديدة من [البوابة](https://developer.apple.com/account/resources/certificates/add) (Apple Distribution ← ارفع CSR) وبروفايل App Store جديد بنفس الشهادة، ثم حدّث `credentials.json`.
- **انتبه**: `npx expo prebuild` يمسح مجلد `ios/` — لا تحفظ بيانات الاعتماد داخله أبدًا.

---

## 3. تعبئة بيانات المتجر (App Store Connect → App Information)

انسخ من `metadata-ar.md`:

| الحقل | المكان |
|---|---|
| Name / Subtitle | App Information |
| Category: **Games > Casino** + Secondary: Entertainment | App Information |
| Age Rating: أجب عن الاستبيان كما في `compliance-checklist.md` (سيُحسب **18+** بسبب Simulated Gambling) | App Information |
| Privacy Policy URL: `https://jareb-hazzak-server.onrender.com/privacy` | App Privacy |
| Support URL: `https://jareb-hazzak-server.onrender.com/support` | App Information |

### App Privacy (Nutrition Label)
- **Data Linked to You**: Email Address, User ID, Device ID (تُجمع لأمان الحساب).
- **Data Used to Track You**: **None** (لا يوجد تتبع).
- **Data Not Collected**: كل ما عدا ذلك (الصوت لا يُسجل ولا يُخزن).

### App Store > iOS App > 1.0.0
- Promotional Text، Description، Keywords: انسخ من `metadata-ar.md`.
- Review Notes: الصق نص **Review notes** من `metadata-ar.md` (يوضح أن الرقاقات افتراضية بالكامل ولا مال حقيقي).
- Demo account: التسجيل باسم مستخدم + كلمة مرور (٦ أحرف على الأقل) — أي حساب جديد يصلح للتجربة. اذكر اسمًا تجريبيًا وكلمة مروره في Review Notes عند التحديث القادم.
- Screenshots: ارفع لقطات `screenshots/6.9/*.png` (iPhone 6.9") و `screenshots/5.5/*.png` (iPhone 5.5") و `screenshots/ipad/*.png` (iPad).

> ✅ **تم إنجازه فعليًا (2026-08-23):** التطبيق مسجل في App Store Connect (App ID `6804312275`)، كل البيانات معبأة ومحفوظة، ملصق الخصوصية منشور (5 أنواع بيانات لغرض App Functionality فقط، بدون تتبع)، لقطات الشاشة مرفوعة (6.9"×6 + 5.5"×6 + iPad×6)، السعر مجاني في 174 دولة (كوريا مستثناة لاشتراطها رخصة RCN للتصنيف 19+)، التصنيف العمري 18+، والبناء 1.0.0(7) مرفوع إلى TestFlight.

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

## 📱 نسخة أندرويد للأصدقاء (APK) — جاهزة

APK الإصدار 1.0.0 (للتثبيت المباشر، بدون متجر):

```
https://expo.dev/artifacts/eas/LTuTtjsKTcxY_kZvlOLXQYnRhfrtaWGMzG7PGvzeYfI.apk
```

- لإعادة بنائه لاحقًا: `npx eas-cli build --platform android --profile preview`.
- الرابط الناتج يفتح على جهاز الأندرويد فيُثبَّت مباشرة. هذه النسخة بقناة `preview` — التحديثات تصل جوًا عبر OTA.
