// جرب حظك — Supabase Admin Client (Server-side)
//
// ⚠️ يجب توفير المتغيرين عبر البيئة فقط:
//   SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
// لا تضع المفتاح في الكود المصدري أبدًا (تمت إزالته من هنا في جولة التحصين).

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/** عميل جديد (غير مشترك) — للعمليات التي تغيّر جلسة العميل (تسجيل الدخول) */
export function createSupabaseAdminClient(): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      'Database not configured: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables'
    );
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

let supabaseAdminInstance: SupabaseClient | null = null;

/**
 * العميل الإداري المشترك — ⚠️ لا تستدعِ عليه signInWithPassword أبدًا:
 * تثبيت جلسة مستخدم عليه يحوّل كل الطلبات اللاحقة إلى دور authenticated
 * (بلا صلاحيات) بدل service_role.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (!supabaseAdminInstance) {
    supabaseAdminInstance = createSupabaseAdminClient();
  }
  return supabaseAdminInstance;
}

export async function verifyUserToken(token: string) {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb.auth.getUser(token);
  if (error) throw new Error('Invalid token');
  return data.user;
}
