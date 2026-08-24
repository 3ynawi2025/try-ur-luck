// ============================================================
// جرب حظك — Agora Voice Hook (نسخة الويب — بلا صوت أصلي)
// react-native-agora وحدة Native فقط؛ على الويب نعطل الصوت بأمان.
// ============================================================

import { useCallback, useState } from 'react';

/**
 * تحويل حتمي من معرّف اللاعب النصي إلى معرّف Agora رقمي موجب.
 * (مطابق لنسخة Native لضمان توافق الواجهة؛ لا يعتمد على أي Native API)
 */
export function agoraUidFor(id: string): number {
  let hash = 0x811c9dc5; // FNV offset basis (32-bit)
  for (let i = 0; i < id.length; i++) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193); // FNV prime
  }
  return (hash >>> 0) & 0x7fffffff;
}

export function useAgoraVoice() {
  const [isJoined, setIsJoined] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  // حالة كتم الأصوات البعيدة (no-op على الويب — تحافظ على الحالة فقط)
  const [muteAllRemote, setMuteAllRemote] = useState(false);
  const [mutedRemoteUids, setMutedRemoteUids] = useState<number[]>([]);

  const joinChannel = useCallback(
    async (_appId: string, _channelName: string, _token: string, _uid = 0) => {
      // لا دعم للصوت على الويب حاليًا
    },
    []
  );

  const leaveChannel = useCallback(async () => {
    setIsJoined(false);
    setMuteAllRemote(false);
    setMutedRemoteUids([]);
  }, []);

  const toggleMute = useCallback(async () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    return newMuted;
  }, [isMuted]);

  const toggleMuteAllRemote = useCallback(() => {
    setMuteAllRemote((prev) => !prev);
  }, []);

  const toggleRemoteMute = useCallback((uid: number) => {
    setMutedRemoteUids((prev) =>
      prev.includes(uid) ? prev.filter((u) => u !== uid) : [...prev, uid]
    );
  }, []);

  const isRemoteMuted = useCallback(
    (uid: number): boolean => mutedRemoteUids.includes(uid),
    [mutedRemoteUids]
  );

  const destroy = useCallback(async () => {
    setIsJoined(false);
    setMuteAllRemote(false);
    setMutedRemoteUids([]);
  }, []);

  return {
    isJoined,
    isMuted,
    muteAllRemote,
    mutedRemoteUids,
    joinChannel,
    leaveChannel,
    toggleMute,
    toggleMuteAllRemote,
    toggleRemoteMute,
    isRemoteMuted,
    destroy,
  };
}
