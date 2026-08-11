// ============================================================
// جرب حظك — Chip
// رقاقة الدراهم الملونة
// ============================================================

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SIZES, FONTS, FONT_SIZES, COLORS } from '../../constants/theme';

interface ChipProps {
  amount: number;
  size?: number;
}

function getChipColor(amount: number): { bg: string; text: string; border: string } {
  if (amount >= 5000) return { bg: '#6A1B9A', text: '#FFFFFF', border: '#4A148C' };
  if (amount >= 1000) return { bg: '#212121', text: '#FFFFFF', border: '#000000' };
  if (amount >= 500) return { bg: '#1565C0', text: '#FFFFFF', border: '#0D47A1' };
  if (amount >= 100) return { bg: '#C62828', text: '#FFFFFF', border: '#B71C1C' };
  return { bg: '#ECEFF1', text: '#37474F', border: '#CFD8DC' };
}

function formatAmount(amount: number): string {
  if (amount >= 1000) return `${(amount / 1000).toFixed(0)}K`;
  return amount.toString();
}

export default function Chip({ amount, size = SIZES.chipDiameter }: ChipProps) {
  const colors = getChipColor(amount);

  return (
    <View
      style={[
        styles.chip,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.bg,
          borderColor: colors.border,
        },
      ]}
    >
      <Text
        style={[styles.text, { color: colors.text, fontSize: size * 0.3 }]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {formatAmount(amount)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  text: {
    fontFamily: FONTS.english.bold,
    textAlign: 'center',
  },
});
