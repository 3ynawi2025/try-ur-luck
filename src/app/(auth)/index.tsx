// ============================================================
// جرب حظك — Onboarding / Splash
// ============================================================

import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { router } from 'expo-router';
import GoldButton from '../../components/ui/GoldButton';
import { COLORS, FONTS, FONT_SIZES, SPACING } from '../../constants/theme';

const { width, height } = Dimensions.get('window');

export default function OnboardingScreen() {
  return (
    <View style={styles.container}>
      {/* Background pattern */}
      <View style={styles.bgPattern}>
        <Text style={styles.bgPatternText}>♠</Text>
        <Text style={[styles.bgPatternText, styles.bgPatternOffset]}>♥</Text>
        <Text style={[styles.bgPatternText, styles.bgPatternOffset2]}>♦</Text>
        <Text style={[styles.bgPatternText, styles.bgPatternOffset3]}>♣</Text>
      </View>

      {/* Main content */}
      <View style={styles.content}>
        <Text style={styles.emoji}>🎰</Text>
        <Text style={styles.title}>جرب حظك</Text>
        <Text style={styles.subtitle}>try ur luck</Text>
        <Text style={styles.tagline}>مجلسك الاجتماعي للألعاب</Text>
      </View>

      {/* Action */}
      <View style={styles.footer}>
        <GoldButton
          title="ابدأ الرحلة"
          onPress={() => router.push('/(auth)/phone')}
        />
        <Text style={styles.note}>الدراهم افتراضية وليس لها قيمة نقدية</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
    justifyContent: 'space-between',
    padding: SPACING.xl,
  },
  bgPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.08,
  },
  bgPatternText: {
    fontSize: 120,
    color: COLORS.primary,
    position: 'absolute',
    top: '20%',
    left: '15%',
  },
  bgPatternOffset: {
    top: '30%',
    left: '65%',
  },
  bgPatternOffset2: {
    top: '55%',
    left: '25%',
  },
  bgPatternOffset3: {
    top: '70%',
    left: '70%',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 64,
    marginBottom: SPACING.lg,
  },
  title: {
    fontFamily: FONTS.arabic.bold,
    fontSize: FONT_SIZES.hero,
    color: COLORS.primary,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: FONTS.english.regular,
    fontSize: FONT_SIZES.h3,
    color: COLORS.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  tagline: {
    fontFamily: FONTS.arabic.regular,
    fontSize: FONT_SIZES.body,
    color: COLORS.textMuted,
    marginTop: SPACING.lg,
    textAlign: 'center',
  },
  footer: {
    paddingBottom: SPACING.xl,
    gap: SPACING.md,
  },
  note: {
    fontFamily: FONTS.arabic.light,
    fontSize: FONT_SIZES.caption,
    color: COLORS.textMuted,
    textAlign: 'center',
    opacity: 0.6,
  },
});
