// ============================================================
// جرب حظك — قواعد السلوك والإبلاغ (توجيه App Store 1.2 — UGC)
// شاشة مخفية: تُفتح من الملف الشخصي.
// ============================================================

import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Linking } from 'react-native';
import Screen from '../../components/ui/Screen';
import GlassCard from '../../components/ui/GlassCard';
import GoldButton from '../../components/ui/GoldButton';
import {
  BackIcon,
  MicIcon,
  InfoIcon,
  CrownIcon,
  LockIcon,
  SendIcon,
} from '../../components/icons/GameIcons';
import { COLORS, FONTS, TYPE, SPACING, SIZES } from '../../constants/theme';
import { router } from 'expo-router';

const SUPPORT_EMAIL = 'support@jareb-hazzak.app';

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <GlassCard padding={SPACING.xl} style={styles.block}>
      <View style={styles.sectionHead}>
        {icon}
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </GlassCard>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.bullet}>
      <View style={styles.bulletDot} />
      <Text style={styles.bulletText}>{children}</Text>
    </View>
  );
}

export default function RulesScreen() {
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
          <Text style={styles.title}>قواعد السلوك</Text>
        </View>

        <Text style={styles.subtitle}>
          للحفاظ على مجلس آمن وممتع للجميع — الإساءة في الصوت تعرّضك للكتم أو الحظر
        </Text>

        <Section icon={<MicIcon size={20} color={COLORS.gold} />} title="الصوت">
          <Bullet>ممنوع السباب أو التحرش أو الإزعاج الصوتي داخل الغرف.</Bullet>
          <Bullet>جلسات الصوت تُراقب عبر بلاغات اللاعبين، والمخالفون يُعاقبون.</Bullet>
          <Bullet>لا تُسجَّل المكالمات ولا تُخزَّن — الاعتماد على البلاغات فقط.</Bullet>
        </Section>

        <Section icon={<InfoIcon size={20} color={COLORS.gold} />} title="الإبلاغ">
          <Bullet>لتبليغ عن لاعب، اضغط زر ⚑ بجانب اسمه في شريط الطاولة.</Bullet>
          <Bullet>اختر السبب (إساءة صوتية، تحرش، سب، غش، إزعاج) ثم أرسل.</Bullet>
          <Bullet>البلاغات سرية — لا يطّلع عليها اللاعب المُبلَّغ عنه.</Bullet>
        </Section>

        <Section icon={<CrownIcon size={20} color={COLORS.gold} />} title="عقوبات الإدارة">
          <Bullet>كتم مؤقت: يُمنع اللاعب من الدردشة الصوتية مؤقتًا.</Bullet>
          <Bullet>حظر دائم: يُمنع اللاعب من دخول حسابه نهائيًا.</Bullet>
          <Bullet>الإدارة تراجع كل بلاغ وتتخذ الإجراء المناسب.</Bullet>
        </Section>

        <Section icon={<LockIcon size={20} color={COLORS.gold} />} title="الحجب">
          <Bullet>يمكنك حجب أي لاعب ليمنع طلبات الصداقة والتواصل معك.</Bullet>
          <Bullet>الحجب متاح من قائمة اللاعب ومن إعداداتك.</Bullet>
        </Section>

        <GoldButton
          title="تواصل مع الدعم"
          icon={<SendIcon size={18} color={COLORS.onGold} />}
          onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`).catch(() => {})}
          style={styles.supportBtn}
        />
        <Text style={styles.supportHint}>{SUPPORT_EMAIL}</Text>
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
  subtitle: {
    fontFamily: FONTS.ar.regular,
    fontSize: TYPE.small.fontSize,
    lineHeight: TYPE.small.lineHeight,
    color: COLORS.textDim,
    textAlign: 'right',
    marginTop: -SPACING.xs,
  },
  block: {
    gap: SPACING.md,
  },
  sectionHead: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  sectionTitle: {
    fontFamily: FONTS.ar.bold,
    fontSize: TYPE.h3.fontSize,
    lineHeight: TYPE.h3.lineHeight,
    color: COLORS.text,
  },
  bullet: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.gold,
    marginTop: 8,
  },
  bulletText: {
    flex: 1,
    fontFamily: FONTS.ar.regular,
    fontSize: TYPE.small.fontSize,
    lineHeight: TYPE.small.lineHeight,
    color: COLORS.textDim,
    textAlign: 'right',
  },
  supportBtn: {
    marginTop: SPACING.sm,
  },
  supportHint: {
    fontFamily: FONTS.num.medium,
    fontSize: TYPE.caption.fontSize,
    color: COLORS.textFaint,
    textAlign: 'center',
    marginTop: -SPACING.sm,
  },
});
