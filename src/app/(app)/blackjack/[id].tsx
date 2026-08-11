// ============================================================
// جرب حظك — Blackjack Table Screen
// ============================================================

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Avatar from '../../../components/ui/Avatar';
import Chip from '../../../components/ui/Chip';
import PlayingCard, { Card as PCard } from '../../../components/game/PlayingCard';
import GlassCard from '../../../components/ui/GlassCard';
import GoldButton from '../../../components/ui/GoldButton';
import { COLORS, FONTS, FONT_SIZES, SPACING, RADIUS, GRADIENTS } from '../../../constants/theme';

const { width } = Dimensions.get('window');

// Mock data
const MOCK_PLAYERS = [
  { id: 'p1', name: 'أنت', balance: 8500, bet: 200, status: 'playing' as const, cards: [{ suit: 'hearts' as const, rank: 'A' as const }, { suit: 'clubs' as const, rank: '8' as const }], score: 19 },
  { id: 'p2', name: 'سلطان', balance: 12000, bet: 500, status: 'stood' as const, cards: [{ suit: 'spades' as const, rank: 'K' as const }, { suit: 'hearts' as const, rank: '9' as const }], score: 19 },
  { id: 'p3', name: 'نورة', balance: 6200, bet: 100, status: 'bust' as const, cards: [{ suit: 'diamonds' as const, rank: '10' as const }, { suit: 'spades' as const, rank: '5' as const }, { suit: 'clubs' as const, rank: 'J' as const }], score: 25 },
];

const MOCK_DEALER = {
  cards: [{ suit: 'spades' as const, rank: 'K' as const }, { suit: 'diamonds' as const, rank: '7' as const }] as PCard[],
  score: 17,
  revealed: true,
};

export default function BlackjackScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [voiceMuted, setVoiceMuted] = useState(true);

  return (
    <View style={styles.container}>
      {/* Felt background */}
      <View style={styles.felt}>
        {/* Dealer area */}
        <View style={styles.dealerArea}>
          <Text style={styles.dealerLabel}>الموزع</Text>
          <Text style={styles.dealerScore}>
            {MOCK_DEALER.revealed ? MOCK_DEALER.score : '؟'}
          </Text>
          <View style={styles.dealerCards}>
            {MOCK_DEALER.cards.map((card, i) => (
              <PlayingCard
                key={i}
                card={card}
                faceDown={!MOCK_DEALER.revealed && i === 1}
                width={52}
                height={73}
                animate
                delay={i * 150}
              />
            ))}
          </View>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Player areas */}
        <View style={styles.playersArea}>
          {MOCK_PLAYERS.map((player, pi) => (
            <View key={player.id} style={[styles.playerSpot, pi === 0 && styles.mySpot]}>
              <View style={styles.playerInfo}>
                <Avatar name={player.name} size={36} />
                <View style={styles.playerMeta}>
                  <Text style={styles.playerName}>{player.name}</Text>
                  <Text style={styles.playerBalance}>
                    {player.balance.toLocaleString()} 💰
                  </Text>
                </View>
                <View style={styles.betChip}>
                  <Chip amount={player.bet} size={32} />
                </View>
              </View>
              <View style={styles.playerCards}>
                {player.cards.map((card, i) => (
                  <PlayingCard
                    key={i}
                    card={card}
                    width={44}
                    height={62}
                    animate
                    delay={pi * 200 + i * 150}
                  />
                ))}
                {player.status === 'bust' && (
                  <Text style={styles.bustLabel}>BUST!</Text>
                )}
                {player.status === 'stood' && (
                  <Text style={styles.stoodLabel}>{player.score}</Text>
                )}
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>⬅️</Text>
        </TouchableOpacity>
        <Text style={styles.tableName}>طاولة بلاك جاك</Text>
        <TouchableOpacity onPress={() => setVoiceMuted(!voiceMuted)}>
          <Text style={styles.voiceButton}>{voiceMuted ? '🔇' : '🎤'}</Text>
        </TouchableOpacity>
      </View>

      {/* Action bar */}
      <View style={styles.actionBar}>
        <Text style={styles.turnLabel}>دورك — {MOCK_PLAYERS[0].score}</Text>
        <View style={styles.actionButtons}>
          <TouchableOpacity style={[styles.actionBtn, styles.hitBtn]}>
            <Text style={styles.actionBtnText}>Hit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.standBtn]}>
            <Text style={styles.actionBtnText}>Stand</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.doubleBtn]}>
            <Text style={styles.actionBtnText}>Double</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
  },
  felt: {
    flex: 1,
    paddingTop: 80,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  dealerArea: {
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  dealerLabel: {
    fontFamily: FONTS.arabic.bold,
    fontSize: FONT_SIZES.body,
    color: COLORS.textMuted,
  },
  dealerScore: {
    fontFamily: FONTS.english.bold,
    fontSize: FONT_SIZES.h3,
    color: COLORS.primary,
  },
  dealerCards: {
    flexDirection: 'row',
    gap: 4,
  },
  divider: {
    height: 2,
    backgroundColor: COLORS.border,
    marginVertical: 12,
  },
  playersArea: {
    gap: 12,
  },
  playerSpot: {
    backgroundColor: 'rgba(19, 46, 53, 0.7)',
    borderRadius: RADIUS.md,
    padding: 12,
    gap: 8,
  },
  mySpot: {
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  playerMeta: {
    flex: 1,
    gap: 2,
  },
  playerName: {
    fontFamily: FONTS.arabic.regular,
    fontSize: FONT_SIZES.small,
    color: COLORS.textPrimary,
  },
  playerBalance: {
    fontFamily: FONTS.english.semibold,
    fontSize: FONT_SIZES.caption,
    color: COLORS.textMuted,
  },
  betChip: {
    marginLeft: 'auto',
  },
  playerCards: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  bustLabel: {
    fontFamily: FONTS.english.bold,
    fontSize: FONT_SIZES.h3,
    color: COLORS.danger,
    marginLeft: 8,
  },
  stoodLabel: {
    fontFamily: FONTS.english.bold,
    fontSize: FONT_SIZES.h3,
    color: COLORS.success,
    marginLeft: 8,
  },
  header: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
  },
  backButton: { fontSize: 24 },
  tableName: {
    fontFamily: FONTS.arabic.bold,
    fontSize: FONT_SIZES.h3,
    color: COLORS.textPrimary,
  },
  voiceButton: { fontSize: 24 },
  actionBar: {
    backgroundColor: COLORS.bgSurface,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.lg,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: SPACING.sm,
  },
  turnLabel: {
    fontFamily: FONTS.arabic.regular,
    fontSize: FONT_SIZES.body,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  actionBtn: {
    flex: 1,
    height: 48,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hitBtn: { backgroundColor: COLORS.info },
  standBtn: { backgroundColor: COLORS.success },
  doubleBtn: { backgroundColor: COLORS.primary },
  actionBtnText: {
    fontFamily: FONTS.english.bold,
    fontSize: FONT_SIZES.body,
    color: COLORS.textPrimary,
  },
});
