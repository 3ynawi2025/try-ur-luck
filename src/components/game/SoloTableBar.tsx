// ============================================================
// جرب حظك — شريط طاولة الألعاب الفردية المشتركة
// يعرض الجالسين (حتى 6) + زر المايك + عداد المقاعد.
// كل لاعب يلعب يده ضد الديلر، والجميع يرى بعضهم والصوت مفتوح.
// + زر بلاغ ⚑ بجانب كل لاعب (توجيه App Store 1.2 — UGC).
// ============================================================

import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Avatar from '../ui/Avatar';
import GoldButton from '../ui/GoldButton';
import { MicIcon, MicOffIcon, CloseIcon, SpeakerIcon, SpeakerOffIcon } from '../icons/GameIcons';
import { COLORS, FONTS, TYPE, SPACING, RADIUS } from '../../constants/theme';
import type { SoloPlayer } from '../../hooks/useSoloGame';
import { agoraUidFor } from '../../hooks/useAgoraVoice';
import { apiFetch } from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';

const REPORT_REASONS: { key: string; label: string }[] = [
  { key: 'voice_abuse', label: 'إساءة صوتية' },
  { key: 'harassment', label: 'تحرش' },
  { key: 'offensive_language', label: 'سب' },
  { key: 'cheating', label: 'غش' },
  { key: 'spam', label: 'إزعاج' },
];

interface Props {
  players: SoloPlayer[];
  isMuted: boolean;
  onToggleMute: () => void;
  max?: number;
  // كتم الأصوات البعيدة (اختياري — يظهر فقط عند توفره من useAgoraVoice)
  muteAllRemote?: boolean;
  onToggleMuteAllRemote?: () => void;
  mutedRemoteUids?: number[];
  onToggleRemoteMute?: (uid: number) => void;
  isRemoteMuted?: (uid: number) => boolean;
}

/** معرّف Agora رقمي حتمي — نفس الدالة الموحّدة في useAgoraVoice (لضمان تطابق uid الطرفين). */
const soloUidFor = agoraUidFor;

export default function SoloTableBar({
  players,
  isMuted,
  onToggleMute,
  max = 6,
  muteAllRemote,
  onToggleMuteAllRemote,
  mutedRemoteUids,
  onToggleRemoteMute,
  isRemoteMuted,
}: Props) {
  const myId = useAuthStore((s) => s.profile?.id);
  const [reportTarget, setReportTarget] = useState<SoloPlayer | null>(null);
  const [reason, setReason] = useState('voice_abuse');
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (t: string) => {
    setToast(t);
    setTimeout(() => setToast(null), 3000);
  };

  const sendReport = async () => {
    if (!reportTarget || sending) return;
    setSending(true);
    try {
      await apiFetch('/api/reports', {
        method: 'POST',
        body: JSON.stringify({ target_id: reportTarget.id, reason }),
      });
      showToast('تم استلام البلاغ — شكرًا لك');
      setReportTarget(null);
    } catch (e) {
      showToast(`تعذّر الإبلاغ: ${(e as Error).message}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <View>
      <LinearGradient
        colors={['rgba(201,169,97,0.10)', 'rgba(21,27,38,0.55)']}
        style={styles.bar}
      >
        <Pressable onPress={onToggleMute} hitSlop={8} style={styles.micBtn}>
          {isMuted ? (
            <MicOffIcon size={18} color={COLORS.textDim} />
          ) : (
            <MicIcon size={18} color={COLORS.emerald} />
          )}
        </Pressable>

        {onToggleMuteAllRemote && (
          <Pressable
            onPress={onToggleMuteAllRemote}
            hitSlop={8}
            style={[styles.muteAllBtn, muteAllRemote && styles.muteAllBtnOn]}
          >
            {muteAllRemote ? (
              <SpeakerOffIcon size={18} color={COLORS.textDim} />
            ) : (
              <SpeakerIcon size={18} color={COLORS.text} />
            )}
          </Pressable>
        )}

        <View style={styles.avatars}>
          {players.length === 0 && <Text style={styles.hint}>بانتظار لاعبين…</Text>}
          {players.map((p) => {
            const isSelf = !!myId && p.id === myId;
            const uid = soloUidFor(p.id);
            const remoteMuted =
              !isSelf &&
              (isRemoteMuted ? isRemoteMuted(uid) : (mutedRemoteUids ?? []).includes(uid));
            return (
              <View key={p.id} style={styles.seat}>
                <Avatar name={p.name} size={28} />
                <View style={styles.seatNameRow}>
                  <Text style={styles.seatName} numberOfLines={1}>
                    {p.name}
                  </Text>
                  {!isSelf && onToggleRemoteMute && (
                    <Pressable
                      onPress={() => onToggleRemoteMute(uid)}
                      hitSlop={6}
                      style={styles.speakerBtn}
                    >
                      {remoteMuted ? (
                        <SpeakerOffIcon size={12} color={COLORS.textDim} />
                      ) : (
                        <SpeakerIcon size={12} color={COLORS.text} />
                      )}
                    </Pressable>
                  )}
                  {!isSelf && (
                    <Pressable
                      onPress={() => {
                        setReason('voice_abuse');
                        setReportTarget(p);
                      }}
                      hitSlop={6}
                      style={styles.reportBtn}
                    >
                      <Text style={styles.reportFlag}>⚑</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            );
          })}
          {Array.from({ length: Math.max(0, max - players.length) }).map((_, i) => (
            <View key={`empty-${i}`} style={[styles.seat, styles.emptySeat]}>
              <View style={styles.emptyCircle} />
            </View>
          ))}
        </View>

        <Text style={styles.count}>
          {players.length}/{max}
        </Text>
      </LinearGradient>

      {!!toast && (
        <View style={styles.toastWrap} pointerEvents="none">
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}

      <Modal
        visible={!!reportTarget}
        transparent
        animationType="fade"
        onRequestClose={() => setReportTarget(null)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setReportTarget(null)} />
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>الإبلاغ عن {reportTarget?.name}</Text>
              <Pressable style={styles.modalClose} onPress={() => setReportTarget(null)} hitSlop={8}>
                <CloseIcon size={16} color={COLORS.textDim} />
              </Pressable>
            </View>
            <View style={styles.chips}>
              {REPORT_REASONS.map((r) => (
                <Pressable
                  key={r.key}
                  onPress={() => setReason(r.key)}
                  style={[styles.chip, reason === r.key && styles.chipActive]}
                >
                  <Text style={[styles.chipText, reason === r.key && styles.chipTextActive]}>
                    {r.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <GoldButton
              title={sending ? 'جارٍ الإرسال…' : 'إرسال البلاغ'}
              onPress={sendReport}
              disabled={sending}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.hairlineGold,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  micBtn: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  muteAllBtn: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  muteAllBtnOn: {
    borderColor: COLORS.crimson,
    backgroundColor: 'rgba(224,82,82,0.12)',
  },
  speakerBtn: {
    width: 14,
    height: 14,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatars: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  hint: {
    fontFamily: FONTS.ar.regular,
    fontSize: TYPE.caption.fontSize,
    color: COLORS.textFaint,
  },
  seat: {
    alignItems: 'center',
    maxWidth: 72,
  },
  seatNameRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 2,
  },
  seatName: {
    fontFamily: FONTS.ar.regular,
    fontSize: 9,
    color: COLORS.textDim,
    maxWidth: 44,
  },
  reportBtn: {
    width: 14,
    height: 14,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportFlag: {
    fontSize: 11,
    lineHeight: 13,
    color: COLORS.textFaint,
  },
  emptySeat: {
    opacity: 0.35,
  },
  emptyCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  count: {
    fontFamily: FONTS.num.medium,
    fontSize: TYPE.caption.fontSize,
    color: COLORS.goldLight,
  },
  toastWrap: {
    position: 'absolute',
    top: -10,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 20,
  },
  toastText: {
    backgroundColor: 'rgba(10,13,18,0.95)',
    borderWidth: 1,
    borderColor: COLORS.goldRim,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    color: COLORS.goldLight,
    fontFamily: FONTS.ar.medium,
    fontSize: TYPE.small.fontSize,
    textAlign: 'center',
    overflow: 'hidden',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10,13,18,0.72)',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },
  modalCard: {
    backgroundColor: COLORS.bgSoft,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    gap: SPACING.md,
  },
  modalHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  modalTitle: {
    flex: 1,
    fontFamily: FONTS.ar.bold,
    fontSize: TYPE.body.fontSize,
    color: COLORS.text,
    textAlign: 'right',
  },
  modalClose: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chips: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  chip: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  chipActive: {
    borderColor: COLORS.hairlineGold,
    backgroundColor: 'rgba(201,169,97,0.12)',
  },
  chipText: {
    fontFamily: FONTS.ar.medium,
    fontSize: TYPE.caption.fontSize,
    color: COLORS.textDim,
  },
  chipTextActive: {
    color: COLORS.goldLight,
  },
});
