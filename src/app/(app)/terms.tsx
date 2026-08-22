// ============================================================
// جرب حظك — شروط الاستخدام (توجيه App Store 1.2 — UGC / الامتثال)
// شاشة مخفية: تُفتح من الإعدادات.
// ============================================================

import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import * as Linking from 'expo-linking';
import Screen from '../../components/ui/Screen';
import GlassCard from '../../components/ui/GlassCard';
import GoldButton from '../../components/ui/GoldButton';
import {
  BackIcon,
  MicIcon,
  InfoIcon,
  CrownIcon,
  LockIcon,
  ClockIcon,
  UserIcon,
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

export default function TermsScreen() {
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
          <Text style={styles.title}>شروط الاستخدام</Text>
        </View>

        <Text style={styles.subtitle}>
          يرجى قراءة هذه الشروط بعناية قبل استخدام «جرب حظك»
        </Text>

        <Section icon={<InfoIcon size={20} color={COLORS.gold} />} title="طبيعة الخدمة">
          <Bullet>«جرب حظك» لعبة ترفيه اجتماعي تُلعب برقاقات افتراضية بالكامل.</Bullet>
          <Bullet>الرقاقات والدراهم داخل اللعبة ليس لها أي قيمة نقدية ولا يمكن استبدالها أو تحويلها.</Bullet>
          <Bullet>اللعبة مخصصة للترفيه فقط ولا تشكّل مقامرة بأموال حقيقية.</Bullet>
        </Section>

        <Section icon={<MicIcon size={20} color={COLORS.gold} />} title="المحتوى المنشأ من المستخدمين والدردشة الصوتية">
          <Bullet>يُمنع منعًا باتًا السباب أو التحرش أو التمييز أو أي إساءة في الدردشة الصوتية.</Bullet>
          <Bullet>المحتوى الذي ينشئه المستخدمون يخضع للإبلاغ والمراجعة والحجب.</Bullet>
          <Bullet>تتخذ الإدارة عقوبات الكتم أو الحظر بحق المخالفين.</Bullet>
        </Section>

        <Section icon={<UserIcon size={20} color={COLORS.gold} />} title="الحسابات">
          <Bullet>اسم المستخدم فريد ولا يمكن تكراره بين اللاعبين.</Bullet>
          <Bullet>تحتفظ الإدارة بحق كتم أو حظر المخالفين لهذه الشروط.</Bullet>
          <Bullet>يمكنك حذف حسابك في أي وقت من صفحة حسابك.</Bullet>
        </Section>

        <Section icon={<CrownIcon size={20} color={COLORS.gold} />} title="الملكية الفكرية">
          <Bullet>جميع عناصر اللعبة من تصاميم وشعارات ونصوص ملكٌ لنا ولا يجوز نسخها أو إعادة استخدامها.</Bullet>
          <Bullet>أنت تمنحنا ترخيصًا غير حصري لعرض المحتوى الذي تنشره داخل اللعبة.</Bullet>
        </Section>

        <Section icon={<LockIcon size={20} color={COLORS.gold} />} title="حدود المسؤولية">
          <Bullet>تُقدَّم الخدمة «كما هي» دون أي ضمانات صريحة أو ضمنية.</Bullet>
          <Bullet>لا نتحمل مسؤولية أي خسارة أو ضرر ناتج عن استخدام اللعبة.</Bullet>
        </Section>

        <Section icon={<ClockIcon size={20} color={COLORS.gold} />} title="التعديلات على الشروط">
          <Bullet>يجوز لنا تعديل هذه الشروط من وقت لآخر وسيتم إشعارك بالتغييرات الجوهرية.</Bullet>
          <Bullet>استمرارك في استخدام اللعبة بعد التعديل يُعد موافقة على الشروط المحدثة.</Bullet>
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
