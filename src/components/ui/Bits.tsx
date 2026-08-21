// ============================================================
// جرب حظك — Bits
// عناصر صغيرة متكررة: عنوان قسم، شارة، جيب الرصيد، عدّاد المقاعد
// ============================================================

import React from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  COLORS,
  FONTS,
  TYPE,
  SPACING,
  RADIUS,
  SHADOWS,
  GRADIENTS,
  formatNumber,
} from '../../constants/theme';
import { ChipIcon, UsersIcon } from '../icons/GameIcons';

// ------------------------------------------------------------
// عنوان قسم — شرطة ذهبية + عنوان + إجراء اختياري
// ------------------------------------------------------------
export function SectionHeader({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <View style={s.sectionRow}>
      <View style={s.sectionTitleWrap}>
        <Text style={s.sectionTitle}>{title}</Text>
        <LinearGradient
          colors={[COLORS.gold, 'rgba(201,169,97,0)']}
          start={{ x: 1, y: 0 }}
          end={{ x: 0, y: 0 }}
          style={s.sectionRule}
        />
      </View>
      {action}
    </View>
  );
}

// ------------------------------------------------------------
// شارة صغيرة ملوّنة
// ------------------------------------------------------------
export function Badge({
  label,
  tone = 'neutral',
  icon,
  style,
}: {
  label: string;
  tone?: 'neutral' | 'gold' | 'success' | 'danger' | 'violet' | 'info';
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const tones = {
    neutral: { bg: 'rgba(255,255,255,0.06)', bd: COLORS.border, fg: COLORS.textDim },
    gold: { bg: 'rgba(201,169,97,0.10)', bd: 'rgba(201,169,97,0.30)', fg: COLORS.goldLight },
    success: { bg: 'rgba(149,211,186,0.13)', bd: 'rgba(149,211,186,0.35)', fg: '#b0f0d6' },
    danger: { bg: 'rgba(255,180,171,0.13)', bd: 'rgba(255,180,171,0.35)', fg: '#ffdad6' },
    violet: { bg: 'rgba(139,92,246,0.15)', bd: 'rgba(139,92,246,0.38)', fg: '#C4B0FF' },
    info: { bg: 'rgba(63,140,255,0.13)', bd: 'rgba(63,140,255,0.35)', fg: '#8FBBFF' },
  }[tone];

  return (
    <View style={[s.badge, { backgroundColor: tones.bg, borderColor: tones.bd }, style]}>
      {icon}
      <Text style={[s.badgeText, { color: tones.fg }]}>{label}</Text>
    </View>
  );
}

// ------------------------------------------------------------
// جيب الرصيد — رقم بارز بخط الأرقام
// ------------------------------------------------------------
export function BalancePill({
  amount,
  size = 'md',
}: {
  amount: number;
  size?: 'md' | 'lg';
}) {
  const lg = size === 'lg';
  return (
    <View style={[s.pill, lg && s.pillLg, SHADOWS.e1]}>
      <LinearGradient
        colors={GRADIENTS.surfaceGold}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <ChipIcon size={lg ? 20 : 16} color={COLORS.gold} />
      <Text style={[s.pillText, lg && s.pillTextLg]}>{formatNumber(amount)}</Text>
    </View>
  );
}

// ------------------------------------------------------------
// عدّاد المقاعد — يتلوّن أحمر عند الامتلاء
// ------------------------------------------------------------
export function SeatCounter({ players, max }: { players: number; max: number }) {
  const full = players >= max;
  const tone = full ? COLORS.crimson : players > 0 ? COLORS.emerald : COLORS.textFaint;

  return (
    <View style={[s.seats, { borderColor: `${tone}55`, backgroundColor: `${tone}14` }]}>
      <UsersIcon size={13} color={tone} />
      <Text style={[s.seatsText, { color: tone }]}>
        {players}/{max}
      </Text>
    </View>
  );
}

// ------------------------------------------------------------
// خانة إحصائية
// ------------------------------------------------------------
export function StatTile({
  value,
  label,
  tone = COLORS.text,
  icon,
}: {
  value: string | number;
  label: string;
  tone?: string;
  icon?: React.ReactNode;
}) {
  return (
    <View style={s.stat}>
      {icon}
      <Text style={[s.statValue, { color: tone }]}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

/** فاصل شعري */
export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[s.divider, style]} />;
}

const s = StyleSheet.create({
  sectionRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.xxl,
    marginBottom: SPACING.lg,
    gap: SPACING.lg,
  },
  sectionTitleWrap: {
    flex: 1,
    alignItems: 'flex-end',
    gap: SPACING.sm,
  },
  sectionTitle: {
    fontFamily: FONTS.ar.bold,
    fontSize: TYPE.h2.fontSize,
    lineHeight: TYPE.h2.lineHeight,
    color: COLORS.text,
    textAlign: 'right',
  },
  sectionRule: {
    height: 2,
    width: 48,
    borderRadius: 2,
  },
  badge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: SPACING.md,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  badgeText: {
    fontFamily: FONTS.ar.semibold,
    fontSize: TYPE.caption.fontSize,
    lineHeight: TYPE.caption.lineHeight + 2,
    includeFontPadding: false,
  },
  pill: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.hairlineGold,
    overflow: 'hidden',
  },
  pillLg: {
    paddingVertical: 10,
    paddingHorizontal: SPACING.xl,
  },
  pillText: {
    fontFamily: FONTS.num.bold,
    fontSize: TYPE.body.fontSize,
    color: COLORS.goldLight,
    includeFontPadding: false,
  },
  pillTextLg: {
    fontSize: TYPE.h2.fontSize,
  },
  seats: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  seatsText: {
    fontFamily: FONTS.num.bold,
    fontSize: TYPE.caption.fontSize,
    includeFontPadding: false,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  statValue: {
    fontFamily: FONTS.num.bold,
    fontSize: TYPE.h2.fontSize,
    includeFontPadding: false,
  },
  statLabel: {
    fontFamily: FONTS.ar.medium,
    fontSize: TYPE.caption.fontSize,
    color: COLORS.textDim,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.border,
  },
});
