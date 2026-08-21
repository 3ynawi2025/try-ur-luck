// ============================================================
// جرب حظك — ActionButton
// زر إجراء موحد لشاشات اللعب: ضغط مرتد + Haptic + إطار ملون
// ============================================================

import React, { useRef } from 'react';
import { Pressable, Text, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { COLORS, FONTS, TYPE, SPACING, RADIUS, SHADOWS, ANIMATION } from '../../constants/theme';

interface ActionButtonProps {
  label: string;
  sub?: string;
  colors: readonly [string, string];
  onPress: () => void;
  flex?: number;
  /** نص داكن — للأزرار الفاتحة (شامبين) */
  darkText?: boolean;
}

export default function ActionButton({
  label,
  sub,
  colors,
  onPress,
  flex = 1,
  darkText = false,
}: ActionButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const to = (v: number) =>
    Animated.spring(scale, {
      toValue: v,
      useNativeDriver: true,
      damping: ANIMATION.spring.damping,
      stiffness: ANIMATION.spring.stiffness,
      mass: ANIMATION.spring.mass,
    }).start();

  return (
    <Animated.View style={{ flex, transform: [{ scale }] }}>
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
          onPress();
        }}
        onPressIn={() => to(0.95)}
        onPressOut={() => to(1)}
      >
        <LinearGradient
          colors={['#1B2230', '#0E131B']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[
            styles.btn,
            { borderColor: colors[0] },
            darkText && SHADOWS.goldSoft,
          ]}
        >
          <Text style={[styles.label, { color: colors[0] }]}>{label}</Text>
          {!!sub && <Text style={[styles.sub, { color: colors[0] }]}>{sub}</Text>}
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  btn: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    backgroundColor: COLORS.bgSoft,
  },
  label: {
    fontFamily: FONTS.ar.bold,
    fontSize: TYPE.body.fontSize,
    lineHeight: TYPE.body.lineHeight,
    includeFontPadding: false,
  },
  sub: {
    fontFamily: FONTS.ar.medium,
    fontSize: TYPE.caption.fontSize,
    lineHeight: TYPE.caption.lineHeight,
    opacity: 0.85,
  },
});
