// ============================================================
// جرب حظك — FlyCard
// حركة توزيع سينمائية: البطاقة تطير من مصدرها (حذاء الموزع/مركز
// الطاولة) إلى موضعها مع تتابع، ويمكن قلبها (scaleX) عند الكشف.
// يحترم reduced-motion (تظهر فورًا بلا حركة).
// ============================================================

import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleProp, ViewStyle } from 'react-native';
import { useReducedMotion } from '../../constants/motion';
import { ANIMATION } from '../../constants/theme';

export type FlyOrigin = 'shoe' | 'dealer' | 'center';

interface FlyCardProps {
  /** يتغير عند بدء تسلسل جديد (هوية البطاقة/اليد) */
  dealKey: string;
  /** مصدر الانسياب */
  origin?: FlyOrigin;
  /** تأخير قبل البدء (للتتابع ووقفة الترقّب) */
  delay?: number;
  /** مدة الرحلة */
  duration?: number;
  /** قلب الورقة (scaleX) عند الوصول */
  flip?: boolean;
  /** يعيد تشغيل القلب عند تغيّر هذا المفتاح (كشف الأوراق) */
  flipKey?: string;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

const ORIGIN_FROM: Record<FlyOrigin, { y: number; x: number; scale: number }> = {
  // من حذاء البطاقات أسفل الشاشة
  shoe: { y: 160, x: 0, scale: 0.72 },
  // من يد الموزع أعلى مركز الطاولة
  dealer: { y: -110, x: 0, scale: 0.55 },
  // من مركز الطاولة (الوعاء)
  center: { y: 0, x: 0, scale: 0.5 },
};

export default function FlyCard({
  dealKey,
  origin = 'dealer',
  delay = 0,
  duration = 420,
  flip = false,
  flipKey,
  style,
  children,
}: FlyCardProps) {
  const entry = useRef(new Animated.Value(0)).current;
  const flipV = useRef(new Animated.Value(1)).current;
  const reduced = useReducedMotion();
  const firstFlip = useRef(true);

  // رحلة الدخول
  useEffect(() => {
    entry.setValue(0);
    if (reduced) {
      entry.setValue(1);
      return;
    }
    Animated.timing(entry, {
      toValue: 1,
      duration,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [dealKey, reduced, delay, duration, entry]);

  // القلب عند الكشف (نتخطى أول ظهور حتى لا يقلب أثناء الرحلة)
  useEffect(() => {
    if (firstFlip.current) {
      firstFlip.current = false;
      return;
    }
    if (reduced) {
      flipV.setValue(1);
      return;
    }
    Animated.sequence([
      Animated.timing(flipV, { toValue: 0, duration: 180, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      Animated.timing(flipV, { toValue: 1, duration: 200, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, [flipKey, reduced, flipV]);

  const from = ORIGIN_FROM[origin];

  return (
    <Animated.View
      style={[
        {
          opacity: entry,
          transform: [
            { translateY: entry.interpolate({ inputRange: [0, 1], outputRange: [from.y, 0] }) },
            { translateX: entry.interpolate({ inputRange: [0, 1], outputRange: [from.x, 0] }) },
            { scale: entry.interpolate({ inputRange: [0, 1], outputRange: [from.scale, 1] }) },
            { scaleX: flip ? flipV : 1 },
          ],
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}
