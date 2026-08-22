// ============================================================
// جرب حظك — الإعدادات (توجيه App Store — روابط الامتثال)
// شاشة مخفية: تُفتح من الملف الشخصي.
// ============================================================

import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import * as Linking from 'expo-linking';
import Screen from '../../components/ui/Screen';
import GlassCard from '../../components/ui/GlassCard';
import {
  BackIcon,
  InfoIcon,
  LockIcon,
  UserIcon,
  SendIcon,
  ChevronIcon,
} from '../../components/icons/GameIcons';
import { COLORS, FONTS, TYPE, SPACING, SIZES } from '../../constants/theme';
import { router } from 'expo-router';

const PRIVACY_URL = 'https://jareb-hazzak-server.onrender.com/privacy';
const SUPPORT_URL = 'https://jareb-hazzak-server.onrender.com/support';

function MenuRow({
  icon,
  label,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.menuRow}>
      <View style={styles.menuLeft}>
        {icon}
        <Text style={styles.menuLabel}>{label}</Text>
      </View>
      <ChevronIcon size={18} color={COLORS.textFaint} />
    </Pressable>
  );
}

export default function SettingsScreen() {
  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
            <BackIcon size={20} color={COLORS.textDim} />
          </Pressable>
          <Text style={styles.title}>الإعدادات</Text>
        </View>

        <GlassCard padding={SPACING.sm} style={styles.block}>
          <MenuRow
            icon={<InfoIcon size={19} color={COLORS.textDim} />}
            label="قواعد السلوك والإبلاغ"
            onPress={() => router.push('/(app)/rules')}
          />
          <View style={styles.divider} />
          <MenuRow
            icon={<LockIcon size={19} color={COLORS.textDim} />}
            label="شروط الاستخدام"
            onPress={() => router.push('/(app)/terms')}
          />
          <View style={styles.divider} />
          <MenuRow
            icon={<UserIcon size={19} color={COLORS.textDim} />}
            label="سياسة الخصوصية"
            onPress={() => Linking.openURL(PRIVACY_URL).catch(() => {})}
          />
          <View style={styles.divider} />
          <MenuRow
            icon={<SendIcon size={19} color={COLORS.textDim} />}
            label="الدعم"
            onPress={() => Linking.openURL(SUPPORT_URL).catch(() => {})}
          />
        </GlassCard>

        <Text style={styles.note}>حذف الحساب متاح من صفحة حسابك</Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: SIZES.screenPadding,
    paddingBottom: SPACING.xxxl,
    gap: SPACING.lg,
  },
  headerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: SPACING.md,
  },
  backBtn: {
    padding: SPACING.sm,
  },
  title: {
    fontFamily: FONTS.ar.bold,
    fontSize: TYPE.h2.fontSize,
    lineHeight: TYPE.h2.lineHeight,
    color: COLORS.text,
    flex: 1,
  },
  block: {
    gap: 0,
  },
  menuRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  menuLeft: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: SPACING.md,
  },
  menuLabel: {
    fontFamily: FONTS.ar.medium,
    fontSize: TYPE.body.fontSize,
    lineHeight: TYPE.body.lineHeight,
    color: COLORS.text,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.border,
    marginHorizontal: SPACING.md,
  },
  note: {
    fontFamily: FONTS.ar.regular,
    fontSize: TYPE.caption.fontSize,
    color: COLORS.textFaint,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
});
