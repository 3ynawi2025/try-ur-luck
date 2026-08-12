// ============================================================
// جرب حظك — GoldButton v2
// زر ذهبي فاخر بتدرج ومتوهج
// ============================================================

import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, FONT_SIZES, RADIUS, SIZES } from '../../constants/theme';

interface GoldButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'outline' | 'danger';
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export default function GoldButton({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  style,
  textStyle,
}: GoldButtonProps) {
  const isPrimary = variant === 'primary';

  if (isPrimary) {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.85}
        style={[styles.wrapper, disabled && styles.disabled, style]}
      >
        <LinearGradient
          colors={['#F4D03F', '#D4AF37', '#B5902A'] as readonly [string, string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.base, styles.gradientFill]}
        >
          <Text style={[styles.text, styles.textDark, textStyle]}>{title}</Text>
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
      style={[
        styles.base,
        styles.outline,
        variant === 'danger' && styles.dangerOutline,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          variant === 'danger' ? styles.textDanger : styles.textOutline,
          textStyle,
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: RADIUS.lg,
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 10,
  },
  base: {
    height: SIZES.buttonHeight,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  gradientFill: {
    width: '100%',
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  dangerOutline: {
    borderColor: COLORS.danger,
  },
  disabled: {
    opacity: 0.45,
  },
  text: {
    fontSize: FONT_SIZES.body,
    fontFamily: FONTS.arabic.bold,
    textAlign: 'center',
  },
  textDark: {
    color: COLORS.textDark,
    textShadowColor: 'rgba(255,255,255,0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  textOutline: {
    color: COLORS.primary,
  },
  textDanger: {
    color: COLORS.danger,
  },
});
