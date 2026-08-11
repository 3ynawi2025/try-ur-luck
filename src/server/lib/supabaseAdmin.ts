// ============================================================
// جرب حظك — Supabase Admin Client (Server-side only)
// ============================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseAdminInstance: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (!supabaseAdminInstance) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
    }

    supabaseAdminInstance = createClient(url, key);
  }
  return supabaseAdminInstance;
}

// المصادقة باستخدام JWT من العميل
export async function verifyUserToken(token: string) {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb.auth.getUser(token);
  if (error) throw new Error('Invalid token');
  return data.user;
}

// عمليات الموديريشن
export async function checkUserReports(userId: string): Promise<number> {
  const sb = getSupabaseAdmin();
  const { count, error } = await sb
    .from('reports')
    .select('*', { count: 'exact', head: true })
    .eq('reported_id', userId)
    .eq('status', 'pending');

  if (error) return 0;
  return count || 0;
}

export async function applyPenalty(userId: string, type: 'mute' | 'ban' | 'delete', reason: string) {
  const sb = getSupabaseAdmin();
  await sb.from('penalties').insert({
    user_id: userId,
    type,
    reason,
    expires_at: type === 'mute' ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : null,
  });
}
