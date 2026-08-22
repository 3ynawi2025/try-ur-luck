// ============================================================
// جرب حظك — طبقة الاشتراك المميز (عادي / ذهبي) + صلاحية المدير
// الذهبي: شهر كامل من تاريخ التفعيل (gold_until).
// ============================================================

import { getSupabaseAdmin } from './supabaseAdmin';

export interface TierInfo {
  tier: 'regular' | 'gold';
  goldActive: boolean;
  goldUntil: string | null;
  isAdmin: boolean;
}

export const GOLD_DAYS = 30;

/** قراءة حالة اشتراك المستخدم الحالي. */
export async function getTierInfo(userId: string): Promise<TierInfo> {
  try {
    const { data } = await getSupabaseAdmin()
      .from('profiles')
      .select('tier, gold_until, is_admin')
      .eq('id', userId)
      .single();
    const tier = data?.tier === 'gold' ? 'gold' : 'regular';
    const goldUntil = data?.gold_until ? new Date(data.gold_until).toISOString() : null;
    const goldActive = tier === 'gold' && (!goldUntil || new Date(goldUntil).getTime() > Date.now());
    return { tier, goldActive, goldUntil: goldActive ? goldUntil : null, isAdmin: Boolean(data?.is_admin) };
  } catch {
    return { tier: 'regular', goldActive: false, goldUntil: null, isAdmin: false };
  }
}

/**
 * تفعيل الذهبي لـ GOLD_DAYS يومًا.
 * ⚠️ TODO مدفوعات حقيقية: هذه نسخة تجريبية — عند ربط مزود دفع
 * (Apple IAP / Google Play / بوابة خارجية) يجب نقل هذا الاستدعاء
 * إلى ما بعد تأكيد الدفع فقط.
 */
export async function activateGold(userId: string): Promise<TierInfo> {
  const until = new Date(Date.now() + GOLD_DAYS * 24 * 3600 * 1000).toISOString();
  const { error } = await getSupabaseAdmin()
    .from('profiles')
    .update({ tier: 'gold', gold_until: until })
    .eq('id', userId);
  if (error) throw new Error(error.message);
  return getTierInfo(userId);
}
