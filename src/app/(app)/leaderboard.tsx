// ============================================================
// جرب حظك — لوحة الصدارة
// ============================================================

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Screen from '../../components/ui/Screen';
import GlassCard from '../../components/ui/GlassCard';
import GoldButton from '../../components/ui/GoldButton';
import Avatar from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Bits';
import { CrownIcon, MedalIcon, TrendIcon } from '../../components/icons/GameIcons';
import { useAuthStore } from '../../stores/authStore';
import { apiFetch } from '../../lib/api';
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

type LeaderPlayer = {
  rank: number;
  username: string;
  displayName: string;
  chips: number;
  tier?: string;
  isMe?: boolean;
};

const MOCK_PLAYERS: LeaderPlayer[] = [
  { rank: 1, username: '@sultan', displayName: 'سلطان', chips: 128400 },
  { rank: 2, username: '@noora', displayName: 'نورة', chips: 96150 },
  { rank: 3, username: '@fahad', displayName: 'فهد', chips: 81200 },
  { rank: 4, username: '@ahmad', displayName: 'أحمد', chips: 52300, isMe: true },
  { rank: 5, username: '@lama', displayName: 'لمى', chips: 47800 },
  { rank: 6, username: '@khalid', displayName: 'خالد', chips: 39900 },
  { rank: 7, username: '@reem', displayName: 'ريم', chips: 34100 },
];

const PODIUM_TINT: Record<number, [string, string]> = {
  1: ['rgba(201,169,97,0.30)', 'rgba(201,169,97,0.02)'],
  2: ['rgba(185,192,202,0.24)', 'rgba(185,192,202,0.02)'],
  3: ['rgba(196,128,74,0.24)', 'rgba(196,128,74,0.02)'],
};

const TIER_NAMES: Record<string, string> = {
  bronze: 'برونزية',
  silver: 'فضية',
  gold: 'ذهبية',
  platinum: 'بلاتينية',
  black: 'البطاقة السوداء',
};

const TIER_NEXT_XP: Record<string, number> = {
  bronze: 1000,
  silver: 2500,
  gold: 5000,
  platinum: 10000,
  black: 1,
};

// ------------------------------------------------------------
// منصة التتويج — الثلاثة الأوائل
// ------------------------------------------------------------
function Podium({ players }: { players: LeaderPlayer[] }) {
  // الترتيب البصري: الثاني، الأول، الثالث
  const order = [players[1], players[0], players[2]];
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
function Row({ p }: { p: LeaderPlayer }) {
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
        {!!p.tier && (
          <View style={styles.rowRate}>
            <TrendIcon size={13} color={COLORS.emerald} />
            <Text style={styles.rowRateText}>{p.tier}</Text>
          </View>
        )}
      </View>
    </GlassCard>
  );
}

// ------------------------------------------------------------
// بطاقة حالة VIP — بطاقة سوداء بلمعة ذهبية + شريط تقدّم لامع
// ------------------------------------------------------------
function VipStatusCard({ xp, tier }: { xp: number; tier: string }) {
  const shimmer = useRef(new Animated.Value(0)).current;
  const nextXp = TIER_NEXT_XP[tier] ?? 5000;
  const progress = Math.max(0.02, Math.min(1, xp / nextXp));
  const tierLabel = TIER_NAMES[tier] ?? 'ذهبية';

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 2200,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  const translateX = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-320, 320],
  });

  return (
    <View style={styles.vipCard}>
      <LinearGradient
        colors={['rgba(201,169,97,0.18)', 'rgba(21,27,38,0.96)', 'rgba(10,13,18,0.98)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(227,201,138,0.5)', 'rgba(227,201,138,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.vipTop}>
        <View style={styles.vipBadge}>
          <CrownIcon size={16} color={COLORS.goldLight} />
          <Text style={styles.vipBadgeText}>VIP</Text>
        </View>
        <Text style={styles.vipTier}>درجة {tierLabel}</Text>
      </View>

      <Text style={styles.vipLabel}>تقدّمك نحو المستوى التالي</Text>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
        {/* لمعة سائلة ذهبية */}
        <Animated.View
          pointerEvents="none"
          style={[styles.shimmer, { transform: [{ translateX }] }]}
        >
          <LinearGradient
            colors={['rgba(201,169,97,0)', 'rgba(201,169,97,0.55)', 'rgba(201,169,97,0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </View>
      <View style={styles.vipMetaRow}>
        <Text style={styles.vipMeta}>{formatNumber(xp)} / {formatNumber(nextXp)} XP</Text>
        <Text style={styles.vipMetaGold}>+{formatNumber(Math.max(0, nextXp - xp))} للمستوى التالي</Text>
      </View>
    </View>
  );
}

export default function LeaderboardScreen() {
  const profile = useAuthStore((s) => s.profile);
  const [players, setPlayers] = useState<LeaderPlayer[]>(MOCK_PLAYERS);
  const [vip, setVip] = useState({ user_xp: 1250, current_tier: 'gold' });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // لوحة المتصدرين
      try {
        const data = await apiFetch<any[]>('/api/leaderboard');
        if (!cancelled && Array.isArray(data) && data.length > 0) {
          setPlayers(
            data.map((row, i) => ({
              rank: i + 1,
              username: row.username ? `@${row.username}` : '',
              displayName: row.display_name ?? 'لاعب',
              chips: Number(row.user_xp ?? 0),
              tier: row.current_tier,
              isMe: profile?.id ? row.id === profile.id : false,
            }))
          );
        }
      } catch {
        /* تبقى الافتراضية */
      }

      // حالة VIP للمستخدم الحالي (مصادقة بالتوكن — لا معرّف من العميل)
      if (profile?.id) {
        try {
          const data = await apiFetch<{ user_xp?: number; current_tier?: string }>('/api/vip-status');
          if (!cancelled && data) {
            setVip({ user_xp: Number(data.user_xp ?? 0), current_tier: data.current_tier ?? 'gold' });
          }
        } catch {
          /* تبقى الافتراضية */
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profile?.id]);

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>نادي المكافآت</Text>
        <View style={styles.headerMeta}>
          <CrownIcon size={14} color={COLORS.gold} />
          <Text style={styles.headerMetaText}>برنامج VIP الحصري</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <VipStatusCard xp={vip.user_xp} tier={vip.current_tier} />

        <View style={styles.claimCard}>
          <GoldButton title="استلام المكافأة الأسبوعية" onPress={() => {}} size="sm" />
          <Text style={styles.claimHint}>تُجدد كل جمعة الساعة 12 ظهرًا</Text>
        </View>

        <Text style={styles.sectionTitle}>ترتيب الأبطال</Text>

        <Podium players={players.slice(0, 3)} />

        <View style={styles.list}>
          {players.slice(3).map((p) => (
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

  // بطاقة VIP
  vipCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(201,169,97,0.4)',
    padding: SPACING.lg,
    overflow: 'hidden',
    gap: SPACING.md,
    ...SHADOWS.goldSoft,
  },
  vipTop: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  vipBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(201,169,97,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(201,169,97,0.5)',
  },
  vipBadgeText: {
    fontFamily: FONTS.num.black,
    fontSize: TYPE.caption.fontSize,
    color: COLORS.goldLight,
    letterSpacing: 1,
  },
  vipTier: {
    fontFamily: 'Cairo-Bold',
    fontSize: TYPE.body.fontSize,
    color: COLORS.goldLight,
  },
  vipLabel: {
    fontFamily: FONTS.ar.medium,
    fontSize: TYPE.caption.fontSize,
    color: COLORS.textDim,
  },
  progressTrack: {
    position: 'relative',
    height: 10,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(218,226,253,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(201,169,97,0.25)',
    overflow: 'hidden',
  },
  progressFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '25%',
    backgroundColor: COLORS.gold,
    borderRadius: RADIUS.full,
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 90,
  },
  vipMetaRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  vipMeta: {
    fontFamily: FONTS.num.semibold,
    fontSize: TYPE.caption.fontSize,
    color: COLORS.textDim,
  },
  vipMetaGold: {
    fontFamily: FONTS.ar.semibold,
    fontSize: TYPE.caption.fontSize,
    color: COLORS.goldLight,
  },

  // بطاقة الاستلام
  claimCard: {
    marginTop: SPACING.lg,
    gap: SPACING.sm,
    alignItems: 'flex-end',
  },
  claimHint: {
    fontFamily: FONTS.ar.regular,
    fontSize: TYPE.caption.fontSize,
    color: COLORS.textFaint,
  },
  sectionTitle: {
    fontFamily: 'Cairo-Bold',
    fontSize: TYPE.h2.fontSize,
    color: COLORS.text,
    marginTop: SPACING.xl,
  },
});
