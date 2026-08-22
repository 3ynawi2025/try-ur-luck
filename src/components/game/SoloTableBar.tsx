// ============================================================
// جرب حظك — شريط طاولة الألعاب الفردية المشتركة
// يعرض الجالسين (حتى 6) + زر المايك + عداد المقاعد.
// كل لاعب يلعب يده ضد الديلر، والجميع يرى بعضهم والصوت مفتوح.
// ============================================================

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Avatar from '../ui/Avatar';
import { MicIcon, MicOffIcon } from '../icons/GameIcons';
import { COLORS, FONTS, TYPE, SPACING, RADIUS } from '../../constants/theme';
import type { SoloPlayer } from '../../hooks/useSoloGame';

interface Props {
  players: SoloPlayer[];
  isMuted: boolean;
  onToggleMute: () => void;
  max?: number;
}

export default function SoloTableBar({ players, isMuted, onToggleMute, max = 6 }: Props) {
  return (
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

      <View style={styles.avatars}>
        {players.length === 0 && <Text style={styles.hint}>بانتظار لاعبين…</Text>}
        {players.map((p) => (
          <View key={p.id} style={styles.seat}>
            <Avatar name={p.name} size={28} />
            <Text style={styles.seatName} numberOfLines={1}>
              {p.name}
            </Text>
          </View>
        ))}
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
    maxWidth: 64,
  },
  seatName: {
    fontFamily: FONTS.ar.regular,
    fontSize: 9,
    color: COLORS.textDim,
    maxWidth: 60,
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
});
