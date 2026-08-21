// ============================================================
// جرب حظك — Supabase Client
// المصادقة الوحيدة: جلسة يصدرها خادم اللعبة عند التسجيل،
// يخزّنها supabase-js ويجددها تلقائيًا (autoRefreshToken).
// ============================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config';

let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!supabaseInstance) {
    supabaseInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }
  return supabaseInstance;
}

/**
 * توكن الوصول الحالي (JWT) — يُرسل مع كل طلب REST وفي مصافحة السوكت.
 * supabase-js يجدده تلقائيًا بفضل autoRefreshToken.
 */
export async function getAccessToken(): Promise<string | null> {
  const sb = getSupabase();
  const { data } = await sb.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function signOut() {
  const sb = getSupabase();
  await sb.auth.signOut();
}

export async function getSession() {
  const sb = getSupabase();
  const { data } = await sb.auth.getSession();
  return data.session;
}
