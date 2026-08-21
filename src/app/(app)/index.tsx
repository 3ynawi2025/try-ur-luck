// ============================================================
// جرب حظك — الصالة الرئيسية (Dark Luxe)
// بطل هادئ: اسم ضخم + تسمية لاتينية متباعدة + بطاقات ألعاب فخمة
// دخول متتابع ناعم يحترم reduced-motion
// ============================================================

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
  Easing,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Screen from '../../components/ui/Screen';
import GoldButton from '../../components/ui/GoldButton';
import Avatar from '../../components/ui/Avatar';
import RewardsModal from '../../components/ui/RewardsModal';
import { useAuthStore } from '../../stores/authStore';
import { apiFetch } from '../../lib/api';
import { useReducedMotion } from '../../constants/motion';
import { ChevronIcon } from '../../components/icons/GameIcons';
import {
  COLORS,
  FONTS,
  TYPE,
  SPACING,
  RADIUS,
  SHADOWS,
  GRADIENTS,
  formatCompact,
  ANIMATION,
} from '../../constants/theme';

// ===== ألعاب «The Floor» =====
const FLOOR_GAMES = [
  { key: 'blackjack', en: 'BLACKJACK', title: 'بلاك جاك', subtitle: 'الحد الأدنى 50', route: '/(app)/blackjack/1', tone: 'felt' as const },
  { key: 'roulette', en: 'ROULETTE', title: 'الروليت', subtitle: 'الحد الأدنى 10', route: '/(app)/roulette/1', tone: 'coal' as const },
  { key: 'three_card', en: '3-CARD POKER', title: 'ثلاث أوراق بوكر', subtitle: 'للمحترفين', route: '/(app)/three-card/1', tone: 'felt' as const },
  { key: 'holdem', en: 'TEXAS HOLD’EM', title: 'تكساس هولدم', subtitle: 'ضد لاعبين حقيقيين', route: '/(app)/table/1', tone: 'coal' as const },
  { key: 'russian', en: 'RUSSIAN POKER', title: 'البوكر الروسي', subtitle: 'تركيبة ثانية', route: '/(app)/russian/1', tone: 'wine' as const },
];

const VIP_CARD = {
  key: 'vip',
  en: 'PRIVATE LOUNGE',
  title: 'طاولة VIP',
  subtitle: 'شراء 5,000 — تجربة خاصة',
  route: '/(app)/table/3',
};

const OFFERS = [
  {
    key: 'daily',
    tag: 'مكافآت يومية',
    title: 'استلم مكافأتك اليومية',
    desc: 'حتى 5,000 شريحة مجانية كل يوم',
    cta: 'استلم الآن',
    ctaStyle: 'solid' as const,
    tint: 'rgba(201,169,97,0.10)' as const,
  },
  {
    key: 'watch',
    tag: 'شاهد واربح',
    title: 'شاهد فيديو واكسب',
    desc: '+1,000 شريحة فورًا',
    cta: 'شاهد الآن',
    ctaStyle: 'outline' as const,
    tint: 'rgba(143,203,180,0.08)' as const,
  },
];

const GAME_TONES: Record<string, readonly [string, string]> = {
  felt: ['#0E4635', '#02150F'],
  coal: ['#1B2230', '#0A0D12'],
  wine: ['#3A1218', '#120608'],
};

/** بطاقة لعبة قابلة للضغط مع دخول متتابع */
function GameCard({
  en,
  title,
  subtitle,
  tone,
  wide,
  onPress,
  index,
}: {
  en: string;
  title: string;
  subtitle: string;
  tone: keyof typeof GAME_TONES | 'vip';
  wide?: boolean;
  onPress: () => void;
  index: number;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const enter = useRef(new Animated.Value(0)).current;
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) {
      enter.setValue(1);
      return;
    }
    Animated.timing(enter, {
      toValue: 1,
      duration: ANIMATION.normal + 160,
      delay: index * ANIMATION.deal,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [reduced, index]);

  const colors =
    tone === 'vip'
      ? (['#3A2A19', '#171007'] as const)
      : (GAME_TONES[tone] ?? GAME_TONES.coal);

  return (
    <Animated.View
      style={[
        wide ? styles.gameWide : styles.gameCell,
        {
          opacity: enter,
          transform: [
            { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [22, 0] }) },
            { scale },
          ],
        },
      ]}
    >
      <Pressable
        onPress={onPress}
        onPressIn={() =>
          Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 45, bounciness: 5 }).start()
        }
        onPressOut={() =>
          Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 45, bounciness: 5 }).start()
        }
        style={styles.gameCard}
      >
        <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        {/* لمعة علوية خافتة */}
        <LinearGradient
          colors={['rgba(255,255,255,0.10)', 'rgba(255,255,255,0)']}
          style={styles.gameGloss}
          pointerEvents="none"
        />
        {/* زخرفة دائرية هادئة */}
        <View style={[styles.gameOrnament, tone === 'vip' && styles.gameOrnamentVip]} pointerEvents="none">
          <Text style={styles.gameOrnamentText}>{title.slice(0, 1)}</Text>
        </View>
        {/* التسمية */}
        <View style={styles.gameLabel}>
          <Text style={styles.gameEn}>{en}</Text>
          <Text style={[styles.gameTitle, tone === 'vip' && styles.gameTitleVip]}>{title}</Text>
          <Text style={styles.gameSub}>{subtitle}</Text>
        </View>
        <View style={styles.gameArrow} pointerEvents="none">
          <ChevronIcon size={14} color={COLORS.textFaint} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function LobbyScreen() {
  const profile = useAuthStore((s) => s.profile);
  const [tokens, setTokens] = useState(10000);
  const [rewardsOpen, setRewardsOpen] = useState(false);
  const reduced = useReducedMotion();
  const heroIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduced) {
      heroIn.setValue(1);
      return;
    }
    Animated.timing(heroIn, {
      toValue: 1,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [reduced]);

  // جلب الرصيد الحقيقي عند فتح الصالة وعند كل عودة من لعبة — مصادقة بالتوكن
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          const data = await apiFetch<{ balance: number }>('/api/balance');
          if (!cancelled && typeof data?.balance === 'number') {
            setTokens(Math.max(0, data.balance));
          }
        } catch {
          /* يبقى الرصيد الافتراضي عند التعذر (وضع ضيف) */
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [])
  );

  return (
    <Screen style={styles.screen}>
      {/* ===== الترويسة ===== */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Avatar name={profile?.displayName ?? 'أنت'} size={40} showBorder />
          <View>
            <Text style={styles.brandEn}>MIDNIGHT ROYALE</Text>
            <Text style={styles.brandSub}>كازينو جرب حظك الاجتماعي</Text>
          </View>
        </View>
        <Pressable style={styles.tokensPill} onPress={() => router.push('/(app)/profile')} hitSlop={8}>
          <BlurView intensity={22} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={styles.tokensInner}>
            <Text style={styles.tokensLabel}>الرصيد</Text>
            <Text style={styles.tokensValue}>{formatCompact(tokens)}</Text>
          </View>
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* ===== البطل ===== */}
        <Animated.View
          style={{
            opacity: heroIn,
            transform: [{ translateY: heroIn.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
          }}
        >
          <Text style={styles.heroEyebrow}>المجلس الاجتماعي للورق — بصوت مباشر</Text>
          <Text style={styles.heroTitle}>جرب حظك</Text>
          <Text style={styles.heroSub}>
            طاولات حقيقية، أوراق حقيقية، ودراهم افتراضية بالكامل
          </Text>
        </Animated.View>

        {/* ===== العروض الحصرية ===== */}
        <Text style={styles.sectionTitle}>عروض حصرية</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.offersRow}
        >
          {OFFERS.map((o, i) => (
            <View key={o.key} style={styles.offerCard}>
              <LinearGradient colors={[o.tint, 'rgba(10,13,18,0)']} style={StyleSheet.absoluteFill} />
              <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
              <View style={styles.offerTop}>
                <Text style={styles.offerTag}>{o.tag}</Text>
              </View>
              <Text style={styles.offerTitle}>{o.title}</Text>
              <Text style={styles.offerDesc}>{o.desc}</Text>
              {o.ctaStyle === 'solid' ? (
                <GoldButton
                  title={o.cta}
                  onPress={() => (o.key === 'daily' ? setRewardsOpen(true) : undefined)}
                  size="sm"
                />
              ) : (
                <Pressable style={styles.offerOutlineBtn} onPress={() => {}}>
                  <Text style={styles.offerOutlineText}>{o.cta}</Text>
                </Pressable>
              )}
            </View>
          ))}
        </ScrollView>

        {/* ===== أرضية الألعاب ===== */}
        <Text style={styles.sectionTitle}>أرضية الألعاب</Text>
        <View style={styles.floorGrid}>
          {FLOOR_GAMES.map((g, i) => (
            <GameCard
              key={g.key}
              en={g.en}
              title={g.title}
              subtitle={g.subtitle}
              tone={g.tone}
              index={i}
              onPress={() => router.push(g.route as never)}
            />
          ))}
          <GameCard
            en={VIP_CARD.en}
            title={VIP_CARD.title}
            subtitle={VIP_CARD.subtitle}
            tone="vip"
            wide
            index={FLOOR_GAMES.length}
            onPress={() => router.push(VIP_CARD.route as never)}
          />
        </View>

        {/* ===== مساحة فعاليات ===== */}
        <View style={styles.eventsBanner}>
          <BlurView intensity={18} tint="dark" style={StyleSheet.absoluteFill} />
          <Text style={styles.eventsText}>فعاليات حصرية — قريبًا</Text>
        </View>
      </ScrollView>

      {/* نافذة المكافآت اليومية */}
      <RewardsModal
        visible={rewardsOpen}
        onClose={() => setRewardsOpen(false)}
        onReward={(amount) => setTokens((t) => Math.max(0, t) + amount)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: COLORS.bg },

  // ===== الترويسة =====
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  headerLeft: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: SPACING.md,
  },
  brandEn: {
    fontFamily: FONTS.num.bold,
    fontSize: TYPE.micro.fontSize,
    color: COLORS.textDim,
    letterSpacing: 2.4,
  },
  brandSub: {
    fontFamily: FONTS.ar.regular,
    fontSize: TYPE.caption.fontSize,
    color: COLORS.textFaint,
    marginTop: 1,
  },
  tokensPill: {
    minWidth: 108,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.hairlineGold,
    overflow: 'hidden',
  },
  tokensInner: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 3,
  },
  tokensLabel: {
    fontFamily: FONTS.ar.medium,
    fontSize: TYPE.caption.fontSize,
    color: COLORS.textDim,
  },
  tokensValue: {
    fontFamily: FONTS.num.bold,
    fontSize: TYPE.small.fontSize,
    color: COLORS.goldLight,
  },

  content: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.xxxl,
    gap: SPACING.xl,
  },

  // ===== البطل =====
  heroEyebrow: {
    fontFamily: FONTS.num.semibold,
    fontSize: TYPE.micro.fontSize,
    color: COLORS.goldLight,
    letterSpacing: 1.6,
    marginBottom: SPACING.sm,
  },
  heroTitle: {
    fontFamily: FONTS.ar.black,
    fontSize: TYPE.display.fontSize,
    lineHeight: TYPE.display.lineHeight,
    color: COLORS.text,
    includeFontPadding: false,
  },
  heroSub: {
    fontFamily: FONTS.ar.regular,
    fontSize: TYPE.small.fontSize,
    color: COLORS.textDim,
    marginTop: SPACING.xs,
  },

  sectionTitle: {
    fontFamily: FONTS.ar.bold,
    fontSize: TYPE.h3.fontSize,
    color: COLORS.text,
  },

  // ===== العروض =====
  offersRow: {
    gap: SPACING.sm,
    paddingBottom: SPACING.xs,
  },
  offerCard: {
    width: 280,
    minHeight: 158,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    overflow: 'hidden',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    backgroundColor: 'rgba(16,21,30,0.4)',
    ...SHADOWS.e1,
  },
  offerTop: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  offerTag: {
    fontFamily: FONTS.ar.semibold,
    fontSize: TYPE.micro.fontSize,
    letterSpacing: 1,
    color: COLORS.goldLight,
  },
  offerTitle: {
    fontFamily: FONTS.ar.bold,
    fontSize: TYPE.body.fontSize,
    color: COLORS.text,
  },
  offerDesc: {
    fontFamily: FONTS.ar.regular,
    fontSize: TYPE.small.fontSize,
    color: COLORS.textDim,
  },
  offerOutlineBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: 'rgba(143,203,180,0.4)',
  },
  offerOutlineText: {
    fontFamily: FONTS.ar.semibold,
    fontSize: TYPE.caption.fontSize,
    color: COLORS.emerald,
  },

  // ===== أرضية الألعاب =====
  floorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  gameCell: {
    width: '48.5%',
    aspectRatio: 3 / 4,
  },
  gameWide: {
    width: '100%',
    height: 140,
  },
  gameCard: {
    flex: 1,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    ...SHADOWS.e1,
  },
  gameGloss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '45%',
  },
  gameOrnament: {
    position: 'absolute',
    top: SPACING.lg,
    alignSelf: 'center',
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.24)',
  },
  gameOrnamentVip: {
    borderColor: COLORS.hairlineGold,
  },
  gameOrnamentText: {
    fontFamily: FONTS.ar.black,
    fontSize: 30,
    color: 'rgba(242,239,233,0.35)',
  },
  gameLabel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: SPACING.md,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  gameEn: {
    fontFamily: FONTS.num.bold,
    fontSize: 9,
    color: COLORS.textFaint,
    letterSpacing: 2,
  },
  gameTitle: {
    fontFamily: FONTS.ar.bold,
    fontSize: TYPE.body.fontSize,
    color: COLORS.text,
    marginTop: 2,
  },
  gameTitleVip: {
    color: COLORS.goldLight,
  },
  gameSub: {
    fontFamily: FONTS.ar.regular,
    fontSize: TYPE.caption.fontSize,
    color: COLORS.textFaint,
    marginTop: 2,
  },
  gameArrow: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },

  // ===== فعاليات =====
  eventsBanner: {
    height: 84,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: 'rgba(16,21,30,0.4)',
  },
  eventsText: {
    fontFamily: FONTS.ar.medium,
    fontSize: TYPE.caption.fontSize,
    color: COLORS.textFaint,
    letterSpacing: 1,
  },
});
