// ============================================================
// جرب حظك — الصالة الرئيسية (Midnight Royale)
// ترويسة بالهوية الذهبية + عروض + شبكة ألعاب «The Floor»
// ============================================================

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Screen from '../../components/ui/Screen';
import GoldButton from '../../components/ui/GoldButton';
import Avatar from '../../components/ui/Avatar';
import { useAuthStore } from '../../stores/authStore';
import { apiFetch } from '../../lib/api';
import {
  COLORS,
  FONTS,
  TYPE,
  SPACING,
  RADIUS,
  SHADOWS,
  formatCompact,
} from '../../constants/theme';

// ===== ألعاب «The Floor» =====
const FLOOR_GAMES = [
  { key: 'blackjack', title: 'بلاك جاك', subtitle: 'الحد الأدنى 50', route: '/(app)/blackjack/1', wide: false },
  { key: 'roulette', title: 'الروليت', subtitle: 'الحد الأدنى 10', route: '/(app)/roulette/1', wide: false },
  { key: 'three_card', title: 'ثلاث أوراق بوكر', subtitle: 'للمحترفين', route: '/(app)/three-card/1', wide: true },
  { key: 'holdem', title: 'تكساس هولدم', subtitle: 'ضد لاعبين حقيقيين', route: '/(app)/table/1', wide: false },
  { key: 'russian', title: 'البوكر الروسي', subtitle: 'تركيبة ثانية', route: '/(app)/russian/1', wide: false },
  { key: 'vip', title: 'طاولة VIP', subtitle: 'شراء 5,000', route: '/(app)/table/3', wide: true, vip: true },
];

const OFFERS = [
  {
    key: 'daily',
    tag: 'مكافآت يومية',
    tagColor: COLORS.goldLight,
    title: 'استلم مكافأتك اليومية',
    desc: 'حتى 5,000 شريحة مجانية كل يوم',
    cta: 'استلم الآن',
    ctaStyle: 'solid' as const,
    gradient: ['rgba(233,195,73,0.12)', 'rgba(233,195,73,0)'] as const,
  },
  {
    key: 'watch',
    tag: 'شاهد واربح',
    tagColor: COLORS.emerald,
    title: 'شاهد فيديو واكسب',
    desc: '+1,000 شريحة فورًا',
    cta: 'شاهد الآن',
    ctaStyle: 'outline' as const,
    gradient: ['rgba(149,211,186,0.10)', 'rgba(149,211,186,0)'] as const,
  },
];

function Tappable({
  children,
  onPress,
  style,
}: {
  children: React.ReactNode;
  onPress: () => void;
  style?: any;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={() => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 45, bounciness: 5 }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 45, bounciness: 5 }).start()}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

export default function LobbyScreen() {
  const profile = useAuthStore((s) => s.profile);
  const [tokens, setTokens] = useState(10000);

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
          <Avatar name="أنت" size={40} showBorder />
          <View>
            <Text style={styles.brand}>Midnight Royale</Text>
            <Text style={styles.brandSub}>جرب حظك — كازينو اجتماعي</Text>
          </View>
        </View>
        <Pressable style={styles.tokensPill} onPress={() => router.push('/(app)/profile')} hitSlop={8}>
          <Text style={styles.tokensPlus}>+</Text>
          <Text style={styles.tokensText}>رقائق</Text>
          <Text style={styles.tokensValue}>{formatCompact(tokens)}</Text>
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* ===== العروض الحصرية ===== */}
        <Text style={styles.sectionTitle}>عروض حصرية</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.offersRow}
        >
          {OFFERS.map((o) => (
            <View key={o.key} style={styles.offerCard}>
              <LinearGradient colors={o.gradient} style={StyleSheet.absoluteFill} />
              <LinearGradient colors={['rgba(45,52,73,0.55)', 'rgba(19,27,46,0.75)']} style={StyleSheet.absoluteFill} />
              <View style={styles.offerTop}>
                <Text style={[styles.offerTag, { color: o.tagColor }]}>{o.tag}</Text>
              </View>
              <Text style={styles.offerTitle}>{o.title}</Text>
              <Text style={styles.offerDesc}>{o.desc}</Text>
              {o.ctaStyle === 'solid' ? (
                <GoldButton title={o.cta} onPress={() => {}} size="sm" />
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
          {FLOOR_GAMES.map((g) => (
            <Tappable
              key={g.key}
              onPress={() => router.push(g.route as never)}
              style={g.wide ? styles.floorWide : styles.floorCell}
            >
              <LinearGradient
                colors={g.vip ? ['#543c24', '#261b0f'] : ['#0b513d', '#002117']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.floorCard}
              >
                {/* لمعة علوية */}
                <LinearGradient
                  colors={['rgba(255,255,255,0.12)', 'rgba(255,255,255,0)']}
                  style={styles.floorGloss}
                  pointerEvents="none"
                />
                {/* نقش دائري */}
                <View style={styles.floorOrnament} pointerEvents="none">
                  <Text style={styles.floorOrnamentText}>{g.title.slice(0, 1)}</Text>
                </View>
                <View style={styles.floorLabel}>
                  <Text style={[styles.floorTitle, g.vip && { color: COLORS.goldLight }]}>
                    {g.title}
                  </Text>
                  <Text style={styles.floorSub}>{g.subtitle}</Text>
                </View>
              </LinearGradient>
            </Tappable>
          ))}
        </View>

        {/* ===== مساحة إعلان ===== */}
        <View style={styles.adBanner}>
          <LinearGradient
            colors={['rgba(45,52,73,0.6)', 'rgba(19,27,46,0.4)']}
            style={StyleSheet.absoluteFill}
          />
          <Text style={styles.adText}>مساحة فعاليات حصرية — قريبًا</Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.surfaceHighest,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(233,195,73,0.2)',
  },
  headerLeft: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: SPACING.md,
  },
  brand: {
    fontFamily: 'Cairo-Black',
    fontSize: TYPE.h3.fontSize,
    color: COLORS.goldLight,
    letterSpacing: 0.3,
  },
  brandSub: {
    fontFamily: FONTS.ar.regular,
    fontSize: TYPE.caption.fontSize,
    color: COLORS.textFaint,
  },
  tokensPill: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(175,141,17,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(233,195,73,0.4)',
  },
  tokensPlus: {
    fontFamily: FONTS.num.bold,
    fontSize: TYPE.body.fontSize,
    color: COLORS.goldLight,
  },
  tokensText: {
    fontFamily: FONTS.ar.medium,
    fontSize: TYPE.caption.fontSize,
    color: COLORS.goldLight,
  },
  tokensValue: {
    fontFamily: FONTS.num.bold,
    fontSize: TYPE.small.fontSize,
    color: COLORS.text,
  },

  content: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.xxxl,
    gap: SPACING.xl,
  },
  sectionTitle: {
    fontFamily: 'Cairo-Bold',
    fontSize: TYPE.h2.fontSize,
    color: COLORS.text,
  },

  offersRow: {
    gap: SPACING.sm,
    paddingBottom: SPACING.xs,
  },
  offerCard: {
    width: 280,
    minHeight: 150,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(233,195,73,0.3)',
    padding: SPACING.lg,
    overflow: 'hidden',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    ...SHADOWS.e2,
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
    opacity: 0.85,
  },
  offerOutlineBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: 'rgba(149,211,186,0.5)',
  },
  offerOutlineText: {
    fontFamily: FONTS.ar.semibold,
    fontSize: TYPE.caption.fontSize,
    color: COLORS.emerald,
  },

  floorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  floorCell: {
    width: '48.5%',
    aspectRatio: 3 / 4,
  },
  floorWide: {
    width: '100%',
    height: 150,
  },
  floorCard: {
    flex: 1,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(233,195,73,0.2)',
    overflow: 'hidden',
    ...SHADOWS.card,
  },
  floorGloss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '45%',
  },
  floorOrnament: {
    position: 'absolute',
    top: SPACING.lg,
    alignSelf: 'center',
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 1.5,
    borderColor: 'rgba(233,195,73,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.22)',
  },
  floorOrnamentText: {
    fontFamily: 'Cairo-Black',
    fontSize: 34,
    color: 'rgba(233,195,73,0.55)',
  },
  floorLabel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: SPACING.md,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  floorTitle: {
    fontFamily: 'Cairo-Bold',
    fontSize: TYPE.body.fontSize,
    color: COLORS.goldLight,
  },
  floorSub: {
    fontFamily: FONTS.ar.regular,
    fontSize: TYPE.caption.fontSize,
    color: COLORS.textFaint,
    marginTop: 2,
  },

  adBanner: {
    height: 84,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  adText: {
    fontFamily: FONTS.ar.medium,
    fontSize: TYPE.caption.fontSize,
    color: COLORS.textFaint,
    letterSpacing: 1,
  },
});
