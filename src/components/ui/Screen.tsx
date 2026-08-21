// ============================================================
// جرب حظك — Screen
// غلاف الشاشة: تدرّج ليلي عميق + هالة شامبين خافتة جدًا + منطقة آمنة
// (Dark Luxe: الإضاءة خافتة — الفخامة من الهدوء)
// ============================================================

import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import { COLORS, GRADIENTS } from '../../constants/theme';

interface ScreenProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** يطبّق الحشوة العلوية للمنطقة الآمنة (افتراضي: نعم) */
  safeTop?: boolean;
  /** يطبّق الحشوة السفلية — أطفئها داخل التبويبات */
  safeBottom?: boolean;
  /** هالة علوية خافتة — إحساس إضاءة الصالة */
  ambient?: boolean;
}

/** هالة شامبين خافتة أعلى الشاشة (SVG لأن RN لا يدعم التدرّج الشعاعي) */
function AmbientGlow() {
  return (
    <Svg width="100%" height="100%" style={styles.glow} pointerEvents="none">
      <Defs>
        <RadialGradient id="halo" cx="50%" cy="0%" rx="72%" ry="100%">
          <Stop offset="0%" stopColor={COLORS.gold} stopOpacity={0.09} />
          <Stop offset="60%" stopColor={COLORS.gold} stopOpacity={0.03} />
          <Stop offset="100%" stopColor={COLORS.bg} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#halo)" />
    </Svg>
  );
}

export default function Screen({
  children,
  style,
  safeTop = true,
  safeBottom = false,
  ambient = true,
}: ScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <LinearGradient colors={GRADIENTS.screen} style={StyleSheet.absoluteFill} />
      {ambient && <AmbientGlow />}
      <View
        style={[
          styles.content,
          {
            paddingTop: safeTop ? insets.top : 0,
            paddingBottom: safeBottom ? insets.bottom : 0,
          },
          style,
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  glow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 340,
  },
  content: {
    flex: 1,
  },
});
