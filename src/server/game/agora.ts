// ============================================================
// جرب حظك — Agora Voice (Server)
// ============================================================

import { RtcTokenBuilder, RtcRole } from 'agora-access-token';

// ⚠️ الشهادة سر توقيع — تأتي من متغيرات البيئة فقط (لا fallback مضمّن).
const APP_ID = process.env.AGORA_APP_ID ?? '';
const APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE ?? '';

/**
 * يولد Token لانضمام المستخدم لقناة صوت Agora.
 *
 * - شهادة + App ID: token مؤمّن كامل.
 * - App ID فقط (بدون شهادة): يرجع "" (وضع App-ID-only،
 *   أمان أخف ويعمل للتجربة المحلية).
 * - لا App ID: يرجع 'dev_token_no_agora_config'.
 */
export function generateAgoraToken(channelName: string, uid: string): string {
  if (!APP_ID) {
    return 'dev_token_no_agora_config';
  }

  if (!APP_CERTIFICATE) {
    // وضع App-ID-only: توكن فارغ
    return '';
  }

  const expirationInSeconds = 3600;
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTimestamp + expirationInSeconds;

  // معرف المستخدم الحقيقي (string) بدل uid=0 الثابت للجميع
  return RtcTokenBuilder.buildTokenWithAccount(
    APP_ID,
    APP_CERTIFICATE,
    channelName,
    uid,
    RtcRole.PUBLISHER,
    privilegeExpiredTs
  );
}

export { APP_ID as AGORA_APP_ID };
