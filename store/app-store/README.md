# 🍏 حزمة الرفع إلى App Store — جرب حظك

## حالة التسجيل
- **App Store Connect**: التطبيق مُنشأ ✅ — **App ID: 6804312275**
- رابط النسخة: https://appstoreconnect.apple.com/apps/6804312275/distribution/ios/version/inflight
- Bundle ID: `com.al3ynawi.jarebhazzak` (مسجل في فريق 3ynawitryurluck)
- Primary Language: **Arabic**

## محتويات الحزمة
| الملف | الغرض |
|---|---|
| `SUBMISSION-STEPS.md` | الخطوات الكاملة خطوة بخطوة |
| `metadata-ar.md` | كل نصوص المتجر بالعربية (اسم/وصف/كلمات مفتاحية/مراجعة) |
| `metadata-en.md` | الترجمة الإنجليزية المرجعية |
| `compliance-checklist.md` | قائمة مطابقة إرشادات Apple + أجوبة استبيان التصنيف العمري |
| `privacy-policy-ar.md` / `privacy-policy-en.md` | نص سياسة الخصوصية (منشور أيضًا على `/privacy` في السيرفر) |
| `screenshots/6.7/` | لقطات 1290×2796 (iPhone 6.7") |
| `screenshots/6.5/` | لقطات 1284×2778 (iPhone 6.5") |
| `screenshots/5.5/` | لقطات 1242×2208 (iPhone 5.5") |
| `screenshots/ipad/` | لقطات 2048×2732 (iPad 12.9") — مطلوبة لأن التطبيق يدعم الآيباد |

## روابط الستور المطلوبة
- Support URL: `https://jareb-hazzak-server.onrender.com/support`
- Privacy Policy URL: `https://jareb-hazzak-server.onrender.com/privacy`

## التحديث الهوائي (OTA) للنسخة المسجلة ✅
- نسخة الإنتاج مبنية بقناة `production` و runtimeVersion `1.0.0` — أي تحديث JS لاحق يصل للأجهزة جوًا عبر:
  ```bash
  eas update --branch production --message "وصف التحديث"
  ```
- بدون مراجعة جديدة طالما لم يتغير الكود الأصلي (native/أذونات/SDK) أو الغرض الأساسي للتطبيق.

## الأيقونة
- `assets/images/icon.png` — 1024×1024، RGB، **بدون شفافية** ✅ (مفحوصة آليًا)

## متطلبات حسابك قبل الرفع النهائي (أنت فقط — Account Holder)
1. **قبول اتفاقية Apple Developer Program المحدثة**: افتح https://developer.apple.com/account واقبلها.
2. **Trader Status (الاتحاد الأوروبي DSA)**: من App Store Connect → Business → Compliance، حدد حالتك التاجرية (فرد غير تاجر غالبًا) وإلا تُحذف النسخة من متجر الاتحاد الأوروبي.

## مراجعة التطبيق
- التسجيل في التطبيق **باسم مستخدم فقط** (لا كلمة مرور — جلسة مرتبطة بالجهاز).
- سجّل باسم أي مستخدم جديد ثم فعّل الذهبي مجانًا من المتجر (زر «فعّل الذهبي (تجريبي)») لتجربة الطاولات الخاصة.
- الرقاقات **افتراضية بالكامل** — لا مال حقيقي، لا شراء، لا تحويل.
