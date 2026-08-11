// ============================================================
// جرب حظك — Input
// حقل إدخال بتصميم زجاجي
// ============================================================

import React from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import { COLORS, FONTS, FONT_SIZES, RADIUS, SPACING, SIZES } from '../../constants/theme';

interface InputProps extends TextInputProps {
  label?: string;
  prefix?: string;
  error?: string;
  containerStyle?: ViewStyle;
}

export default function Input({
  label,
  prefix,
  error,
  containerStyle,
  style,
  ...props
}: InputProps) {
  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.container, error && styles.errorBorder]}>
        {prefix && <Text style={styles.prefix}>{prefix}</Text>}
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={COLORS.textMuted}
          textAlign="right"
          {...props}
        />
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: SPACING.md,
  },
  label: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.small,
    fontFamily: FONTS.arabic.regular,
    marginBottom: SPACING.sm,
    textAlign: 'right',
  },
  container: {
    height: SIZES.inputHeight,
    backgroundColor: COLORS.bgSurface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
  },
  errorBorder: {
    borderColor: COLORS.danger,
  },
  prefix: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.body,
    fontFamily: FONTS.arabic.regular,
    marginRight: SPACING.sm,
  },
  input: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.body,
    fontFamily: FONTS.arabic.regular,
    height: '100%',
  },
  error: {
    color: COLORS.danger,
    fontSize: FONT_SIZES.caption,
    fontFamily: FONTS.arabic.regular,
    marginTop: SPACING.xs,
    textAlign: 'right',
  },
});
