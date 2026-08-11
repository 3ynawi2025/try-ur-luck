// ============================================================
// جرب حظك — Table Screen (Texas Hold'em)
// ============================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Avatar from '../../../components/ui/Avatar';
import Chip from '../../../components/ui/Chip';
import PlayingCard, { Card } from '../../../components/game/PlayingCard';
import { COLORS, FONTS, FONT_SIZES, SPACING, RADIUS, GRADIENTS } from '../../../constants/theme';

const { width, height } = Dimensions.get('window');

// وضعيات المقاعد
const SEAT_POSITIONS = [
  { top: '60%', left: '50%' }, // seat 0 (bottom center)
  { top: '52%', left: '78%' }, // seat 1 (bottom right)
  { top: '38%', left: '85%' }, // seat 2 (mid right)
  { top: '22%', left: '72%' }, // seat 3 (top right)
  { top: '15%', left: '40%' }, // seat 4 (top center)
  { top: '22%', left: '10%' }, // seat 5 (top left)
  { top: '38%', left: '2%' },  // seat 6 (mid left)
  { top: '52%', left: '10%' }, // seat 7 (bottom left)
];

const MOCK_PLAYERS = [
  { id: '1', name: 'أنت', seat: 0, balance: 4500, status: 'active' as const, cards: [{ suit: 'hearts' as const, rank: 'A' as const }, { suit: 'spades' as const, rank: 'K' as const }] },
  { id: '2', name: 'سلطان', seat: 2, balance: 3200, status: 'active' as const },
  { id: '3', name: 'نورة', seat: 4, balance: 6800, status: 'active' as const },
  { id: '4', name: 'فهد', seat: 6, balance: 2100, status: 'folded' as const },
];

const MOCK_COMMUNITY: (Card | null)[] = [
  { suit: 'hearts', rank: '10' },
  { suit: 'diamonds', rank: 'J' },
  { suit: 'clubs', rank: '2' },
  { suit: 'spades', rank: '7' },
  null,
];

export default function TableScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [voiceMuted, setVoiceMuted] = useState(true);
  const [betAmount, setBetAmount] = useState(200);

  return (
    <View style={styles.container}>
      {/* Felt background */}
      <View style={styles.felt}>
        {/* Table oval */}
        <View style={styles.tableOval}>
          <LinearGradient
            colors={GRADIENTS.table as readonly [string, string, ...string[]]}
            style={styles.tableGradient}
          >
            {/* Community cards */}
            <View style={styles.communityCards}>
              {MOCK_COMMUNITY.map((card, i) => (
                <View key={i} style={styles.communityCardSlot}>
                  {card ? (
                    <PlayingCard card={card} width={48} height={67} />
                  ) : (
                    <View style={styles.emptyCard} />
                  )}
                </View>
              ))}
            </View>

            {/* Pot */}
            <View style={styles.pot}>
              <Text style={styles.potLabel}>الرهان</Text>
              <Text style={styles.potAmount}>2,400</Text>
            </View>
          </LinearGradient>
        </View>

        {/* Player seats */}
        {MOCK_PLAYERS.map((player) => {
          const pos = SEAT_POSITIONS[player.seat];
          const isMe = player.id === '1';

          return (
            <View
              key={player.id}
              style={[styles.playerSeat, { top: pos.top, left: pos.left } as any]}
            >
              <View style={[styles.seatContent, player.status === 'folded' && styles.folded]}>
                <Avatar
                  name={player.name}
                  size={40}
                  showBorder
                  isActive={isMe && player.status === 'active'}
                  showMuteBadge
                  isMuted={voiceMuted}
                />
                <Text style={styles.playerName}>{isMe ? 'أنت' : player.name}</Text>
                <Chip amount={player.balance} size={28} />
                {player.cards && isMe && (
                  <View style={styles.holeCards}>
                    {player.cards.map((c, i) => (
                      <PlayingCard key={i} card={c} width={40} height={56} />
                    ))}
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </View>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>⬅️</Text>
        </TouchableOpacity>
        <Text style={styles.tableName}>طاولة الرياض</Text>
        <TouchableOpacity onPress={() => setVoiceMuted(!voiceMuted)}>
          <Text style={styles.voiceButton}>{voiceMuted ? '🔇' : '🎤'}</Text>
        </TouchableOpacity>
      </View>

      {/* Action bar */}
      <View style={styles.actionBar}>
        <View style={styles.actionButtons}>
          <TouchableOpacity style={[styles.actionBtn, styles.foldBtn]}>
            <Text style={styles.actionBtnText}>Fold</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.checkBtn]}>
            <Text style={styles.actionBtnText}>Check</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.raiseBtn]}>
            <Text style={styles.actionBtnText}>Raise +{betAmount}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.betInfo}>
          <Text style={styles.betLabel}>الرهان: {betAmount}</Text>
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
    paddingTop: 70,
    paddingBottom: 20,
    paddingHorizontal: 10,
  },
  tableOval: {
    position: 'absolute',
    top: '20%',
    left: '10%',
    right: '10%',
    bottom: '35%',
    borderRadius: 200,
    overflow: 'hidden',
  },
  tableGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: COLORS.primaryDark,
    borderRadius: 200,
  },
  communityCards: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  communityCardSlot: {
    width: 48,
    height: 67,
  },
  emptyCard: {
    width: 48,
    height: 67,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  pot: {
    alignItems: 'center',
    gap: 2,
  },
  potLabel: {
    fontFamily: FONTS.arabic.regular,
    fontSize: FONT_SIZES.caption,
    color: COLORS.textMuted,
  },
  potAmount: {
    fontFamily: FONTS.english.bold,
    fontSize: FONT_SIZES.h3,
    color: COLORS.primary,
  },
  playerSeat: {
    position: 'absolute',
    transform: [{ translateX: -40 }, { translateY: -40 }],
  },
  seatContent: {
    alignItems: 'center',
    gap: 2,
    backgroundColor: COLORS.overlay,
    padding: 6,
    borderRadius: RADIUS.md,
    minWidth: 80,
  },
  folded: {
    opacity: 0.5,
  },
  playerName: {
    fontFamily: FONTS.arabic.regular,
    fontSize: FONT_SIZES.caption,
    color: COLORS.textPrimary,
  },
  holeCards: {
    flexDirection: 'row',
    gap: 2,
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
  backButton: {
    fontSize: 24,
  },
  tableName: {
    fontFamily: FONTS.arabic.bold,
    fontSize: FONT_SIZES.h3,
    color: COLORS.textPrimary,
  },
  voiceButton: {
    fontSize: 24,
  },
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.bgSurface,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.lg,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: SPACING.sm,
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
  foldBtn: {
    backgroundColor: COLORS.danger,
  },
  checkBtn: {
    backgroundColor: COLORS.info,
  },
  raiseBtn: {
    backgroundColor: COLORS.primary,
  },
  actionBtnText: {
    fontFamily: FONTS.english.bold,
    fontSize: FONT_SIZES.body,
    color: COLORS.textPrimary,
  },
  betInfo: {
    alignItems: 'center',
  },
  betLabel: {
    fontFamily: FONTS.arabic.regular,
    fontSize: FONT_SIZES.small,
    color: COLORS.textMuted,
  },
});
