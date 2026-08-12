// ============================================================
// جرب حظك — Home Screen v2 (Luxury Lobby)
// ============================================================

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import GlassCard from '../../components/ui/GlassCard';
import GoldButton from '../../components/ui/GoldButton';
import Avatar from '../../components/ui/Avatar';
import Chip from '../../components/ui/Chip';
import { TexasIcon, BlackjackIcon } from '../../components/icons/GameIcons';
import { COLORS, FONTS, FONT_SIZES, SPACING, RADIUS } from '../../constants/theme';

const { width } = Dimensions.get('window');
const GAME_CARD_WIDTH = (width - SPACING.xl * 2 - SPACING.md) / 2;

const MOCK_TABLES = [
  { id: '1', gameType: 'texas_holdem', name: 'طاولة الرياض', players: 2, maxPlayers: 6, minBuyIn: 500 },
  { id: '2', gameType: 'blackjack', name: 'طاولة الخليج', players: 3, maxPlayers: 5, minBuyIn: 1000 },
  { id: '3', gameType: 'texas_holdem', name: 'طاولة VIP', players: 5, maxPlayers: 6, minBuyIn: 5000 },
];

const GAME_TYPES = [
  { key: 'texas_holdem', Icon: TexasIcon, name: 'تكساس\nهولدم' },
  { key: 'blackjack', Icon: BlackjackIcon, name: 'بلاك\nجاك' },
];

export default function HomeScreen() {
  const [balance] = useState(10250);
  const [user] = useState({ display_name: 'أحمد', username: '@ahmad' });

  return (
    <View style={styles.container}>
      {/* Header */}
      <GlassCard style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>أهلاً، {user.display_name}</Text>
          <View style={styles.balanceRow}>
            <Text style={styles.balanceLabel}>رصيدك</Text>
            <Text style={styles.balanceAmount}>{balance.toLocaleString()}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => router.push('/(app)/profile')}>
          <Avatar name={user.display_name} size={48} showBorder />
        </TouchableOpacity>
      </GlassCard>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Game Selection */}
        <View style={styles.sectionHeader}>
          <View style={styles.goldLine} />
          <Text style={styles.sectionTitle}>اختر لعبتك</Text>
        </View>
        <View style={styles.gameCards}>
          {GAME_TYPES.map((game) => (
            <TouchableOpacity
              key={game.key}
              style={styles.gameCard}
              onPress={() => router.push('/(app)/tables')}
            >
              <LinearGradient
                colors={['rgba(0,212,255,0.35)', 'rgba(26,10,46,0.95)', 'rgba(10,10,26,0.95)']}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={styles.gameCardGradient}
              >
                <View style={styles.gameCardBorder}>
                  <game.Icon size={44} color={COLORS.primary} />
                  <Text style={styles.gameName}>{game.name}</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>

        {/* Available Tables */}
        <View style={styles.sectionHeader}>
          <View style={styles.goldLine} />
          <Text style={styles.sectionTitle}>الطاولات المتاحة</Text>
        </View>
        <View style={styles.tablesList}>
          {MOCK_TABLES.map((table) => (
            <TouchableOpacity
              key={table.id}
              onPress={() => router.push(`/(app)/table/${table.id}`)}
            >
              <GlassCard glow style={styles.tableCard}>
                <View style={styles.tableHeader}>
                  <View style={styles.tableGameBadge}>
                    <Text style={styles.tableGameText}>
                      {table.gameType === 'texas_holdem' ? 'تكساس هولدم' : 'بلاك جاك'}
                    </Text>
                  </View>
                  <View style={styles.playerCount}>
                    <Text style={styles.playerCountText}>
                      {table.players}/{table.maxPlayers}
                    </Text>
                  </View>
                </View>
                <Text style={styles.tableName}>{table.name}</Text>
                <View style={styles.tableFooter}>
                  <Chip amount={table.minBuyIn} size={34} />
                  <View style={styles.buyInCol}>
                    <Text style={styles.buyInLabel}>الحد الأدنى للدخول</Text>
                    <Text style={styles.buyInAmount}>{table.minBuyIn.toLocaleString()} درهم</Text>
                  </View>
                </View>
              </GlassCard>
            </TouchableOpacity>
          ))}
        </View>

        {/* Weekly Tournament */}
        <GlassCard glow style={styles.tournamentCard}>
          <View style={styles.tournamentHeader}>
            <Text style={styles.tournamentTitle}>البطولة الأسبوعية</Text>
            <Text style={styles.tournamentTimer}>تنتهي خلال 3 أيام</Text>
          </View>
          <Text style={styles.tournamentPrize}>الجائزة: 50,000 درهم</Text>
          <GoldButton
            title="انضم الآن"
            onPress={() => router.push('/(app)/leaderboard')}
            style={styles.tournamentButton}
          />
        </GlassCard>

        <View style={{ height: SPACING.xl }} />
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
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
  },
  headerLeft: {
    gap: 2,
  },
  greeting: {
    fontFamily: FONTS.arabic.regular,
    fontSize: FONT_SIZES.h3,
    color: COLORS.textPrimary,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  balanceLabel: {
    fontFamily: FONTS.arabic.regular,
    fontSize: FONT_SIZES.small,
    color: COLORS.textMuted,
  },
  balanceAmount: {
    fontFamily: FONTS.english.bold,
    fontSize: FONT_SIZES.h2,
    color: COLORS.primary,
  },
  scroll: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
    marginTop: SPACING.lg,
  },
  goldLine: {
    width: 4,
    height: 24,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
  },
  sectionTitle: {
    fontFamily: FONTS.arabic.bold,
    fontSize: FONT_SIZES.h2,
    color: COLORS.textPrimary,
    textAlign: 'right',
  },
  gameCards: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  gameCard: {
    width: GAME_CARD_WIDTH,
    height: 130,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  gameCardGradient: {
    flex: 1,
    padding: 2,
  },
  gameCardBorder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,212,255,0.15)',
    borderRadius: RADIUS.md - 2,
  },
  gameName: {
    fontFamily: FONTS.arabic.bold,
    fontSize: FONT_SIZES.body,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  tablesList: {
    gap: SPACING.md,
  },
  tableCard: {
    gap: SPACING.sm,
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tableGameBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tableGameText: {
    fontFamily: FONTS.arabic.regular,
    fontSize: FONT_SIZES.small,
    color: COLORS.textMuted,
  },
  playerCount: {
    backgroundColor: 'rgba(0,212,255,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  playerCountText: {
    fontFamily: FONTS.english.bold,
    fontSize: FONT_SIZES.caption,
    color: COLORS.primary,
  },
  tableName: {
    fontFamily: FONTS.arabic.bold,
    fontSize: FONT_SIZES.h3,
    color: COLORS.textPrimary,
  },
  tableFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginTop: SPACING.xs,
  },
  buyInCol: {
    gap: 2,
  },
  buyInLabel: {
    fontFamily: FONTS.arabic.regular,
    fontSize: FONT_SIZES.caption,
    color: COLORS.textMuted,
  },
  buyInAmount: {
    fontFamily: FONTS.english.bold,
    fontSize: FONT_SIZES.body,
    color: COLORS.primary,
  },
  tournamentCard: {
    marginTop: SPACING.lg,
    gap: SPACING.md,
  },
  tournamentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tournamentTitle: {
    fontFamily: FONTS.arabic.bold,
    fontSize: FONT_SIZES.h3,
    color: COLORS.textPrimary,
  },
  tournamentTimer: {
    fontFamily: FONTS.arabic.regular,
    fontSize: FONT_SIZES.caption,
    color: COLORS.textMuted,
  },
  tournamentPrize: {
    fontFamily: FONTS.english.bold,
    fontSize: FONT_SIZES.body,
    color: COLORS.primary,
  },
  tournamentButton: {
    alignSelf: 'stretch',
  },
});
