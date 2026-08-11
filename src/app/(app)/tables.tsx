// ============================================================
// جرب حظك — Tables Screen
// ============================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import GlassCard from '../../components/ui/GlassCard';
import GoldButton from '../../components/ui/GoldButton';
import Chip from '../../components/ui/Chip';
import { COLORS, FONTS, FONT_SIZES, SPACING, RADIUS } from '../../constants/theme';

type GameFilter = 'all' | 'texas_holdem' | 'blackjack';

const MOCK_TABLES = [
  { id: '1', gameType: 'texas_holdem', name: 'طاولة الرياض', players: 2, maxPlayers: 6, minBuyIn: 500, smallBlind: 10, bigBlind: 20 },
  { id: '2', gameType: 'blackjack', name: 'طاولة الخليج', players: 3, maxPlayers: 5, minBuyIn: 1000 },
  { id: '3', gameType: 'texas_holdem', name: 'طاولة VIP', players: 5, maxPlayers: 6, minBuyIn: 5000, smallBlind: 200, bigBlind: 400 },
  { id: '4', gameType: 'texas_holdem', name: 'طاولة مبتدئين', players: 1, maxPlayers: 6, minBuyIn: 500, smallBlind: 10, bigBlind: 20 },
  { id: '5', gameType: 'blackjack', name: 'طاولة المحترفين', players: 4, maxPlayers: 5, minBuyIn: 2500 },
  { id: '6', gameType: 'texas_holdem', name: 'طاولة خاصة', players: 2, maxPlayers: 6, minBuyIn: 1500, smallBlind: 50, bigBlind: 100, isPrivate: true },
];

const FILTERS: { key: GameFilter; label: string }[] = [
  { key: 'all', label: 'الكل' },
  { key: 'texas_holdem', label: 'تكساس' },
  { key: 'blackjack', label: 'بلاك جاك' },
];

export default function TablesScreen() {
  const [filter, setFilter] = useState<GameFilter>('all');

  const filteredTables = filter === 'all'
    ? MOCK_TABLES
    : MOCK_TABLES.filter((t) => t.gameType === filter);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>الطاولات</Text>
      </View>

      {/* Filters */}
      <View style={styles.filters}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterButton, filter === f.key && styles.filterActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text
              style={[styles.filterText, filter === f.key && styles.filterTextActive]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tables */}
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {filteredTables.map((table) => (
          <TouchableOpacity
            key={table.id}
            onPress={() => router.push(`/(app)/table/${table.id}`)}
          >
            <GlassCard style={styles.tableCard}>
              <View style={styles.tableHeader}>
                <Text style={styles.tableGame}>
                  {table.gameType === 'texas_holdem' ? '🃏' : '🎰'}{' '}
                  {table.gameType === 'texas_holdem' ? 'تكساس هولدم' : 'بلاك جاك'}
                  {table.isPrivate && ' 🔒'}
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
                <Text style={styles.tableBuyIn}>
                  دخول: {table.minBuyIn.toLocaleString()} درهم
                </Text>
                {table.smallBlind && (
                  <Text style={styles.blinds}>
                    {table.smallBlind}/{table.bigBlind}
                  </Text>
                )}
              </View>
            </GlassCard>
          </TouchableOpacity>
        ))}

        <View style={{ height: SPACING.xl }} />
      </ScrollView>

      {/* Create Table Button */}
      <View style={styles.createContainer}>
        <GoldButton
          title="+ إنشاء طاولة خاصة"
          onPress={() => {/* TODO: open modal */}}
        />
      </View>
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
  filters: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.md,
  },
  filterButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.bgSurface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterText: {
    fontFamily: FONTS.arabic.regular,
    fontSize: FONT_SIZES.small,
    color: COLORS.textMuted,
  },
  filterTextActive: {
    color: COLORS.textDark,
  },
  scroll: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
  },
  tableCard: {
    marginBottom: SPACING.md,
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
  blinds: {
    fontFamily: FONTS.english.regular,
    fontSize: FONT_SIZES.small,
    color: COLORS.textMuted,
    marginLeft: 'auto',
  },
  createContainer: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.lg,
  },
});
