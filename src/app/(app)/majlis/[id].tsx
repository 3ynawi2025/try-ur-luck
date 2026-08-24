// ============================================================
// جرب حظك — مجلس (غرفة صوتية)
// انضمام صوتي عبر Agora + أفاتارات الحضور + كتم + مشاركة الرمز.
// ============================================================

import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Share } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Screen from '../../../components/ui/Screen';
import GameHeader from '../../../components/game/GameHeader';
import GoldButton from '../../../components/ui/GoldButton';
import Avatar from '../../../components/ui/Avatar';
import { Badge } from '../../../components/ui/Bits';
import { MicIcon, MicOffIcon, MajlisIcon, LockIcon, SpeakerIcon, SpeakerOffIcon } from '../../../components/icons/GameIcons';
import { apiFetch } from '../../../lib/api';
import { useAgoraVoice, agoraUidFor } from '../../../hooks/useAgoraVoice';
import { useAuthStore } from '../../../stores/authStore';
import { AGORA_APP_ID } from '../../../lib/config';
import {
  COLORS,
  FONTS,
  TYPE,
  SPACING,
  RADIUS,
} from '../../../constants/theme';

interface Member {
  userId: string;
  username: string;
  displayName: string;
}

export default function MajlisRoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const profile = useAuthStore((s) => s.profile);
  const {
    isMuted,
    joinChannel,
    toggleMute,
    destroy,
    muteAllRemote,
    toggleMuteAllRemote,
    mutedRemoteUids,
    toggleRemoteMute,
  } = useAgoraVoice();

  const [room, setRoom] = useState<{ name: string; is_private: boolean; code?: string | null } | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [err, setErr] = useState<string | null>(null);

  // ===== انضمام (idempotent) + صوت =====
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await apiFetch<{ room: any; members: Member[]; token: string }>('/api/majlis/join', {
          method: 'POST',
          body: JSON.stringify({ roomId: id }),
        });
        if (cancelled) return;
        setRoom(r.room);
        setMembers(r.members ?? []);
        // قناة الصوت — انضم فورًا (كتم افتراضي) بمعرف حتمي يمكّن الكتم الفردي
        const myUid = profile?.id ? agoraUidFor(profile.id) : 0;
        joinChannel(AGORA_APP_ID, `majlis-${id}`, r.token, myUid).catch(() => {});
      } catch {
        if (!cancelled) setErr('تعذّر الانضمام للمجلس');
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ===== فصل الصوت فور مغادرة الشاشة (حتى مع بقائها في الـ Stack) =====
  useEffect(() => {
    return () => {
      destroy().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===== مغادرة =====
  const leave = useCallback(async () => {
    try {
      await apiFetch('/api/majlis/leave', { method: 'POST', body: JSON.stringify({ roomId: id }) });
    } catch {
      /* ignore */
    }
    destroy().catch(() => {});
    router.back();
  }, [id, destroy]);

  const shareCode = async () => {
    if (!room?.code) return;
    try {
      await Share.share({
        message: `🎙️ انضم لمجلسي «${room.name}» في جرب حظك!\nرمز الدخول: ${room.code}\njareb-hazzak://(app)/majlis`,
      });
    } catch {
      /* ignore */
    }
  };

  return (
    <Screen safeTop={false} style={styles.screen}>
      <LinearGradient colors={[COLORS.bgSoft, COLORS.bg, COLORS.surfaceSunken]} style={StyleSheet.absoluteFill} />

      <View style={{ paddingTop: insets.top }}>
        <GameHeader title={room?.name ?? 'المجلس'} onBack={leave} />
      </View>

      {err ? (
        <View style={styles.center}>
          <Text style={styles.errText}>{err}</Text>
          <GoldButton title="رجوع" onPress={() => router.back()} />
        </View>
      ) : (
        <View style={styles.body}>
          {/* ===== شعار المجلس ===== */}
          <View style={styles.emblem}>
            <View style={styles.emblemRing}>
              <MajlisIcon size={44} color={COLORS.goldLight} />
            </View>
            <Text style={styles.roomName}>{room?.name ?? '…'}</Text>
            <View style={styles.metaRow}>
              <Badge label={`${members.length} حاضر`} tone="gold" />
              {room?.is_private && !!room?.code && (
                <Pressable style={styles.codeChip} onPress={shareCode}>
                  <LockIcon size={12} color={COLORS.goldLight} />
                  <Text style={styles.codeChipText}>{room.code}</Text>
                </Pressable>
              )}
            </View>
          </View>

          {/* ===== الحضور ===== */}
          <View style={styles.membersGrid}>
            {members.map((m) => {
              const isSelf = m.userId === profile?.id;
              const muted = !isSelf && mutedRemoteUids.includes(agoraUidFor(m.userId));
              return (
                <Pressable
                  key={m.userId}
                  style={styles.member}
                  disabled={isSelf}
                  onPress={() => toggleRemoteMute(agoraUidFor(m.userId))}
                >
                  <Avatar
                    name={m.displayName}
                    size={56}
                    showBorder
                    isActive={isSelf && !isMuted}
                  />
                  {!isSelf && (
                    <View style={[styles.memberMute, muted && styles.memberMuteOn]}>
                      {muted ? (
                        <SpeakerOffIcon size={13} color={COLORS.textDim} />
                      ) : (
                        <SpeakerIcon size={13} color={COLORS.text} />
                      )}
                    </View>
                  )}
                  <Text style={styles.memberName} numberOfLines={1}>
                    {isSelf ? 'أنت' : m.displayName}
                  </Text>
                </Pressable>
              );
            })}
            {members.length === 0 && (
              <Text style={styles.emptyText}>لا أحد هنا بعد — شارك الرمز وادعُ أصدقاءك</Text>
            )}
          </View>

          {/* ===== التحكم ===== */}
          <View style={[styles.controls, { paddingBottom: Math.max(insets.bottom, SPACING.md) }]}>
            <Pressable
              style={[styles.micBtn, !isMuted && styles.micBtnLive]}
              onPress={() => toggleMute()}
            >
              {isMuted ? (
                <MicOffIcon size={26} color={COLORS.textDim} />
              ) : (
                <MicIcon size={26} color={COLORS.onGold} />
              )}
              <Text style={[styles.micLabel, !isMuted && styles.micLabelLive]}>
                {isMuted ? 'تكلم' : 'كتم'}
              </Text>
            </Pressable>
            <View style={styles.sideActions}>
              <Pressable
                style={[styles.speakerBtn, muteAllRemote && styles.speakerBtnOn]}
                onPress={() => toggleMuteAllRemote()}
              >
                {muteAllRemote ? (
                  <SpeakerOffIcon size={20} color={COLORS.textDim} />
                ) : (
                  <SpeakerIcon size={20} color={COLORS.text} />
                )}
                <Text style={styles.speakerLabel}>
                  {muteAllRemote ? 'تشغيل الأصوات' : 'كتم الجميع'}
                </Text>
              </Pressable>
              <GoldButton title="مغادرة المجلس" variant="ghost" onPress={leave} />
            </View>
          </View>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: COLORS.bg },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.lg,
  },
  errText: {
    fontFamily: FONTS.ar.medium,
    fontSize: TYPE.small.fontSize,
    color: COLORS.textDim,
  },
  body: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    gap: SPACING.xl,
  },
  emblem: {
    alignItems: 'center',
    gap: SPACING.md,
    paddingTop: SPACING.xl,
  },
  emblemRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.hairlineGold,
    backgroundColor: 'rgba(201,169,97,0.08)',
  },
  roomName: {
    fontFamily: FONTS.ar.bold,
    fontSize: TYPE.h2.fontSize,
    color: COLORS.text,
    textAlign: 'center',
  },
  metaRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  codeChip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.hairlineGold,
    backgroundColor: 'rgba(201,169,97,0.08)',
  },
  codeChipText: {
    fontFamily: FONTS.num.bold,
    fontSize: TYPE.caption.fontSize,
    color: COLORS.goldLight,
    letterSpacing: 2,
  },
  membersGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignContent: 'flex-start',
    justifyContent: 'center',
    gap: SPACING.lg,
    paddingTop: SPACING.md,
  },
  member: {
    alignItems: 'center',
    gap: SPACING.xs,
    width: 84,
  },
  memberMute: {
    position: 'absolute',
    top: 2,
    left: 2,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
  },
  memberMuteOn: {
    borderColor: COLORS.crimson,
    backgroundColor: 'rgba(224,82,82,0.14)',
  },
  memberName: {
    fontFamily: FONTS.ar.medium,
    fontSize: TYPE.caption.fontSize,
    color: COLORS.textDim,
    textAlign: 'center',
  },
  emptyText: {
    fontFamily: FONTS.ar.regular,
    fontSize: TYPE.small.fontSize,
    color: COLORS.textFaint,
    textAlign: 'center',
    marginTop: SPACING.xl,
  },
  controls: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.lg,
  },
  micBtn: {
    gap: 4,
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.borderStrong,
    backgroundColor: COLORS.surface,
  },
  micBtnLive: {
    borderColor: COLORS.goldLight,
    backgroundColor: 'rgba(201,169,97,0.18)',
  },
  micLabel: {
    fontFamily: FONTS.ar.semibold,
    fontSize: TYPE.micro.fontSize,
    color: COLORS.textDim,
  },
  micLabelLive: {
    color: COLORS.onGold,
  },
  sideActions: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: SPACING.md,
  },
  speakerBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    backgroundColor: COLORS.surface,
  },
  speakerBtnOn: {
    borderColor: COLORS.crimson,
    backgroundColor: 'rgba(224,82,82,0.12)',
  },
  speakerLabel: {
    fontFamily: FONTS.ar.medium,
    fontSize: TYPE.caption.fontSize,
    color: COLORS.textDim,
  },
});
