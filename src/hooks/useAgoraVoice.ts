// ============================================================
// جرب حظك — Agora Voice Hook (Client)
// ============================================================

import { useEffect, useRef, useState, useCallback } from 'react';
import { Platform, PermissionsAndroid } from 'react-native';
import {
  createAgoraRtcEngine,
  IRtcEngine,
  ChannelProfileType,
  ClientRoleType,
} from 'react-native-agora';

let engineRef: IRtcEngine | null = null;

/**
 * تحويل حتمي من معرّف اللاعب النصي إلى معرّف Agora رقمي موجب.
 * FNV-1a 32-bit ثم إخفاء بتّ الإشارة (& 0x7FFFFFFF) لضمان رقم موجب
 * ضمن حدود Agora — نفس المعرّف في كل مرة لنفس اللاعب، مما يتيح
 * الكتم الفردي الحتمي (نفس uid الذي انضم به اللاعب).
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
  const [joinError, setJoinError] = useState<string | null>(null);
  // حالة كتم الأصوات البعيدة
  const [muteAllRemote, setMuteAllRemote] = useState(false);
  const [mutedRemoteUids, setMutedRemoteUids] = useState<number[]>([]);
  const engineCreated = useRef(false);

  // مراجع تبقى متزامنة مع الحالة كي تقرأها مستمعات الأحداث
  // (تُسجَّل مرة واحدة لكل مثيل محرك جديد ولا تلتقط قيم الحالة القديمة)
  const muteAllRemoteRef = useRef(false);
  const mutedRemoteUidsRef = useRef<number[]>([]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'إذن المايكروفون',
            message: 'يحتاج التطبيق إذن المايك للدردشة الصوتية',
            buttonPositive: 'موافق',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch {
        return false;
      }
    }
    return true;
  }, []);

  const joinChannel = useCallback(
    async (appId: string, channelName: string, token: string, uid = 0) => {
      const hasPermission = await requestPermission();
      if (!hasPermission) return;

      if (!engineRef) {
        engineRef = createAgoraRtcEngine();
        engineCreated.current = true;

        // إشعارات الأخطاء بدل الفشل الصامت
        // تُسجَّل مرة واحدة لكل مثيل محرك جديد (بعد destroy/release يُعاد إنشاؤها معه)
        engineRef.addListener('onError', (err: any) => {
          setJoinError(`تعذر الاتصال الصوتي (${String(err?.code ?? err)})`);
        });
        engineRef.addListener('onJoinChannelSuccess', () => {
          setJoinError(null);
          // بعد الانضمام الناجح: أعد توجيه الصوت للسماعة الخارجية
          engineRef?.setEnableSpeakerphone(true);
        });
        // عند انضمام مستخدم بعيد: طبّق حالة الكتم الحالية عليه فورًا
        engineRef.addListener('onUserJoined', (_connection, uid) => {
          if (
            muteAllRemoteRef.current ||
            mutedRemoteUidsRef.current.includes(uid)
          ) {
            engineRef?.muteRemoteAudioStream(uid, true);
          }
        });
        // عند مغادرة مستخدم بعيد: نظّف معرفه من القائمة
        engineRef.addListener('onUserOffline', (_connection, uid) => {
          const next = mutedRemoteUidsRef.current.filter((u) => u !== uid);
          if (next.length !== mutedRemoteUidsRef.current.length) {
            mutedRemoteUidsRef.current = next;
            setMutedRemoteUids(next);
          }
        });
      }

      const engine = engineRef;

      engine.initialize({ appId });
      engine.setChannelProfile(ChannelProfileType.ChannelProfileCommunication);
      engine.setClientRole(ClientRoleType.ClientRoleBroadcaster);
      // المسار الافتراضي: السماعة الخارجية (قبل تمكين الصوت)
      engine.setDefaultAudioRouteToSpeakerphone(true);
      engine.enableAudio();
      engine.enableAudioVolumeIndication(500, 3, false);

      engine.joinChannel(token, channelName, uid, {});
      // بعد أمر الانضمام مباشرة (يفعّلها SDK بعد الانضمام)
      engine.setEnableSpeakerphone(true);
      engine.muteLocalAudioStream(true); // mute افتراضيًا

      setIsJoined(true);
      setIsMuted(true);
    },
    [requestPermission]
  );

  const leaveChannel = useCallback(async () => {
    if (engineRef) {
      // إسكات المايك أولًا ثم تعطيل الصوت ثم مغادرة القناة — ضمان إغلاق جلسة الصوت على iOS
      engineRef.muteLocalAudioStream(true);
      engineRef.disableAudio();
      engineRef.leaveChannel();
      setIsJoined(false);
      setIsMuted(true);
      // إعادة ضبط حالة كتم الأصوات البعيدة
      muteAllRemoteRef.current = false;
      mutedRemoteUidsRef.current = [];
      setMuteAllRemote(false);
      setMutedRemoteUids([]);
    }
  }, []);

  const toggleMute = useCallback(async () => {
    if (!engineRef) return isMuted;
    const newMuted = !isMuted;
    engineRef.muteLocalAudioStream(newMuted);
    setIsMuted(newMuted);
    return newMuted;
  }, [isMuted]);

  const toggleMuteAllRemote = useCallback(() => {
    if (!engineRef) return;
    const next = !muteAllRemoteRef.current;
    muteAllRemoteRef.current = next;
    engineRef.muteAllRemoteAudioStreams(next);
    setMuteAllRemote(next);
  }, []);

  const toggleRemoteMute = useCallback((uid: number) => {
    if (!engineRef) return;
    const muted = !mutedRemoteUidsRef.current.includes(uid);
    engineRef.muteRemoteAudioStream(uid, muted);
    const next = muted
      ? [...mutedRemoteUidsRef.current, uid]
      : mutedRemoteUidsRef.current.filter((u) => u !== uid);
    mutedRemoteUidsRef.current = next;
    setMutedRemoteUids(next);
  }, []);

  const isRemoteMuted = useCallback(
    (uid: number): boolean => mutedRemoteUids.includes(uid),
    [mutedRemoteUids]
  );

  const destroy = useCallback(async () => {
    if (engineRef) {
      engineRef.leaveChannel();
      engineRef.release();
      engineRef = null;
      engineCreated.current = false;
      setIsJoined(false);
      // إعادة ضبط حالة كتم الأصوات البعيدة
      muteAllRemoteRef.current = false;
      mutedRemoteUidsRef.current = [];
      setMuteAllRemote(false);
      setMutedRemoteUids([]);
    }
  }, []);

  return {
    isJoined,
    isMuted,
    joinError,
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
