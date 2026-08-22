// ============================================================
// جرب حظك — كلمات سر الطاولات الخاصة
// HMAC-SHA256 مع pepper من البيئة (بدل SHA-256 المملّح سابقًا).
// صيغة التخزين: "h:" + hex — أما القيم القديمة (SHA-256 عادي) فتُقبل مؤقتًا للتوافق.
// ============================================================

import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

// pepper سرّي من البيئة؛ القيمة الافتراضية للتطوير فقط — ضع TABLE_PASSWORD_PEPPER في الإنتاج
const PEPPER = process.env.TABLE_PASSWORD_PEPPER || 'try-ur-luck-dev-pepper';

/** تجزئة كلمة سر الطاولة بصيغة التخزين الحالية. */
export function hashTablePassword(plain: string): string {
  return 'h:' + createHmac('sha256', PEPPER).update(String(plain)).digest('hex');
}

/**
 * تحقق بكلمة السر المخزّنة.
 * stored === null تعني طاولة بلا كلمة سر (مقبول دائمًا).
 * يقبل الصيغة الجديدة "h:..." والصيغة القديمة (SHA-256) للتوافق.
 */
export function verifyTablePassword(plain: string | undefined, stored: string | null): boolean {
  if (!stored) return true;
  if (!plain) return false;
  if (stored.startsWith('h:') && stored.length === 66) {
    const expected = hashTablePassword(plain).slice(2);
    return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(stored.slice(2), 'hex'));
  }
  const legacy = createHash('sha256').update(String(plain)).digest('hex');
  return legacy === stored;
}
