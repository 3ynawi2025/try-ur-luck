// ============================================================
// جرب حظك — GlassCard v2
// بطاقة زجاجية شفافة بإطار ذهبي خافت
// ============================================================

import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { COLORS, RADIUS, SPACING } from '../../constants/theme';

interface GlassCardProps {
  children: ReactNode;
  style?: ViewStyle;
  glow?: boolean;
}

export default function GlassCard({ children, style, glow = false }: GlassCardProps) {
  return (
    <View style={[styles.card, glow && styles.glow, style]}>
      <View style={styles.inner}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(19, 46, 53, 0.78)',
    overflow: 'hidden',
  },
  glow: {
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  inner: {
    padding: SPACING.md,
  },
});
