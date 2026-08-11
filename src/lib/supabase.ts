// ============================================================
// جرب حظك — Supabase Client
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

// ===== Auth =====

export async function signUp(email: string, password: string, username: string) {
  const sb = getSupabase();
  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: { data: { username } },
  });
  if (error) throw new Error(error.message);
  return { userId: data.user?.id, user: data.user };
}

export async function signIn(email: string, password: string) {
  const sb = getSupabase();
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw new Error('البريد أو كلمة المرور خطأ');
  return {
    userId: data.user.id,
    token: data.session.access_token,
  };
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

// ===== Profiles =====

export async function getProfile(userId: string) {
  const sb = getSupabase();
  const { data, error } = await sb.from('profiles').select('*').eq('id', userId).single();
  if (error || !data) return null;
  return data;
}

export async function updateProfile(
  userId: string,
  updates: { username?: string; display_name?: string; avatar_url?: string }
) {
  const sb = getSupabase();
  const { error } = await sb.from('profiles').update(updates).eq('id', userId);
  if (error) throw new Error(error.message);
}

// ===== Balance =====

export async function getBalance(userId: string): Promise<number> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('profiles')
    .select('balance')
    .eq('id', userId)
    .single();
  if (error) throw new Error(error.message);
  return data?.balance ?? 0;
}

export async function getTransactions(userId: string, limit = 20) {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('balance_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data ?? [];
}
