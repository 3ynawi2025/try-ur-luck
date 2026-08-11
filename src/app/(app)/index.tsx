// ============================================================
// جرب حظك — Home Screen (Lobby)
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import GlassCard from '../../components/ui/GlassCard';
import GoldButton from '../../components/ui/GoldButton';
import Avatar from '../../components/ui/Avatar';
import Chip from '../../components/ui/Chip';
import { COLORS, FONTS, FONT_SIZES, SPACING, RADIUS, GRADIENTS } from '../../constants/theme';

const { width } = Dimensions.get('window');
const GAME_CARD_WIDTH = (width - SPACING.xl * 2 - SPACING.md) / 2;

// بيانات وهمية
const MOCK_TABLES = [
  { id: '1', gameType: 'texas_holdem', name: 'طاولة الرياض', players: 2, maxPlayers: 6, minBuyIn: 500, smallBlind: 10, bigBlind: 20 },
  { id: '2', gameType: 'blackjack', name: 'طاولة الخليج', players: 3, maxPlayers: 5, minBuyIn: 1000 },
  { id: '3', gameType: 'texas_holdem', name: 'طاولة VIP', players: 5, maxPlayers: 6, minBuyIn: 5000, smallBlind: 200, bigBlind: 400 },
];

const GAME_TYPES = [
  { key: 'texas_holdem', icon: '🃏', name: 'تكساس\nهولدم' },
  { key: 'blackjack', icon: '🎰', name: 'بلاك\nجاك' },
];

export default function HomeScreen() {
  const [balance] = useState(10250);
  const [user] = useState({ display_name: 'أحمد', username: '@ahmad' });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>أهلاً، {user.display_name} 👋</Text>
          <View style={styles.balanceRow}>
            <Text style={styles.balanceLabel}>رصيدك:</Text>
            <Text style={styles.balanceAmount}>{balance.toLocaleString()}</Text>
            <Text style={styles.balanceCurrency}>💰</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => router.push('/(app)/profile')}>
          <Avatar name={user.display_name} size={44} showBorder />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Game Selection */}
        <Text style={styles.sectionTitle}>اختر لعبتك</Text>
        <View style={styles.gameCards}>
          {GAME_TYPES.map((game) => (
            <TouchableOpacity
              key={game.key}
              style={styles.gameCard}
              onPress={() => router.push('/(app)/tables')}
            >
              <LinearGradient
                colors={[COLORS.bgSurface, COLORS.bgSurfaceLight]}
                style={styles.gameCardInner}
              >
                <Text style={styles.gameIcon}>{game.icon}</Text>
                <Text style={styles.gameName}>{game.name}</Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>

        {/* Available Tables */}
        <Text style={styles.sectionTitle}>الطاولات المتاحة</Text>
        <View style={styles.tablesList}>
          {MOCK_TABLES.map((table) => (
            <TouchableOpacity
              key={table.id}
              onPress={() => router.push(`/(app)/table/${table.id}`)}
            >
              <GlassCard style={styles.tableCard}>
                <View style={styles.tableHeader}>
                  <Text style={styles.tableGame}>
                    {table.gameType === 'texas_holdem' ? '🃏' : '🎰'}{' '}
                    {table.gameType === 'texas_holdem' ? 'تكساس هولدم' : 'بلاك جاك'}
                  </Text>
                  <View style={styles.playerCount}>
                    <Text style={styles.playerCountText}>
                      {table.players}/{table.maxPlayers}
                    </Text>
                  </View>
                </View>
                <Text style={styles.tableName}>{table.name}</Text>
                <View style={styles.tableFooter}>
                  <Chip amount={table.minBuyIn} size={32} />
                  <Text style={styles.tableBuyIn}>دخول: {table.minBuyIn.toLocaleString()} درهم</Text>
                </View>
              </GlassCard>
            </TouchableOpacity>
          ))}
        </View>

        {/* Weekly Tournament */}
        <GlassCard style={styles.tournamentCard}>
          <View style={styles.tournamentHeader}>
            <Text style={styles.tournamentTitle}>🏆 البطولة الأسبوعية</Text>
            <Text style={styles.tournamentTimer}>ينتهي خلال 3 أيام</Text>
          </View>
          <Text style={styles.tournamentPrize}>💰 الجائزة: 50,000 درهم</Text>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
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
    gap: 4,
  },
  balanceLabel: {
    fontFamily: FONTS.arabic.regular,
    fontSize: FONT_SIZES.small,
    color: COLORS.textMuted,
  },
  balanceAmount: {
    fontFamily: FONTS.english.bold,
    fontSize: FONT_SIZES.h3,
    color: COLORS.primary,
    direction: 'ltr',
  },
  balanceCurrency: {
    fontSize: 16,
  },
  scroll: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
  },
  sectionTitle: {
    fontFamily: FONTS.arabic.bold,
    fontSize: FONT_SIZES.h2,
    color: COLORS.textPrimary,
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
    textAlign: 'right',
  },
  gameCards: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  gameCard: {
    width: GAME_CARD_WIDTH,
    height: 120,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  gameCardInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
  },
  gameIcon: {
    fontSize: 36,
  },
  gameName: {
    fontFamily: FONTS.arabic.medium,
    fontSize: FONT_SIZES.small,
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
  tableGame: {
    fontFamily: FONTS.arabic.regular,
    fontSize: FONT_SIZES.body,
    color: COLORS.textPrimary,
  },
  playerCount: {
    backgroundColor: COLORS.bgSurfaceLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  playerCountText: {
    fontFamily: FONTS.english.semibold,
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
    gap: SPACING.sm,
  },
  tableBuyIn: {
    fontFamily: FONTS.arabic.regular,
    fontSize: FONT_SIZES.small,
    color: COLORS.textMuted,
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
    fontFamily: FONTS.arabic.regular,
    fontSize: FONT_SIZES.body,
    color: COLORS.primary,
  },
  tournamentButton: {
    alignSelf: 'stretch',
  },
});
