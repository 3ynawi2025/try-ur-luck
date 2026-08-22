/* eslint-env node */
// ============================================================
// جرب حظك — Weekly Refill Cron Job
// يجدد الرصيد كل جمعة 12 ظهرًا بتوقيت السعودية
// ============================================================

// تحميل .env محليًا (Node ≥ 20.12) — في Render تأتي من البيئة مباشرة
try {
  process.loadEnvFile?.();
} catch {
  /* ignore */
}

const { createClient } = require("@supabase/supabase-js");

async function run() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error("❌ SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required");
    process.exit(1);
  }

  const supabase = createClient(url, key);

  console.log(`🕐 Weekly refill started: ${new Date().toISOString()}`);

  // استدعاء دالة weekly_refill في قاعدة البيانات
  const { error } = await supabase.rpc("weekly_refill");

  if (error) {
    console.error("❌ Refill failed:", error.message);
    process.exit(1);
  }

  console.log("✅ Weekly refill completed successfully");
  process.exit(0);
}

run();
