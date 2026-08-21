// ============================================================
// جرب حظك — WinFX
// لحظة الفوز السينمائية: انفجار شرارات شامبين بأقواس مكافئة
// + ومضة وحلقة متوسعة + توهج أطراف. تحترم reduced-motion.
// ============================================================

import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useReducedMotion } from '../../constants/motion';
import { COLORS } from '../../constants/theme';

export interface WinTrigger {
  /** مفتاح يتغير مع كل فوز — يمنع التكرار لنفس الجولة */
  key: string;
  /** 1 = فوز عادي، 2 = فوز كبير، 3 = فوز ضخم (طبيعي/كشف) */
  magnitude: 1 | 2 | 3;
}

/** PRNG حتمي (mulberry32) — نفس البذرة = نفس الانفجار */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Particle {
  dx: number;
  peak: number;
  dy: number;
  size: number;
  color: string;
  duration: number;
  delay: number;
}

const SPARK_COLORS = [COLORS.goldLight, COLORS.gold, '#F6E7C1', '#FFFFFF'];
const COUNTS: Record<number, number> = { 1: 18, 2: 30, 3: 44 };

function makeParticles(seed: number, magnitude: 1 | 2 | 3): Particle[] {
  const rand = mulberry32(seed);
  const spread = 70 + magnitude * 45;
  return Array.from({ length: COUNTS[magnitude] }, () => {
    const angle = rand() * Math.PI * 2;
    const dist = 60 + rand() * spread;
    return {
      dx: Math.cos(angle) * dist,
      peak: -30 - rand() * (50 + magnitude * 18),
      dy: Math.sin(angle) * dist,
      size: 3 + Math.floor(rand() * 4.5),
      color: SPARK_COLORS[Math.floor(rand() * SPARK_COLORS.length)],
      duration: 700 + rand() * (300 + magnitude * 150),
      delay: rand() * 120,
    };
  });
}

function Spark({ p, progress }: { p: Particle; progress: Animated.Value }) {
  return (
    <Animated.View
      testID="winfx-particle"
      style={[
        styles.spark,
        {
          width: p.size,
          height: p.size,
          borderRadius: p.size / 2,
          backgroundColor: p.color,
          opacity: progress.interpolate({ inputRange: [0, 0.08, 0.75, 1], outputRange: [0, 1, 1, 0] }),
          transform: [
            { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, p.dx] }) },
            { translateY: progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, p.peak, p.dy] }) },
            { scale: progress.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.4, 1, 0.7] }) },
          ],
        },
      ]}
    />
  );
}

export default function WinFX({ trigger }: { trigger: WinTrigger | null }) {
  const flash = useRef(new Animated.Value(0)).current;
  const ring = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(0)).current;
  const reduced = useReducedMotion();

  const particles = useMemo(
    () => (trigger ? makeParticles(hashKey(trigger.key), trigger.magnitude) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [trigger?.key]
  );

  useEffect(() => {
    if (!trigger) return;

    // اهتزاز خفيف/قوي حسب الحجم
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      if (trigger.magnitude >= 2) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
      }
    }

    if (reduced) {
      // إتاحة: ومضة ثابتة خاطفة فقط
      glow.setValue(0.5);
      Animated.timing(glow, { toValue: 0, duration: 600, useNativeDriver: true }).start();
      return;
    }

    flash.setValue(0);
    ring.setValue(0);
    glow.setValue(0);
    progress.setValue(0);

    Animated.parallel([
      // ومضة مركزية
      Animated.timing(flash, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      // حلقة متوسعة
      Animated.timing(ring, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      // توهج الأطراف
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 240, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]),
      // الشرارات
      Animated.timing(progress, {
        toValue: 1,
        duration: 1300,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ]).start();
  }, [trigger?.key, reduced, flash, ring, glow, progress]);

  if (!trigger) return null;

  return (
    <View style={styles.overlay} pointerEvents="none" testID="winfx">
      {/* توهج الأطراف */}
      <Animated.View style={[styles.glow, { opacity: glow }]} />

      {/* ومضة مركزية */}
      <Animated.View
        testID="winfx-flash"
        style={[
          styles.flash,
          {
            opacity: flash.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.85, 0] }),
            transform: [{ scale: flash.interpolate({ inputRange: [0, 1], outputRange: [0.3, 2.4] }) }],
          },
        ]}
      />

      {/* حلقة شامبين */}
      <Animated.View
        style={[
          styles.ring,
          {
            opacity: ring.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.9, 0] }),
            transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1.9] }) }],
          },
        ]}
      />

      {/* الشرارات */}
      {particles.map((p, i) => (
        <Spark key={i} p={p} progress={progress} />
      ))}
    </View>
  );
}

/** بذرة حتمية من مفتاح الفوز */
function hashKey(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 60,
  },
  glow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(201,169,97,0.10)',
  },
  flash: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(227,201,138,0.5)',
  },
  ring: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2.5,
    borderColor: COLORS.goldLight,
  },
  spark: {
    position: 'absolute',
  },
});
