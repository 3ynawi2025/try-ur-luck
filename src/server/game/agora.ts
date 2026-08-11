// ============================================================
// جرب حظك — Agora Voice (Server)
// ============================================================

import { RtcTokenBuilder, RtcRole } from 'agora-access-token';

const APP_ID = process.env.AGORA_APP_ID || '';
const APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE || '';

/**
 * يولد Token لانضمام المستخدم لقناة صوت Agora
 * @param channelName — اسم القناة (عادةً table_<tableId>)
 * @param uid — معرف المستخدم (userId)
 * @returns Agora RTC token
 */
export function generateAgoraToken(channelName: string, uid: string): string {
  if (!APP_ID || !APP_CERTIFICATE) {
    // وضع offline: إرجاع token وهمي للتطوير المحلي
    return 'dev_token_no_agora_config';
  }

  const expirationInSeconds = 3600; // ساعة واحدة
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTimestamp + expirationInSeconds;

  const token = RtcTokenBuilder.buildTokenWithUid(
    APP_ID,
    APP_CERTIFICATE,
    channelName,
    0, // uid = 0 means Agora assigns one
    RtcRole.PUBLISHER,
    privilegeExpiredTs
  );

  return token;
}

export { APP_ID as AGORA_APP_ID };
