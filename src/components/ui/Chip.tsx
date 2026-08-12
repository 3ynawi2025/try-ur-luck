// ============================================================
// جرب حظك — Chip v3 (SVG Edition)
// رقاقة كازينو حقيقية بتفاصيل حافة
// ============================================================

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Rect } from 'react-native-svg';
import { SIZES, FONTS } from '../../constants/theme';

interface ChipProps {
  amount: number;
  size?: number;
}

function getChipColors(amount: number): { base: string; dark: string; light: string } {
  if (amount >= 5000) return { base: '#7C3AED', dark: '#5B21B6', light: '#C4B5FD' };
  if (amount >= 1000) return { base: '#0F172A', dark: '#0A0F1A', light: '#DC2626' };
  if (amount >= 500) return { base: '#1F1829', dark: '#0F172A', light: '#2563EB' };
  if (amount >= 100) return { base: '#0A0F1A', dark: '#000000', light: '#22C55E' };
  return { base: '#ECEFF1', dark: '#90A4AE', light: '#37474F' };
}

function formatAmount(amount: number): string {
  if (amount >= 1000) return `${(amount / 1000).toFixed(0)}K`;
  return amount.toString();
}

function EdgeRects({ size, color }: { size: number; color: string }) {
  const count = 8;
  const radius = size / 2 - 3;
  const rectW = 4;
  const rectH = 10;
  const rects = [];

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * 360;
    const rad = (angle * Math.PI) / 180;
    const cx = size / 2 + Math.cos(rad) * (radius - 5);
    const cy = size / 2 + Math.sin(rad) * (radius - 5);
    rects.push(
      <Rect
        key={i}
        x={cx - rectW / 2}
        y={cy - rectH / 2}
        width={rectW}
        height={rectH}
        fill={color}
        transform={`rotate(${angle}, ${cx}, ${cy})`}
      />
    );
  }
  return <>{rects}</>;
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
          backgroundColor: colors.base,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.4,
          shadowRadius: 4,
          elevation: 5,
        },
      ]}
    >
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={size / 2 - 2} fill={colors.base} />
        <EdgeRects size={size} color={colors.light} />
        <Circle cx={size / 2} cy={size / 2} r={size * 0.32} fill="none" stroke={colors.light} strokeWidth={2} strokeDasharray="4 3" />
        <Circle cx={size / 2} cy={size / 2} r={size * 0.18} fill={colors.dark} />
      </Svg>

      <Text
        style={[
          styles.text,
          { color: colors.light, fontSize: size * 0.26 },
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
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  text: {
    fontFamily: FONTS.english.bold,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    zIndex: 2,
  },
});
