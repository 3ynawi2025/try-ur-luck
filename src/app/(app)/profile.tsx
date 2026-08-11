// ============================================================
// جرب حظك — Profile Screen
// ============================================================

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import GlassCard from '../../components/ui/GlassCard';
import GoldButton from '../../components/ui/GoldButton';
import Avatar from '../../components/ui/Avatar';
import { COLORS, FONTS, FONT_SIZES, SPACING } from '../../constants/theme';

const MOCK_STATS = {
  games: 15,
  wins: 8,
  winRate: 53,
};

const MOCK_TRANSACTIONS = [
  { id: '1', type: 'win', amount: 500, description: 'فوز في طاولة الرياض', date: 'منذ ساعتين' },
  { id: '2', type: 'loss', amount: -200, description: 'خسارة في بلاك جاك', date: 'منذ 5 ساعات' },
  { id: '3', type: 'refill', amount: 10000, description: 'التجديد الأسبوعي', date: 'الجمعة' },
  { id: '4', type: 'win', amount: 1200, description: 'فوز في طاولة VIP', date: 'الخميس' },
];

export default function ProfileScreen() {
  const [user] = useState({
    username: '@ahmad',
    displayName: 'أحمد',
    balance: 10250,
    nextRefill: 'الجمعة 12:00 م',
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>ملفي الشخصي</Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Profile card */}
        <GlassCard style={styles.profileCard}>
          <Avatar name={user.displayName} size={80} showBorder />
          <Text style={styles.displayName}>{user.displayName}</Text>
          <Text style={styles.username}>{user.username}</Text>
        </GlassCard>

        {/* Balance */}
        <GlassCard style={styles.balanceCard}>
          <Text style={styles.balanceTitle}>الرصيد الحالي</Text>
          <Text style={styles.balanceAmount}>
            💰 {user.balance.toLocaleString()} درهم
          </Text>
          <Text style={styles.refillInfo}>
            التجديد: {user.nextRefill}
          </Text>
        </GlassCard>

        {/* Statistics */}
        <GlassCard style={styles.statsCard}>
          <Text style={styles.sectionTitle}>إحصائياتي</Text>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{MOCK_STATS.games}</Text>
              <Text style={styles.statLabel}>🎮 مباراة</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{MOCK_STATS.wins}</Text>
              <Text style={styles.statLabel}>🏆 انتصار</Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: COLORS.success }]}>
                {MOCK_STATS.winRate}%
              </Text>
              <Text style={styles.statLabel}>📈 نسبة فوز</Text>
            </View>
          </View>
        </GlassCard>

        {/* Transactions */}
        <GlassCard style={styles.transactionsCard}>
          <Text style={styles.sectionTitle}>آخر العمليات</Text>
          {MOCK_TRANSACTIONS.map((tx) => (
            <View key={tx.id} style={styles.transaction}>
              <View style={styles.txLeft}>
                <Text style={styles.txDescription}>{tx.description}</Text>
                <Text style={styles.txDate}>{tx.date}</Text>
              </View>
              <Text
                style={[
                  styles.txAmount,
                  tx.amount > 0 ? styles.txPositive : styles.txNegative,
                ]}
              >
                {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()}
              </Text>
            </View>
          ))}
        </GlassCard>

        {/* Actions */}
        <View style={styles.actions}>
          <GoldButton title="تعديل الملف" variant="outline" onPress={() => {}} />
          <GoldButton title="الإعدادات" variant="outline" onPress={() => {}} />
          <GoldButton
            title="تسجيل الخروج"
            variant="danger"
            onPress={() => router.replace('/(auth)')}
          />
        </View>

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
  },
  header: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  title: {
    fontFamily: FONTS.arabic.bold,
    fontSize: FONT_SIZES.h1,
    color: COLORS.textPrimary,
    textAlign: 'right',
  },
  scroll: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
  },
  profileCard: {
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  displayName: {
    fontFamily: FONTS.arabic.bold,
    fontSize: FONT_SIZES.h2,
    color: COLORS.textPrimary,
  },
  username: {
    fontFamily: FONTS.arabic.regular,
    fontSize: FONT_SIZES.body,
    color: COLORS.textMuted,
  },
  balanceCard: {
    marginBottom: SPACING.md,
    gap: 4,
  },
  balanceTitle: {
    fontFamily: FONTS.arabic.regular,
    fontSize: FONT_SIZES.small,
    color: COLORS.textMuted,
    textAlign: 'right',
  },
  balanceAmount: {
    fontFamily: FONTS.arabic.bold,
    fontSize: FONT_SIZES.h2,
    color: COLORS.primary,
    textAlign: 'right',
  },
  refillInfo: {
    fontFamily: FONTS.arabic.regular,
    fontSize: FONT_SIZES.caption,
    color: COLORS.textMuted,
    textAlign: 'right',
  },
  statsCard: {
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontFamily: FONTS.arabic.bold,
    fontSize: FONT_SIZES.body,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
    textAlign: 'right',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  stat: {
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontFamily: FONTS.english.bold,
    fontSize: FONT_SIZES.h2,
    color: COLORS.primary,
  },
  statLabel: {
    fontFamily: FONTS.arabic.regular,
    fontSize: FONT_SIZES.caption,
    color: COLORS.textMuted,
  },
  transactionsCard: {
    marginBottom: SPACING.md,
  },
  transaction: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  txLeft: {
    flex: 1,
    gap: 2,
  },
  txDescription: {
    fontFamily: FONTS.arabic.regular,
    fontSize: FONT_SIZES.small,
    color: COLORS.textPrimary,
  },
  txDate: {
    fontFamily: FONTS.arabic.light,
    fontSize: FONT_SIZES.caption,
    color: COLORS.textMuted,
  },
  txAmount: {
    fontFamily: FONTS.english.bold,
    fontSize: FONT_SIZES.body,
  },
  txPositive: {
    color: COLORS.success,
  },
  txNegative: {
    color: COLORS.danger,
  },
  actions: {
    gap: SPACING.md,
  },
});
