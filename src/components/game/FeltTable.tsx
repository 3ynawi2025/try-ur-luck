// ============================================================
// جرب حظك — FeltTable
// طاولة حقيقية: حافة جلدية + خيط ذهبي + جوخ بإضاءة مركزية
// ============================================================

import React from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, RadialGradient, Stop, Rect, Ellipse } from 'react-native-svg';
import { COLORS, FONTS, TYPE, SHADOWS, GRADIENTS } from '../../constants/theme';

interface FeltTableProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** نصف قطر الانحناء — كبير = بيضاوي */
  radius?: number;
  /** سماكة الحافة الجلدية */
  railWidth?: number;
  /** كلمة محفورة في وسط الجوخ */
  watermark?: string;
}

export default function FeltTable({
  children,
  style,
  radius = 200,
  railWidth = 13,
  watermark = 'جرب حظك',
}: FeltTableProps) {
  const innerRadius = Math.max(8, radius - railWidth);

  return (
    <View style={[styles.shell, { borderRadius: radius }, SHADOWS.felt, style]}>
      {/* الحافة الجلدية */}
      <LinearGradient
        colors={GRADIENTS.rail}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={[StyleSheet.absoluteFill, { borderRadius: radius }]}
      />
      {/* لمعة أعلى الحافة */}
      <LinearGradient
        colors={['rgba(255,225,180,0.28)', 'rgba(255,225,180,0)']}
        style={[styles.railGloss, { borderRadius: radius }]}
        pointerEvents="none"
      />

      {/* الجوخ */}
      <View
        style={[
          styles.feltWrap,
          { margin: railWidth, borderRadius: innerRadius },
        ]}
      >
        {/* width/height صريحان — بدونهما لا يملأ الـ SVG الحاوية على الويب */}
        <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
          <Defs>
            <RadialGradient id="feltLight" cx="50%" cy="42%" rx="66%" ry="72%">
              <Stop offset="0%" stopColor={COLORS.feltLight} stopOpacity={1} />
              <Stop offset="55%" stopColor={COLORS.felt} stopOpacity={1} />
              <Stop offset="100%" stopColor={COLORS.feltDark} stopOpacity={1} />
            </RadialGradient>
            <RadialGradient id="feltVignette" cx="50%" cy="50%" rx="52%" ry="58%">
              <Stop offset="60%" stopColor="#000" stopOpacity={0} />
              <Stop offset="100%" stopColor="#000" stopOpacity={0.45} />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#feltLight)" />
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#feltVignette)" />
        </Svg>

        {/* خيط ذهبي داخلي — خط الرهان */}
        <View
          style={[
            styles.betLine,
            { borderRadius: Math.max(6, innerRadius - 12) },
          ]}
          pointerEvents="none"
        />

        {/* الكلمة المحفورة */}
        {!!watermark && (
          <View style={styles.watermarkWrap} pointerEvents="none">
            <Text style={styles.watermark}>{watermark}</Text>
          </View>
        )}

        <View style={styles.content}>{children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.6)',
  },
  railGloss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '30%',
  },
  feltWrap: {
    flex: 1,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(212,175,55,0.45)',
  },
  betLine: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    bottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(247,231,166,0.16)',
  },
  watermarkWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  watermark: {
    fontFamily: FONTS.ar.black,
    fontSize: 34,
    color: 'rgba(255,255,255,0.055)',
    letterSpacing: 2,
    includeFontPadding: false,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
