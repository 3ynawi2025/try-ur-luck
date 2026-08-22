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
 * - شهادة + App ID: token مؤمّن كامل — مبني بـ uid=0 (wildcard)
 *   ليقبله العميل مهما كان معرّفه التلقائي (كان يُبنى بحساب نصي
 *   بينما العميل ينضم بـ uid=0 → فشل انضمام صامت).
 * - App ID فقط (بدون شهادة): يرجع "" (وضع App-ID-only،
 *   أمان أخف ويعمل للتجربة المحلية).
 * - لا App ID: يرجع 'dev_token_no_agora_config'.
 */
export function generateAgoraToken(channelName: string, _uid: string): string {
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

  // uid=0 → التوكن صالح لأي مستخدم ينضم للقناة (Wildcard)
  return RtcTokenBuilder.buildTokenWithUid(
    APP_ID,
    APP_CERTIFICATE,
    channelName,
    0,
    RtcRole.PUBLISHER,
    privilegeExpiredTs
  );
}

export { APP_ID as AGORA_APP_ID };
