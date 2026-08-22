// اختبارات وحدة لكلمات سر الطاولات الخاصة (HMAC+pepper + توافق قديم)
import { createHash } from 'node:crypto';
import { hashTablePassword, verifyTablePassword } from '../tablePassword';

describe('tablePassword', () => {
  it('يقبل كلمة السر الصحيحة بعد التجزئة الجديدة', () => {
    const stored = hashTablePassword('سِرّي 123');
    expect(stored.startsWith('h:')).toBe(true);
    expect(verifyTablePassword('سِرّي 123', stored)).toBe(true);
  });

  it('يرفض كلمة السر الخاطئة', () => {
    const stored = hashTablePassword('سِرّي 123');
    expect(verifyTablePassword('خطأ', stored)).toBe(false);
  });

  it('يرفض القيمة غير المعرّفة عندما توجد كلمة سر مخزّنة', () => {
    const stored = hashTablePassword('x');
    expect(verifyTablePassword(undefined, stored)).toBe(false);
  });

  it('يقبل null (طاولة بلا كلمة سر) دائمًا', () => {
    expect(verifyTablePassword(undefined, null)).toBe(true);
    expect(verifyTablePassword('أي شيء', null)).toBe(true);
  });

  it('يتوافق مع التجزئة القديمة SHA-256 المخزّنة سابقًا', () => {
    const legacy = createHash('sha256').update('قديم-123').digest('hex');
    expect(verifyTablePassword('قديم-123', legacy)).toBe(true);
    expect(verifyTablePassword('خاطئ', legacy)).toBe(false);
  });
});
