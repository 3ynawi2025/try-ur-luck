// ============================================================
// جرب حظك — Input
// حقل غائر مع تفعيل ذهبي عند التركيز
// ============================================================

import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { COLORS, FONTS, TYPE, RADIUS, SPACING, SIZES } from '../../constants/theme';

interface InputProps extends TextInputProps {
  label?: string;
  prefix?: string;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
  /** أرقام لاتينية بمسافة حروف — لرقم الجوال ورمز التحقق */
  numeric?: boolean;
}

export default function Input({
  label,
  prefix,
  error,
  containerStyle,
  style,
  numeric = false,
  onFocus,
  onBlur,
  ...props
}: InputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View
        style={[
          styles.field,
          focused && styles.fieldFocused,
          !!error && styles.fieldError,
        ]}
      >
        {prefix && <Text style={styles.prefix}>{prefix}</Text>}
        <TextInput
          style={[styles.input, numeric && styles.inputNumeric, style]}
          placeholderTextColor={COLORS.textFaint}
          selectionColor={COLORS.gold}
          textAlign={numeric ? 'center' : 'right'}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...props}
        />
      </View>

      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: SPACING.lg,
  },
  label: {
    color: COLORS.textDim,
    fontSize: TYPE.small.fontSize,
    lineHeight: TYPE.small.lineHeight,
    fontFamily: FONTS.ar.medium,
    marginBottom: SPACING.sm,
    textAlign: 'right',
  },
  field: {
    height: SIZES.inputHeight,
    backgroundColor: COLORS.surfaceSunken,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
  fieldFocused: {
    borderColor: COLORS.gold,
    backgroundColor: 'rgba(212,175,55,0.05)',
  },
  fieldError: {
    borderColor: COLORS.crimson,
  },
  prefix: {
    color: COLORS.textDim,
    fontSize: TYPE.body.fontSize,
    fontFamily: FONTS.num.semibold,
  },
  input: {
    flex: 1,
    color: COLORS.text,
    fontSize: TYPE.body.fontSize,
    fontFamily: FONTS.ar.medium,
    height: '100%',
    padding: 0,
  },
  inputNumeric: {
    fontFamily: FONTS.num.bold,
    fontSize: TYPE.h2.fontSize,
    letterSpacing: 4,
  },
  error: {
    color: COLORS.crimson,
    fontSize: TYPE.caption.fontSize,
    fontFamily: FONTS.ar.medium,
    marginTop: SPACING.xs,
    textAlign: 'right',
  },
});
