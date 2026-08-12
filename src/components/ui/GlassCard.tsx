// ============================================================
// جرب حظك — GlassCard v3 (Neon Edition)
// ============================================================

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { COLORS, RADIUS } from '../../constants/theme';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  glow?: boolean;
}

export default function GlassCard({ children, style, glow = false }: GlassCardProps) {
  return (
    <View style={[styles.card, glow && styles.glow, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(26,10,46,0.6)',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(0,212,255,0.15)',
    padding: 16,
  },
  glow: {
    shadowColor: COLORS.neonBlue,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
});
