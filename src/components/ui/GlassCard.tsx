// ============================================================
// جرب حظك — GlassCard
// سطح زجاجي بحافة شعرية ذهبية + عمق حقيقي
// ============================================================

import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, RADIUS, SPACING, SHADOWS, GRADIENTS } from '../../constants/theme';

type Variant = 'default' | 'gold' | 'sunken';

interface GlassCardProps {
  children: React.ReactNode;
  /** يُطبَّق على الغلاف الخارجي — للهوامش والعرض والظل */
  style?: StyleProp<ViewStyle>;
  /** يُطبَّق على حاوية المحتوى — لتخطيط الأبناء (flexDirection وغيره) */
  contentStyle?: StyleProp<ViewStyle>;
  variant?: Variant;
  /** خط ضوء ذهبي على الحافة العليا — يعطي إحساس الانعكاس */
  sheen?: boolean;
  /** توهج ذهبي حول البطاقة */
  glow?: boolean;
  padding?: number;
}

export default function GlassCard({
  children,
  style,
  contentStyle,
  variant = 'default',
  sheen = true,
  glow = false,
  padding = SPACING.lg,
}: GlassCardProps) {
  const isGold = variant === 'gold';
  const isSunken = variant === 'sunken';

  return (
    <View
      style={[
        styles.wrapper,
        isSunken ? SHADOWS.e1 : SHADOWS.e2,
        glow && SHADOWS.goldSoft,
        style,
      ]}
    >
      <LinearGradient
        colors={isGold ? GRADIENTS.surfaceGold : GRADIENTS.surface}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={[
          styles.surface,
          { padding },
          isGold && styles.goldBorder,
          isSunken && styles.sunken,
          contentStyle,
        ]}
      >
        {sheen && (
          <LinearGradient
            colors={
              isGold
                ? ['rgba(247,231,166,0.55)', 'rgba(247,231,166,0)']
                : ['rgba(255,255,255,0.20)', 'rgba(255,255,255,0)']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.sheen}
            pointerEvents="none"
          />
        )}
        {children}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
  },
  surface: {
    borderRadius: RADIUS.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  goldBorder: {
    borderColor: COLORS.hairlineGold,
  },
  sunken: {
    backgroundColor: COLORS.surfaceSunken,
    borderColor: 'rgba(0,0,0,0.5)',
  },
  sheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth * 2,
  },
});
