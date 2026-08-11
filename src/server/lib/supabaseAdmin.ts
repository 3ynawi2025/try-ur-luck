// جرب حظك — Supabase Admin Client (Server-side)

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseAdminInstance: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (!supabaseAdminInstance) {
    const url = process.env.SUPABASE_URL || 'https://iycuncfqxjlcqhupyvyq.supabase.co';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5Y3VuY2ZxeGpsY3FodXB5dnlxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjQ4Njc0NywiZXhwIjoyMTAyMDYyNzQ3fQ.KRj7aq3gnNGsfVrd4cseCdZPptgnpAe9ZAbELfvlM3Q';

    supabaseAdminInstance = createClient(url, key);
  }
  return supabaseAdminInstance;
}

export async function verifyUserToken(token: string) {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb.auth.getUser(token);
  if (error) throw new Error('Invalid token');
  return data.user;
}

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
