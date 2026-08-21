// ============================================================
// جرب حظك — GoldButton
// زر فاخر بنظام Dark Luxe:
// primary = الشامبين الوحيد (للـCTA الرئيسي فقط)
// outline/ghost = فحمي بحواف شعرية ونص عاجي (الاستخدام اليومي)
// ============================================================

import React, { useRef } from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  ViewStyle,
  StyleProp,
  View,
  Animated,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  COLORS,
  FONTS,
  TYPE,
  RADIUS,
  SIZES,
  SPACING,
  GRADIENTS,
  SHADOWS,
  ANIMATION,
} from '../../constants/theme';

type Variant = 'primary' | 'outline' | 'danger' | 'ghost';
type Size = 'md' | 'sm';

interface GoldButtonProps {
  title: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  loading?: boolean;
  variant?: Variant;
  size?: Size;
  /** أيقونة تظهر قبل النص */
  icon?: React.ReactNode;
}

export default function GoldButton({
  title,
  onPress,
  style,
  disabled = false,
  loading = false,
  variant = 'primary',
  size = 'md',
  icon,
}: GoldButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const isPrimary = variant === 'primary';
  const inactive = disabled || loading;

  const press = (to: number) =>
    Animated.spring(scale, {
      toValue: to,
      useNativeDriver: true,
      damping: ANIMATION.spring.damping,
      stiffness: ANIMATION.spring.stiffness,
      mass: ANIMATION.spring.mass,
    }).start();

  const handlePress = () => {
    if (inactive) return;
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(
        isPrimary ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light
      ).catch(() => {});
    }
    onPress();
  };

  const height = size === 'sm' ? SIZES.buttonHeightSm : SIZES.buttonHeight;
  const label = (
    <View style={styles.labelRow}>
      {loading ? (
        <ActivityIndicator
          size="small"
          color={isPrimary ? COLORS.onGold : COLORS.text}
        />
      ) : (
        <>
          {icon}
          <Text
            style={[
              styles.text,
              size === 'sm' && styles.textSm,
              variant === 'outline' && styles.textOutline,
              variant === 'danger' && styles.textDanger,
              variant === 'ghost' && styles.textGhost,
              inactive && isPrimary && styles.textDisabled,
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>
        </>
      )}
    </View>
  );

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable
        onPress={handlePress}
        onPressIn={() => press(0.96)}
        onPressOut={() => press(1)}
        disabled={inactive}
        style={[
          styles.wrapper,
          isPrimary && !inactive && SHADOWS.goldSoft,
          !isPrimary && SHADOWS.e1,
          inactive && styles.wrapperDisabled,
        ]}
      >
        {isPrimary ? (
          <LinearGradient
            colors={
              inactive
                ? (['#3A3830', '#26241E'] as const)
                : GRADIENTS.goldMetal
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            locations={[0, 0.42, 0.78, 1]}
            style={[styles.body, { height }]}
          >
            {/* لمعة زجاجية خافتة على النصف العلوي */}
            <LinearGradient
              colors={['rgba(255,255,255,0.28)', 'rgba(255,255,255,0)']}
              style={styles.gloss}
              pointerEvents="none"
            />
            {label}
          </LinearGradient>
        ) : (
          <View
            style={[
              styles.body,
              { height },
              variant === 'outline' && styles.outline,
              variant === 'danger' && styles.danger,
              variant === 'ghost' && styles.ghost,
            ]}
          >
            {label}
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  wrapperDisabled: {
    opacity: 0.6,
  },
  body: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.md,
  },
  gloss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '42%',
  },
  outline: {
    backgroundColor: 'rgba(201,169,97,0.05)',
    borderWidth: 1,
    borderColor: COLORS.hairlineGold,
  },
  danger: {
    backgroundColor: 'rgba(232,169,160,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(232,169,160,0.35)',
  },
  ghost: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  labelRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  text: {
    fontFamily: FONTS.ar.bold,
    fontSize: TYPE.body.fontSize,
    lineHeight: TYPE.body.lineHeight,
    color: COLORS.onGold,
    letterSpacing: 0.2,
    includeFontPadding: false,
  },
  textSm: {
    fontSize: TYPE.small.fontSize,
    lineHeight: TYPE.small.lineHeight,
  },
  textOutline: { color: COLORS.goldLight },
  textDanger: { color: COLORS.crimson },
  textGhost: { color: COLORS.text },
  textDisabled: { color: COLORS.textFaint },
});
