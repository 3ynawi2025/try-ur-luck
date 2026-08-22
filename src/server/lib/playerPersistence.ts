// ============================================================
// جرب حظك — طبقة حفظ/تحميل بيانات اللاعب (مشتركة بين الطاولات والألعاب الفردية)
// موحّدة لتجنّب تكرار loadBalance/loadDisplayName/applyBalanceDelta في gameServer و soloGames.
// ============================================================

import { getSupabaseAdmin } from './supabaseAdmin';

/** تحميل رصيد اللاعب من Supabase (يعيد fallback للضيف أو عند الخطأ). */
export async function loadPlayerBalance(userId: string | null, fallback: number): Promise<number> {
  if (!userId) return fallback;
  try {
    const { data } = await getSupabaseAdmin()
      .from('profiles')
      .select('balance')
      .eq('id', userId)
      .single();
    if (data && typeof data.balance === 'number') return Math.max(0, data.balance);
  } catch {
    /* ignore */
  }
  return fallback;
}

/** تحميل الاسم الظاهر للاعب (يعيد fallback للضيف أو عند الخطأ). */
export async function loadPlayerDisplayName(userId: string | null, fallback: string): Promise<string> {
  if (!userId) return fallback;
  try {
    const { data } = await getSupabaseAdmin()
      .from('profiles')
      .select('display_name')
      .eq('id', userId)
      .single();
    if (data?.display_name) return String(data.display_name).slice(0, 40);
  } catch {
    /* ignore */
  }
  return fallback;
}

/** تطبيق دلتا رصيد ذرّيًا (RPC) + تسجيل حركة. يرمي عند الفشل. */
export async function applyBalanceDelta(
  userId: string,
  delta: number,
  description: string,
  type?: 'win' | 'loss' | 'gift'
): Promise<void> {
  const sb = getSupabaseAdmin();
  const { error } = await sb.rpc('apply_balance_delta', {
    p_user_id: userId,
    p_delta: delta,
  });
  if (error) throw error;

  await sb.from('balance_transactions').insert({
    user_id: userId,
    amount: delta,
    type: type ?? (delta > 0 ? 'win' : 'loss'),
    description,
  });
}

/** تحميل حالة حساب اللاعب (active/muted/banned) — للتحكم في بث الصوت. */
export async function loadPlayerStatus(
  userId: string | null
): Promise<'active' | 'muted' | 'banned'> {
  if (!userId) return 'active';
  try {
    const { data } = await getSupabaseAdmin()
      .from('profiles')
      .select('status')
      .eq('id', userId)
      .single();
    if (data?.status === 'muted' || data?.status === 'banned') return data.status;
  } catch {
    /* ignore */
  }
  return 'active';
}
