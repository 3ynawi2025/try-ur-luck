// ============================================================
// جرب حظك — لوحة الصدارة
// ============================================================

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Screen from '../../components/ui/Screen';
import GlassCard from '../../components/ui/GlassCard';
import Avatar from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Bits';
import { CrownIcon, ClockIcon, MedalIcon, TrendIcon } from '../../components/icons/GameIcons';
import {
  COLORS,
  FONTS,
  TYPE,
  SPACING,
  RADIUS,
  SIZES,
  SHADOWS,
  formatNumber,
} from '../../constants/theme';

const PLAYERS = [
  { rank: 1, username: '@sultan', displayName: 'سلطان', wins: 24, games: 35, chips: 128400 },
  { rank: 2, username: '@noora', displayName: 'نورة', wins: 21, games: 32, chips: 96150 },
  { rank: 3, username: '@fahad', displayName: 'فهد', wins: 19, games: 30, chips: 81200 },
  { rank: 4, username: '@ahmad', displayName: 'أحمد', wins: 15, games: 28, chips: 52300, isMe: true },
  { rank: 5, username: '@lama', displayName: 'لمى', wins: 14, games: 26, chips: 47800 },
  { rank: 6, username: '@khalid', displayName: 'خالد', wins: 12, games: 24, chips: 39900 },
  { rank: 7, username: '@reem', displayName: 'ريم', wins: 11, games: 22, chips: 34100 },
];

const PODIUM_TINT: Record<number, [string, string]> = {
  1: ['rgba(212,175,55,0.30)', 'rgba(212,175,55,0.02)'],
  2: ['rgba(185,192,202,0.24)', 'rgba(185,192,202,0.02)'],
  3: ['rgba(196,128,74,0.24)', 'rgba(196,128,74,0.02)'],
};

// ------------------------------------------------------------
// منصة التتويج — الثلاثة الأوائل
// ------------------------------------------------------------
function Podium() {
  // الترتيب البصري: الثاني، الأول، الثالث
  const order = [PLAYERS[1], PLAYERS[0], PLAYERS[2]];
  const heights = [86, 116, 68];

  return (
    <View style={styles.podium}>
      {order.map((p, i) => {
        const first = p.rank === 1;
        return (
          <View key={p.rank} style={styles.podiumCol}>
            {first && (
              <View style={styles.crown}>
                <CrownIcon size={26} color={COLORS.gold} />
              </View>
            )}
            <Avatar
              name={p.displayName}
              size={first ? 62 : 50}
              showBorder
              isActive={first}
            />
            <Text style={styles.podiumName} numberOfLines={1}>
              {p.displayName}
            </Text>
            <Text style={styles.podiumChips}>{formatNumber(p.chips)}</Text>

            <View style={[styles.pillar, { height: heights[i] }, first && SHADOWS.goldSoft]}>
              <LinearGradient
                colors={PODIUM_TINT[p.rank]}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <MedalIcon size={first ? 34 : 28} rank={p.rank} />
              <Text style={styles.pillarRank}>{p.rank}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ------------------------------------------------------------
function Row({ p }: { p: (typeof PLAYERS)[number] }) {
  const rate = Math.round((p.wins / p.games) * 100);

  return (
    <GlassCard
      variant={p.isMe ? 'gold' : 'default'}
      padding={SPACING.md}
      contentStyle={styles.row}
    >
      <View style={styles.rankBox}>
        <Text style={[styles.rankNum, p.isMe && styles.rankNumMe]}>{p.rank}</Text>
      </View>

      <Avatar name={p.displayName} size={42} showBorder={p.isMe} />

      <View style={styles.rowInfo}>
        <View style={styles.rowNameLine}>
          <Text style={styles.rowName}>{p.displayName}</Text>
          {p.isMe && <Badge label="أنت" tone="gold" />}
        </View>
        <Text style={styles.rowUser}>{p.username}</Text>
      </View>

      <View style={styles.rowStats}>
        <Text style={styles.rowChips}>{formatNumber(p.chips)}</Text>
        <View style={styles.rowRate}>
          <TrendIcon size={13} color={COLORS.emerald} />
          <Text style={styles.rowRateText}>{rate}%</Text>
        </View>
      </View>
    </GlassCard>
  );
}

export default function LeaderboardScreen() {
  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>البطولة الأسبوعية</Text>
        <View style={styles.headerMeta}>
          <ClockIcon size={14} color={COLORS.textDim} />
          <Text style={styles.headerMetaText}>تنتهي خلال ٣ أيام</Text>
          <View style={styles.metaDot} />
          <Text style={styles.headerMetaText}>٢٤٠ لاعباً</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Podium />

        <View style={styles.list}>
          {PLAYERS.slice(3).map((p) => (
            <Row key={p.rank} p={p} />
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: SIZES.screenPadding,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
    alignItems: 'flex-end',
  },
  title: {
    fontFamily: FONTS.ar.bold,
    fontSize: TYPE.h1.fontSize,
    lineHeight: TYPE.h1.lineHeight,
    color: COLORS.text,
  },
  headerMeta: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 5,
  },
  headerMetaText: {
    fontFamily: FONTS.ar.regular,
    fontSize: TYPE.small.fontSize,
    color: COLORS.textDim,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: COLORS.textFaint,
  },

  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: SIZES.screenPadding,
    paddingBottom: SPACING.xxxl,
  },

  // المنصة
  podium: {
    // معكوس: الثاني يميناً، الأول وسطاً، الثالث يساراً (ترتيب عربي)
    flexDirection: 'row-reverse',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.lg,
    marginBottom: SPACING.xxl,
  },
  podiumCol: {
    flex: 1,
    alignItems: 'center',
    gap: 5,
  },
  crown: {
    marginBottom: -2,
  },
  podiumName: {
    fontFamily: FONTS.ar.bold,
    fontSize: TYPE.small.fontSize,
    lineHeight: TYPE.small.lineHeight,
    color: COLORS.text,
    maxWidth: '100%',
  },
  podiumChips: {
    fontFamily: FONTS.num.bold,
    fontSize: TYPE.caption.fontSize,
    color: COLORS.goldLight,
    marginTop: -2,
  },
  pillar: {
    width: '100%',
    marginTop: SPACING.sm,
    borderTopLeftRadius: RADIUS.md,
    borderTopRightRadius: RADIUS.md,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    overflow: 'hidden',
  },
  pillarRank: {
    fontFamily: FONTS.num.black,
    fontSize: TYPE.h3.fontSize,
    color: COLORS.text,
    opacity: 0.85,
  },

  // القائمة
  list: {
    gap: SPACING.sm,
  },
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: SPACING.md,
  },
  rankBox: {
    width: 26,
    alignItems: 'center',
  },
  rankNum: {
    fontFamily: FONTS.num.bold,
    fontSize: TYPE.body.fontSize,
    color: COLORS.textFaint,
  },
  rankNumMe: {
    color: COLORS.gold,
  },
  rowInfo: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 1,
  },
  rowNameLine: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  rowName: {
    fontFamily: FONTS.ar.bold,
    fontSize: TYPE.body.fontSize,
    lineHeight: TYPE.body.lineHeight,
    color: COLORS.text,
  },
  rowUser: {
    fontFamily: FONTS.num.medium,
    fontSize: TYPE.caption.fontSize,
    color: COLORS.textFaint,
  },
  rowStats: {
    alignItems: 'flex-start',
    gap: 1,
  },
  rowChips: {
    fontFamily: FONTS.num.bold,
    fontSize: TYPE.body.fontSize,
    color: COLORS.goldLight,
  },
  rowRate: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 3,
  },
  rowRateText: {
    fontFamily: FONTS.num.semibold,
    fontSize: TYPE.caption.fontSize,
    color: COLORS.emerald,
  },
});
