// ============================================================
// جرب حظك — GoldButton v3 (Neon Edition)
// زر نيون بتدرج أزرق/بنفسجي + variants
// ============================================================

import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, FONT_SIZES, RADIUS } from '../../constants/theme';

interface GoldButtonProps {
  title: string;
  onPress: () => void;
  style?: ViewStyle | ViewStyle[];
  disabled?: boolean;
  variant?: 'primary' | 'outline' | 'danger';
}

export default function GoldButton({
  title,
  onPress,
  style,
  disabled = false,
  variant = 'primary',
}: GoldButtonProps) {
  const isOutline = variant === 'outline';
  const isDanger = variant === 'danger';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
      style={[styles.wrapper, isOutline && styles.outlineWrapper, style]}
    >
      {isOutline || isDanger ? (
        <View style={[styles.inner, isOutline && styles.outlineInner, isDanger && styles.dangerInner]}>
          <Text style={[styles.text, isOutline && styles.outlineText, isDanger && styles.dangerText]}>
            {title}
          </Text>
        </View>
      ) : (
        <LinearGradient
          colors={disabled ? ['#333', '#222'] : ['#00D4FF', '#7B2CBF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          <Text style={[styles.text, disabled && styles.textDisabled]}>{title}</Text>
        </LinearGradient>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    shadowColor: COLORS.neonBlue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  outlineWrapper: {
    shadowOpacity: 0.15,
    elevation: 3,
  },
  gradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  outlineInner: {
    backgroundColor: 'rgba(0,212,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0,212,255,0.4)',
  },
  dangerInner: {
    backgroundColor: 'rgba(255,0,85,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,0,85,0.4)',
  },
  text: {
    fontFamily: FONTS.arabic.bold,
    fontSize: FONT_SIZES.body,
    color: COLORS.textPrimary,
  },
  textDisabled: {
    color: COLORS.textMuted,
  },
  outlineText: {
    color: COLORS.neonBlue,
  },
  dangerText: {
    color: COLORS.neonPink,
  },
});
