// ============================================================
// جرب حظك — Chip
// رقاقة كازينو مجسّمة: حافة مشقوقة + إضاءة علوية + ظل تماس
// ============================================================

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, {
  Circle,
  Path,
  Defs,
  LinearGradient as SvgGradient,
  RadialGradient,
  Stop,
  G,
} from 'react-native-svg';
import { SIZES, FONTS, SHADOWS, formatCompact } from '../../constants/theme';

interface ChipProps {
  amount: number;
  size?: number;
  /** كومة رقاقات خلف الرقاقة الأمامية */
  stacked?: boolean;
}

interface ChipSkin {
  face: string;
  faceDark: string;
  edge: string;
  ink: string;
}

/** ألوان الرقاقات تتبع أعراف الكازينو: أبيض < أحمر < أخضر < أسود < بنفسجي */
function getSkin(amount: number): ChipSkin {
  if (amount >= 5000) return { face: '#6D28D9', faceDark: '#3B1682', edge: '#EDE4FF', ink: '#FFFFFF' };
  if (amount >= 1000) return { face: '#15161A', faceDark: '#050506', edge: '#D4AF37', ink: '#F7E7A6' };
  if (amount >= 500) return { face: '#0E6B48', faceDark: '#053B27', edge: '#EAF7F0', ink: '#FFFFFF' };
  if (amount >= 100) return { face: '#B01F2E', faceDark: '#6B0F1A', edge: '#FFE9EC', ink: '#FFFFFF' };
  return { face: '#E8E4DA', faceDark: '#B3ADA0', edge: '#3A3630', ink: '#26231E' };
}

/** ستة شقوق على المحيط — علامة الرقاقة الحقيقية */
function EdgeNotches({ s, color }: { s: number; color: string }) {
  const r = s / 2;
  const outer = r - s * 0.015;
  const inner = r - s * 0.155;
  const half = 15; // نصف زاوية الشق بالدرجات

  return (
    <G>
      {Array.from({ length: 6 }).map((_, i) => {
        const mid = (i * 60 - 90) * (Math.PI / 180);
        const a1 = mid - (half * Math.PI) / 180;
        const a2 = mid + (half * Math.PI) / 180;
        const p = (ang: number, rad: number) =>
          `${r + Math.cos(ang) * rad} ${r + Math.sin(ang) * rad}`;
        return (
          <Path
            key={i}
            d={`M ${p(a1, inner)} L ${p(a1, outer)} A ${outer} ${outer} 0 0 1 ${p(a2, outer)} L ${p(a2, inner)} A ${inner} ${inner} 0 0 0 ${p(a1, inner)} Z`}
            fill={color}
          />
        );
      })}
    </G>
  );
}

export default function Chip({ amount, size = SIZES.chipDiameter, stacked = false }: ChipProps) {
  const skin = getSkin(amount);
  const r = size / 2;
  const id = `c${Math.round(size)}${amount}`;

  return (
    <View style={{ width: size, height: size }}>
      {/* كومة أسفل الرقاقة */}
      {stacked && (
        <>
          <View
            style={[
              styles.stackLayer,
              { width: size, height: size, borderRadius: r, backgroundColor: skin.faceDark, bottom: -5 },
            ]}
          />
          <View
            style={[
              styles.stackLayer,
              { width: size, height: size, borderRadius: r, backgroundColor: skin.face, bottom: -2.5, opacity: 0.85 },
            ]}
          />
        </>
      )}

      <View style={[styles.chip, { width: size, height: size, borderRadius: r }, SHADOWS.e1]}>
        <Svg width={size} height={size}>
          <Defs>
            <RadialGradient id={`${id}f`} cx="38%" cy="30%" r="78%">
              <Stop offset="0%" stopColor={skin.face} stopOpacity={1} />
              <Stop offset="62%" stopColor={skin.face} stopOpacity={1} />
              <Stop offset="100%" stopColor={skin.faceDark} stopOpacity={1} />
            </RadialGradient>
            <SvgGradient id={`${id}g`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.30} />
              <Stop offset="55%" stopColor="#FFFFFF" stopOpacity={0} />
            </SvgGradient>
          </Defs>

          {/* الجسم */}
          <Circle cx={r} cy={r} r={r - 0.5} fill={`url(#${id}f)`} />
          {/* الشقوق المحيطية */}
          <EdgeNotches s={size} color={skin.edge} />
          {/* حلقة داخلية متقطعة */}
          <Circle
            cx={r}
            cy={r}
            r={size * 0.335}
            fill="none"
            stroke={skin.edge}
            strokeWidth={size * 0.028}
            strokeDasharray={`${size * 0.05} ${size * 0.042}`}
            opacity={0.8}
          />
          {/* قرص الوجه */}
          <Circle cx={r} cy={r} r={size * 0.295} fill={skin.faceDark} opacity={0.55} />
          <Circle
            cx={r}
            cy={r}
            r={size * 0.295}
            fill="none"
            stroke={skin.edge}
            strokeWidth={size * 0.022}
            opacity={0.55}
          />
          {/* إضاءة علوية */}
          <Circle cx={r} cy={r} r={r - 0.5} fill={`url(#${id}g)`} />
        </Svg>

        <View style={styles.labelWrap} pointerEvents="none">
          <Text
            style={[styles.label, { color: skin.ink, fontSize: size * 0.27 }]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {formatCompact(amount)}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  stackLayer: {
    position: 'absolute',
    left: 0,
  },
  labelWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: FONTS.num.black,
    textAlign: 'center',
    includeFontPadding: false,
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
