// ============================================================
// جرب حظك — Leaderboard Screen
// ============================================================

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import GlassCard from '../../components/ui/GlassCard';
import Avatar from '../../components/ui/Avatar';
import { COLORS, FONTS, FONT_SIZES, SPACING, RADIUS } from '../../constants/theme';

const MOCK_LEADERBOARD = [
  { rank: 1, username: '@sultan', displayName: 'سلطان', wins: 24, games: 35 },
  { rank: 2, username: '@noora', displayName: 'نورة', wins: 21, games: 32 },
  { rank: 3, username: '@fahad', displayName: 'فهد', wins: 19, games: 30 },
  { rank: 4, username: '@ahmad', displayName: 'أحمد', wins: 15, games: 28, isMe: true },
  { rank: 5, username: '@lama', displayName: 'لمى', wins: 14, games: 26 },
  { rank: 6, username: '@khalid', displayName: 'خالد', wins: 12, games: 24 },
  { rank: 7, username: '@reem', displayName: 'ريم', wins: 11, games: 22 },
];

const RANK_MEDALS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

export default function LeaderboardScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🏆 البطولة الأسبوعية</Text>
        <Text style={styles.subtitle}>أفضل اللاعبين هذا الأسبوع</Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {MOCK_LEADERBOARD.map((player) => (
          <GlassCard
            key={player.rank}
            style={[styles.playerCard, player.isMe && styles.meCard] as any}
          >
            <View style={styles.rankContainer}>
              {RANK_MEDALS[player.rank] ? (
                <Text style={styles.medal}>{RANK_MEDALS[player.rank]}</Text>
              ) : (
                <Text style={styles.rankNumber}>{player.rank}</Text>
              )}
            </View>
            <Avatar name={player.displayName} size={44} showBorder={player.isMe} />
            <View style={styles.playerInfo}>
              <Text style={styles.playerName}>
                {player.displayName}
                {player.isMe && ' (أنت)'}
              </Text>
              <Text style={styles.playerUsername}>{player.username}</Text>
            </View>
            <View style={styles.stats}>
              <Text style={styles.statWins}>{player.wins} 🏆</Text>
              <Text style={styles.statGames}>{player.games} 🎮</Text>
              <Text style={styles.statRate}>
                {Math.round((player.wins / player.games) * 100)}%
              </Text>
            </View>
          </GlassCard>
        ))}

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
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  title: {
    fontFamily: FONTS.arabic.bold,
    fontSize: FONT_SIZES.h1,
    color: COLORS.textPrimary,
    textAlign: 'right',
  },
  subtitle: {
    fontFamily: FONTS.arabic.regular,
    fontSize: FONT_SIZES.body,
    color: COLORS.textMuted,
    textAlign: 'right',
  },
  scroll: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
  },
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  meCard: {
    borderColor: COLORS.primary,
    borderWidth: 1.5,
  },
  rankContainer: {
    width: 36,
    alignItems: 'center',
  },
  medal: {
    fontSize: 28,
  },
  rankNumber: {
    fontFamily: FONTS.english.bold,
    fontSize: FONT_SIZES.h3,
    color: COLORS.textMuted,
  },
  playerInfo: {
    flex: 1,
    gap: 2,
  },
  playerName: {
    fontFamily: FONTS.arabic.bold,
    fontSize: FONT_SIZES.body,
    color: COLORS.textPrimary,
  },
  playerUsername: {
    fontFamily: FONTS.arabic.regular,
    fontSize: FONT_SIZES.caption,
    color: COLORS.textMuted,
  },
  stats: {
    alignItems: 'flex-end',
    gap: 1,
  },
  statWins: {
    fontFamily: FONTS.arabic.bold,
    fontSize: FONT_SIZES.body,
    color: COLORS.primary,
  },
  statGames: {
    fontFamily: FONTS.arabic.regular,
    fontSize: FONT_SIZES.caption,
    color: COLORS.textMuted,
  },
  statRate: {
    fontFamily: FONTS.english.bold,
    fontSize: FONT_SIZES.small,
    color: COLORS.success,
  },
});
