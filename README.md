# جرب حظك — try ur luck

كازينو اجتماعي مجاني 100% للجمهور الخليجي.

## المكدس

- **Mobile**: React Native + Expo SDK 57
- **Backend**: Node.js + Express + Socket.io
- **Database**: Supabase (PostgreSQL)
- **Voice**: Agora.io
- **Hosting**: Render Pro

## التشغيل محليًا

### 1. تثبيت الاعتماديات

```bash
npm install
```

### 2. نسخ متغيرات البيئة

```bash
cp .env.example .env
# عدّل القيم حسب مشروع Supabase وRender وAgora
```

### 3. تشغيل الخادم

```bash
npm run server:dev
```

### 4. تشغيل تطبيق Expo

```bash
npx expo start
```

## بنية المجلدات

```
├── src/
│   ├── app/           # شاشات expo-router
│   ├── components/    # مكونات الواجهة
│   ├── constants/     # theme وثوابت
│   ├── lib/            # clients (Supabase, Agora)
│   ├── server/         # game server + API
│   └── stores/         # Zustand stores
├── supabase/
│   └── schema.sql      # مخطط قاعدة البيانات
├── DESIGN.md           # التصميم التفصيلي
└── README.md
```

## الميزات المخططة MVP

- تسجيل دخول برقم الجوال (OTP).
- رصيد أسبوعي ثابت يتجدد كل جمعة.
- تكساس هولدم وبلاك جاك.
- طاولات عامة وخاصة.
- صوت فوري عبر Agora.
- نظام تبليغ وعقوبات.
- مكافحة غش server-authoritative.

---

> ملاحظة قانونية: التطبيق لا يتضمن قمارًا حقيقيًا. الدراهم افتراضية ولا يمكن صرفها.
