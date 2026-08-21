// ============================================================
// جرب حظك — Agora Voice Hook (نسخة الويب — بلا صوت أصلي)
// react-native-agora وحدة Native فقط؛ على الويب نعطل الصوت بأمان.
// ============================================================

import { useCallback, useState } from 'react';

export function useAgoraVoice() {
  const [isJoined, setIsJoined] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  const joinChannel = useCallback(async () => {
    // لا دعم للصوت على الويب حاليًا
  }, []);

  const leaveChannel = useCallback(async () => {
    setIsJoined(false);
  }, []);

  const toggleMute = useCallback(async () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    return newMuted;
  }, [isMuted]);

  const destroy = useCallback(async () => {
    setIsJoined(false);
  }, []);

  return { isJoined, isMuted, joinChannel, leaveChannel, toggleMute, destroy };
}
