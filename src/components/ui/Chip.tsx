// ============================================================
// جرب حظك — Chip v2
// رقاقة كازينو حقيقية بحافة ذهبية
// ============================================================

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SIZES, FONTS, COLORS } from '../../constants/theme';

interface ChipProps {
  amount: number;
  size?: number;
}

function getChipColors(amount: number): { bg: string; accent: string } {
  if (amount >= 5000) return { bg: '#6A1B9A', accent: '#E1BEE7' };
  if (amount >= 1000) return { bg: '#212121', accent: '#BDBDBD' };
  if (amount >= 500) return { bg: '#1565C0', accent: '#90CAF9' };
  if (amount >= 100) return { bg: '#C62828', accent: '#FFCDD2' };
  return { bg: '#ECEFF1', accent: '#78909C' };
}

function formatAmount(amount: number): string {
  if (amount >= 1000) return `${(amount / 1000).toFixed(0)}K`;
  return amount.toString();
}

export default function Chip({ amount, size = SIZES.chipDiameter }: ChipProps) {
  const colors = getChipColors(amount);

  return (
    <View
      style={[
        styles.chip,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.bg,
          borderColor: colors.accent,
        },
      ]}
    >
      <View
        style={[
          styles.dashedRing,
          {
            width: size * 0.72,
            height: size * 0.72,
            borderRadius: size * 0.36,
            borderColor: colors.accent,
          },
        ]}
      />
      <Text
        style={[
          styles.text,
          { color: colors.accent, fontSize: size * 0.28 },
        ]}
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
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 4,
  },
  dashedRing: {
    position: 'absolute',
    borderWidth: 2,
    borderStyle: 'dashed',
    opacity: 0.8,
  },
  text: {
    fontFamily: FONTS.english.bold,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
