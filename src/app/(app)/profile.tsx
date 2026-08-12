// ============================================================
// جرب حظك — الملف الشخصي
// ============================================================

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Screen from '../../components/ui/Screen';
import GlassCard from '../../components/ui/GlassCard';
import GoldButton from '../../components/ui/GoldButton';
import Avatar from '../../components/ui/Avatar';
import Chip from '../../components/ui/Chip';
import { Badge, StatTile, Divider } from '../../components/ui/Bits';
import {
  ClockIcon,
  EditIcon,
  SettingsIcon,
  LogoutIcon,
  ChevronIcon,
  CrownIcon,
} from '../../components/icons/GameIcons';
import {
  COLORS,
  FONTS,
  TYPE,
  SPACING,
  RADIUS,
  SIZES,
  SHADOWS,
  formatNumber,
} from '../../constants/theme';

const STATS = { games: 15, wins: 8, winRate: 53 };

const TRANSACTIONS = [
  { id: '1', type: 'win', amount: 500, description: 'فوز في طاولة الرياض', date: 'منذ ساعتين' },
  { id: '2', type: 'loss', amount: -200, description: 'خسارة في بلاك جاك', date: 'منذ ٥ ساعات' },
  { id: '3', type: 'refill', amount: 10000, description: 'التجديد الأسبوعي', date: 'الجمعة' },
  { id: '4', type: 'win', amount: 1200, description: 'فوز في طاولة VIP', date: 'الخميس' },
];

function MenuRow({
  icon,
  label,
  onPress,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={styles.menuRow}>
      <View style={styles.menuLeft}>
        {icon}
        <Text style={[styles.menuLabel, danger && styles.menuLabelDanger]}>{label}</Text>
      </View>
      <ChevronIcon size={18} color={COLORS.textFaint} />
    </Pressable>
  );
}

export default function ProfileScreen() {
  const [user] = useState({
    username: '@ahmad',
    displayName: 'أحمد',
    balance: 10250,
    nextRefill: 'الجمعة ١٢:٠٠ ظهراً',
    rank: 4,
  });

  return (
    <Screen>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ===== الهوية ===== */}
        <View style={[styles.hero, SHADOWS.e2]}>
          <LinearGradient
            colors={['rgba(212,175,55,0.16)', 'rgba(17,26,21,0.6)']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Avatar name={user.displayName} size={SIZES.avatarXl} showBorder />
          <Text style={styles.name}>{user.displayName}</Text>
          <Text style={styles.username}>{user.username}</Text>
          <Badge
            label={`المركز ${user.rank} هذا الأسبوع`}
            tone="gold"
            icon={<CrownIcon size={13} color={COLORS.goldLight} />}
          />
        </View>

        {/* ===== الرصيد ===== */}
        <GlassCard variant="gold" padding={SPACING.xl} style={styles.block}>
          <Text style={styles.blockLabel}>رصيدك الحالي</Text>
          <View style={styles.balanceRow}>
            <Chip amount={5000} size={44} stacked />
            <Text style={styles.balance}>{formatNumber(user.balance)}</Text>
          </View>
          <View style={styles.refillRow}>
            <ClockIcon size={14} color={COLORS.textDim} />
            <Text style={styles.refillText}>التجديد القادم: {user.nextRefill}</Text>
          </View>
        </GlassCard>

        {/* ===== الإحصائيات ===== */}
        <GlassCard padding={SPACING.xl} style={styles.block}>
          <Text style={styles.blockTitle}>إحصائياتي</Text>
          <View style={styles.statsRow}>
            <StatTile value={STATS.games} label="مباراة" />
            <View style={styles.vRule} />
            <StatTile value={STATS.wins} label="انتصار" tone={COLORS.goldLight} />
            <View style={styles.vRule} />
            <StatTile value={`${STATS.winRate}%`} label="نسبة الفوز" tone={COLORS.emerald} />
          </View>
        </GlassCard>

        {/* ===== العمليات ===== */}
        <GlassCard padding={SPACING.xl} style={styles.block}>
          <Text style={styles.blockTitle}>آخر العمليات</Text>
          {TRANSACTIONS.map((tx, i) => (
            <View key={tx.id}>
              {i > 0 && <Divider />}
              <View style={styles.tx}>
                <View style={styles.txInfo}>
                  <Text style={styles.txDesc}>{tx.description}</Text>
                  <Text style={styles.txDate}>{tx.date}</Text>
                </View>
                <Text
                  style={[
                    styles.txAmount,
                    tx.amount > 0 ? styles.txPositive : styles.txNegative,
                  ]}
                >
                  {tx.amount > 0 ? '+' : '−'}
                  {formatNumber(Math.abs(tx.amount))}
                </Text>
              </View>
            </View>
          ))}
        </GlassCard>

        {/* ===== القائمة ===== */}
        <GlassCard padding={SPACING.sm} style={styles.block}>
          <MenuRow
            icon={<EditIcon size={19} color={COLORS.textDim} />}
            label="تعديل الملف الشخصي"
            onPress={() => {}}
          />
          <Divider />
          <MenuRow
            icon={<SettingsIcon size={19} color={COLORS.textDim} />}
            label="الإعدادات"
            onPress={() => {}}
          />
        </GlassCard>

        <GoldButton
          title="تسجيل الخروج"
          variant="danger"
          icon={<LogoutIcon size={18} color="#FF8A94" />}
          onPress={() => router.replace('/(auth)')}
          style={styles.logout}
        />

        <Text style={styles.disclaimer}>
          الدراهم افتراضية بالكامل وليس لها أي قيمة نقدية
        </Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: SIZES.screenPadding,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xxxl,
  },

  hero: {
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.xxl,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.hairlineGold,
  },
  name: {
    fontFamily: FONTS.ar.bold,
    fontSize: TYPE.h1.fontSize,
    lineHeight: TYPE.h1.lineHeight,
    color: COLORS.text,
    marginTop: SPACING.sm,
  },
  username: {
    fontFamily: FONTS.num.medium,
    fontSize: TYPE.small.fontSize,
    color: COLORS.textDim,
    marginTop: -6,
    marginBottom: SPACING.sm,
  },

  block: {
    marginTop: SPACING.lg,
  },
  blockLabel: {
    fontFamily: FONTS.ar.medium,
    fontSize: TYPE.small.fontSize,
    color: COLORS.textDim,
    textAlign: 'right',
  },
  blockTitle: {
    fontFamily: FONTS.ar.bold,
    fontSize: TYPE.h3.fontSize,
    lineHeight: TYPE.h3.lineHeight,
    color: COLORS.text,
    textAlign: 'right',
    marginBottom: SPACING.lg,
  },

  balanceRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: SPACING.lg,
    marginTop: SPACING.sm,
  },
  balance: {
    fontFamily: FONTS.num.black,
    fontSize: 34,
    color: COLORS.goldLight,
    includeFontPadding: false,
  },
  refillRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    marginTop: SPACING.lg,
  },
  refillText: {
    fontFamily: FONTS.ar.regular,
    fontSize: TYPE.caption.fontSize,
    color: COLORS.textDim,
  },

  statsRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  vRule: {
    width: StyleSheet.hairlineWidth,
    height: 34,
    backgroundColor: COLORS.border,
  },

  tx: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    gap: SPACING.lg,
  },
  txInfo: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 1,
  },
  txDesc: {
    fontFamily: FONTS.ar.medium,
    fontSize: TYPE.small.fontSize,
    lineHeight: TYPE.small.lineHeight,
    color: COLORS.text,
  },
  txDate: {
    fontFamily: FONTS.ar.regular,
    fontSize: TYPE.caption.fontSize,
    color: COLORS.textFaint,
  },
  txAmount: {
    fontFamily: FONTS.num.bold,
    fontSize: TYPE.body.fontSize,
  },
  txPositive: { color: COLORS.emerald },
  txNegative: { color: COLORS.crimson },

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
  menuLabelDanger: {
    color: COLORS.crimson,
  },

  logout: {
    marginTop: SPACING.xl,
  },
  disclaimer: {
    fontFamily: FONTS.ar.regular,
    fontSize: TYPE.caption.fontSize,
    color: COLORS.textFaint,
    textAlign: 'center',
    marginTop: SPACING.xl,
  },
});
