// ============================================================
// جرب حظك — شاشة الترحيب
// ============================================================

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Dimensions } from 'react-native';
import { router, type Href } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Screen from '../../components/ui/Screen';
import GoldButton from '../../components/ui/GoldButton';
import PlayingCard from '../../components/game/PlayingCard';
import { LogoMark } from '../../components/icons/GameIcons';
import { COLORS, FONTS, TYPE, SPACING, SIZES } from '../../constants/theme';
import { useReducedMotion } from '../../constants/motion';
import { useAuthStore } from '../../stores/authStore';

const { width } = Dimensions.get('window');

/** أوراق مروحة خلف الشعار */
const FAN = [
  { card: { suit: 'spades', rank: 'A' }, rotate: '-18deg', x: -76, y: 16 },
  { card: { suit: 'hearts', rank: 'K' }, rotate: '-6deg', x: -26, y: 0 },
  { card: { suit: 'diamonds', rank: 'Q' }, rotate: '6deg', x: 26, y: 0 },
  { card: { suit: 'clubs', rank: 'J' }, rotate: '18deg', x: 76, y: 16 },
] as const;

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const enter = useRef(new Animated.Value(0)).current;
  const float = useRef(new Animated.Value(0)).current;
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const reduced = useReducedMotion();

  // إذا كان المستخدم مسجلاً، ادخل مباشرة إلى التطبيق
  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/(app)');
    }
  }, [isAuthenticated]);

  useEffect(() => {
    // إتاحة: بلا حركة عند تقليل الحركة — يظهر المحتوى ثابتًا
    if (reduced) {
      enter.setValue(1);
      return;
    }

    Animated.timing(enter, {
      toValue: 1,
      duration: 700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, {
          toValue: 1,
          duration: 2600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(float, {
          toValue: 0,
          duration: 2600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [reduced]);

  const floatY = float.interpolate({ inputRange: [0, 1], outputRange: [0, -9] });

  return (
    <Screen safeTop={false}>
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        {/* ===== البطل ===== */}
        <Animated.View
          style={[
            styles.hero,
            {
              opacity: enter,
              transform: [
                { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [26, 0] }) },
              ],
            },
          ]}
        >
          <Animated.View style={[styles.fan, { transform: [{ translateY: floatY }] }]}>
            {FAN.map((f, i) => (
              <View
                key={i}
                style={[
                  styles.fanCard,
                  { transform: [{ translateX: f.x }, { translateY: f.y }, { rotate: f.rotate }] },
                ]}
              >
                <PlayingCard card={f.card as any} width={70} height={98} />
              </View>
            ))}
          </Animated.View>

          <View style={styles.logo}>
            <LogoMark size={84} />
          </View>

          <Text style={styles.title}>جرب حظك</Text>
          <View style={styles.ruleRow}>
            <LinearGradient
              colors={['rgba(201,169,97,0)', COLORS.gold]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.rule}
            />
            <Text style={styles.latin}>TRY UR LUCK</Text>
            <LinearGradient
              colors={[COLORS.gold, 'rgba(201,169,97,0)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.rule}
            />
          </View>
          <Text style={styles.tagline}>مجلسك الاجتماعي للورق — بصوت مباشر</Text>
        </Animated.View>

        {/* ===== الإجراء ===== */}
        <Animated.View
          style={[
            styles.footer,
            {
              opacity: enter,
              transform: [
                { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) },
              ],
            },
          ]}
        >
          <GoldButton title="ابدأ الآن" onPress={() => router.push('/(auth)/login' as Href)} />
          <Text style={styles.note}>الدراهم افتراضية بالكامل وليس لها أي قيمة نقدية</Text>
        </Animated.View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: SIZES.screenPadding,
    justifyContent: 'space-between',
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fan: {
    position: 'absolute',
    top: '18%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.5,
  },
  fanCard: {
    position: 'absolute',
  },
  logo: {
    marginTop: 120,
    marginBottom: SPACING.lg,
  },
  title: {
    fontFamily: FONTS.ar.black,
    fontSize: 44,
    lineHeight: 58,
    color: COLORS.text,
    textAlign: 'center',
    includeFontPadding: false,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginTop: SPACING.xs,
  },
  rule: {
    width: 42,
    height: 1,
  },
  latin: {
    fontFamily: FONTS.num.semibold,
    fontSize: TYPE.caption.fontSize,
    color: COLORS.gold,
    letterSpacing: 4,
  },
  tagline: {
    fontFamily: FONTS.ar.medium,
    fontSize: TYPE.body.fontSize,
    lineHeight: TYPE.body.lineHeight,
    color: COLORS.textDim,
    textAlign: 'center',
    marginTop: SPACING.xl,
  },
  footer: {
    gap: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  note: {
    fontFamily: FONTS.ar.regular,
    fontSize: TYPE.caption.fontSize,
    color: COLORS.textFaint,
    textAlign: 'center',
  },
});
