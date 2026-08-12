// ============================================================
// جرب حظك — GoldButton
// زر ذهبي معدني: تدرّج 4 محطات + لمعة علوية + ارتداد عند الضغط
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
      speed: 40,
      bounciness: 6,
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
          color={isPrimary ? COLORS.onGold : COLORS.gold}
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
        onPressIn={() => press(0.965)}
        onPressOut={() => press(1)}
        disabled={inactive}
        style={[
          styles.wrapper,
          isPrimary && !inactive && SHADOWS.gold,
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
            {/* لمعة زجاجية على النصف العلوي */}
            <LinearGradient
              colors={['rgba(255,255,255,0.42)', 'rgba(255,255,255,0)']}
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
    height: '48%',
  },
  outline: {
    backgroundColor: 'rgba(212,175,55,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.42)',
  },
  danger: {
    backgroundColor: 'rgba(226,61,77,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(226,61,77,0.40)',
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
  textDanger: { color: '#FF8A94' },
  textGhost: { color: COLORS.text },
  textDisabled: { color: COLORS.textFaint },
});
