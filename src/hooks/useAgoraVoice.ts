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

export function useAgoraVoice() {
  const [isJoined, setIsJoined] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [joinError, setJoinError] = useState<string | null>(null);
  const engineCreated = useRef(false);

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
    async (appId: string, channelName: string, token: string) => {
      const hasPermission = await requestPermission();
      if (!hasPermission) return;

      if (!engineRef) {
        engineRef = createAgoraRtcEngine();
        engineCreated.current = true;
      }

      const engine = engineRef;

      engine.initialize({ appId });
      engine.setChannelProfile(ChannelProfileType.ChannelProfileCommunication);
      engine.setClientRole(ClientRoleType.ClientRoleBroadcaster);
      engine.enableAudio();
      engine.enableAudioVolumeIndication(500, 3, false);

      // إشعارات الأخطاء بدل الفشل الصامت
      engine.addListener('onError', (err: any) => {
        setJoinError(`تعذر الاتصال الصوتي (${String(err?.code ?? err)})`);
      });
      engine.addListener('onJoinChannelSuccess', () => setJoinError(null));

      engine.joinChannel(token, channelName, 0, {});
      engine.muteLocalAudioStream(true); // mute افتراضيًا

      setIsJoined(true);
      setIsMuted(true);
    },
    [requestPermission]
  );

  const leaveChannel = useCallback(async () => {
    if (engineRef) {
      engineRef.leaveChannel();
      setIsJoined(false);
    }
  }, []);

  const toggleMute = useCallback(async () => {
    if (!engineRef) return isMuted;
    const newMuted = !isMuted;
    engineRef.muteLocalAudioStream(newMuted);
    setIsMuted(newMuted);
    return newMuted;
  }, [isMuted]);

  const destroy = useCallback(async () => {
    if (engineRef) {
      engineRef.leaveChannel();
      engineRef.release();
      engineRef = null;
      engineCreated.current = false;
      setIsJoined(false);
    }
  }, []);

  return {
    isJoined,
    isMuted,
    joinError,
    joinChannel,
    leaveChannel,
    toggleMute,
    destroy,
  };
}
