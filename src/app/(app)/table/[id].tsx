// ============================================================
// جرب حظك — Playable Texas Hold'em Table v3 (Neon Cyberpunk)
// ============================================================

import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Avatar from '../../../components/ui/Avatar';
import Chip from '../../../components/ui/Chip';
import PlayingCard, { Card } from '../../../components/game/PlayingCard';
import { COLORS, FONTS, FONT_SIZES, SPACING, RADIUS, GRADIENTS, SHADOWS } from '../../../constants/theme';
import { TexasHoldemEngine, GameSnapshot } from '../../../server/game/texasHoldem';
import { Card as GameCard } from '../../../server/game/deck';

const { width, height } = Dimensions.get('window');

const SEATS = [
  { top: '78%', left: '50%' },
  { top: '64%', left: '84%' },
  { top: '30%', left: '88%' },
  { top: '6%', left: '70%' },
  { top: '6%', left: '30%' },
  { top: '30%', left: '12%' },
  { top: '64%', left: '16%' },
];

export default function PlayableTableScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [engine] = useState(() => new TexasHoldemEngine({ maxPlayers: 6, smallBlind: 20, bigBlind: 40, minBuyIn: 500 }));
  const [snapshot, setSnapshot] = useState<GameSnapshot | null>(null);
  const [holeCards, setHoleCards] = useState<GameCard[]>([]);
  const [voiceMuted, setVoiceMuted] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    engine.addPlayer('me', 'أنت', 5000);
    engine.addPlayer('bot1', 'سلطان', 5000);
    engine.addPlayer('bot2', 'نورة', 5000);
    engine.addPlayer('bot3', 'فهد', 5000);
    const result = engine.startHand();
    if (!('error' in result)) {
      setSnapshot(result);
      setHoleCards(engine.getHoleCards('me'));
    }
  }, []);

  const handleAction = useCallback((action: 'fold' | 'check' | 'call' | 'raise', amount?: number) => {
    const result = engine.performAction('me', action, amount);
    if ('error' in result) {
      setError(result.error);
    } else {
      setError(null);
      setSnapshot(result);
      setHoleCards(engine.getHoleCards('me'));
      setTimeout(() => autoPlayBots(), 700);
    }
  }, [engine]);

  const autoPlayBots = useCallback(() => {
    const snap = engine.snapshot();
    const currentPlayer = snap.players.find((p) => p.isCurrentTurn);
    if (!currentPlayer || currentPlayer.id === 'me') return;

    const action: 'fold' | 'check' | 'call' | 'raise' = Math.random() > 0.25 ? 'call' : 'fold';
    const result = engine.performAction(currentPlayer.id, action);
    if (!('error' in result)) {
      setSnapshot(result);
      setHoleCards(engine.getHoleCards('me'));
      const newSnap = engine.snapshot();
      const nextPlayer = newSnap.players.find((p) => p.isCurrentTurn);
      if (nextPlayer && nextPlayer.id !== 'me') setTimeout(() => autoPlayBots(), 500);
    }
  }, [engine]);

  const currentPlayer = snapshot?.players.find((p) => p.isCurrentTurn);
  const isMyTurn = currentPlayer?.id === 'me';
  const showActions = isMyTurn && snapshot?.phase !== 'showdown';

  return (
    <View style={styles.container}>
      {/* Background */}
      <LinearGradient
        colors={['#0F172A', '#1F1829', '#0F172A'] as const}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.bg}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <View style={styles.iconBtn}>
            <Text style={styles.headerIcon}>رجوع</Text>
          </View>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.tableName}>طاولة {id || 'الرياض'}</Text>
          <Text style={styles.phaseText}>
            {snapshot?.phase === 'preflop' && 'Pre-flop'}
            {snapshot?.phase === 'flop' && 'Flop'}
            {snapshot?.phase === 'turn' && 'Turn'}
            {snapshot?.phase === 'river' && 'River'}
            {snapshot?.phase === 'showdown' && 'Showdown'}
          </Text>
        </View>
        <TouchableOpacity onPress={() => setVoiceMuted(!voiceMuted)}>
          <View style={styles.iconBtn}>
            <Text style={styles.headerIcon}>{voiceMuted ? 'صامت' : 'صوت'}</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Table */}
      <View style={styles.tableArea}>
        <LinearGradient
          colors={['#1F1829', '#0F172A', '#0A0F1A'] as const}
          style={styles.tableOval}
        >
          <View style={styles.tableInnerBorder}>
            {/* Community cards */}
            <View style={styles.communityCards}>
              {(snapshot?.communityCards || []).map((card, i) => (
                <PlayingCard key={i} card={card} width={44} height={62} />
              ))}
              {Array.from({ length: 5 - (snapshot?.communityCards?.length || 0) }).map((_, i) => (
                <View key={`empty-${i}`} style={styles.emptyCard} />
              ))}
            </View>

            {/* Pot */}
            <View style={styles.pot}>
              <Text style={styles.potLabel}>الرهان</Text>
              <View style={styles.potRow}>
                <Chip amount={Math.min(snapshot?.pot || 0, 5000)} size={28} />
                <Text style={styles.potAmount}>{snapshot?.pot?.toLocaleString() || '0'}</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Seats */}
        {snapshot?.players.map((player) => {
          const pos = SEATS[player.seatIndex % SEATS.length];
          const isMe = player.id === 'me';
          return (
            <View
              key={player.id}
              style={[
                styles.playerSeat,
                { top: pos.top, left: pos.left } as any,
                player.isCurrentTurn && styles.activeSeat,
              ]}
            >
              <View style={[styles.seatContent, player.status === 'folded' && styles.folded]}>
                <Avatar name={player.name} size={42} showBorder={player.isCurrentTurn} isActive={player.isCurrentTurn} />
                <Text style={styles.playerName}>{isMe ? 'أنت' : player.name}</Text>
                <Text style={styles.playerBalance}>{player.balance.toLocaleString()}</Text>
                {isMe && holeCards.length > 0 && (
                  <View style={styles.holeCards}>
                    {holeCards.map((c, i) => (
                      <PlayingCard key={i} card={c} width={34} height={48} />
                    ))}
                  </View>
                )}
                {player.totalRoundBet > 0 && (
                  <View style={styles.playerBet}>
                    <Chip amount={Math.min(player.totalRoundBet, 5000)} size={24} />
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </View>

      {/* Error toast */}
      {error && (
        <View style={styles.errorToast}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Action bar */}
      {showActions && (
        <View style={styles.actionBar}>
          <View style={styles.actionButtons}>
            <TouchableOpacity style={[styles.actionBtn, styles.foldBtn]} onPress={() => handleAction('fold')}>
              <Text style={styles.actionBtnText}>Fold</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.callBtn]} onPress={() => handleAction('call')}>
              <Text style={styles.actionBtnText}>Call {snapshot?.currentBet || 0}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.raiseBtn]} onPress={() => handleAction('raise', (snapshot?.currentBet || 0) * 2)}>
              <Text style={styles.actionBtnText}>Raise</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {snapshot?.phase === 'showdown' && (
        <View style={styles.actionBar}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.newHandBtn]}
            onPress={() => {
              const r = engine.startHand();
              if (!('error' in r)) {
                setSnapshot(r);
                setHoleCards(engine.getHoleCards('me'));
                setError(null);
              }
            }}
          >
            <Text style={styles.actionBtnText}>جولة جديدة</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgPrimary },
  bg: { ...StyleSheet.absoluteFillObject },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingTop: 48,
    paddingBottom: SPACING.sm,
    backgroundColor: 'rgba(15,23,42,0.6)',
    zIndex: 20,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.bgSurface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIcon: { fontSize: 18 },
  headerCenter: { alignItems: 'center' },
  tableName: { fontFamily: FONTS.arabic.bold, fontSize: FONT_SIZES.h3, color: COLORS.textPrimary },
  phaseText: { fontFamily: FONTS.arabic.regular, fontSize: FONT_SIZES.caption, color: COLORS.primary },
  tableArea: {
    flex: 1,
    position: 'relative',
    marginTop: 90,
    marginBottom: 130,
    marginHorizontal: 12,
  },
  tableOval: {
    position: 'absolute',
    top: '14%',
    left: '4%',
    right: '4%',
    bottom: '22%',
    borderRadius: 220,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: 'rgba(220, 38, 38, 0.5)',
    ...SHADOWS.neon,
  },
  tableInnerBorder: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.15)',
    borderRadius: 216,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  communityCards: { flexDirection: 'row', gap: 6 },
  emptyCard: {
    width: 44,
    height: 62,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.2)',
    borderStyle: 'dashed',
  },
  pot: {
    alignItems: 'center',
    backgroundColor: 'rgba(15,23,42,0.7)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.3)',
  },
  potLabel: { fontFamily: FONTS.arabic.regular, fontSize: FONT_SIZES.caption, color: COLORS.textMuted },
  potRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  potAmount: { fontFamily: FONTS.english.bold, fontSize: FONT_SIZES.h2, color: COLORS.primary },
  playerSeat: {
    position: 'absolute',
    transform: [{ translateX: -42 }, { translateY: -55 }],
    zIndex: 5,
  },
  activeSeat: { zIndex: 10 },
  seatContent: {
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(15,23,42,0.85)',
    padding: 6,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    minWidth: 80,
  },
  folded: { opacity: 0.35 },
  playerName: { fontFamily: FONTS.arabic.bold, fontSize: 11, color: COLORS.textPrimary },
  playerBalance: { fontFamily: FONTS.english.bold, fontSize: 11, color: COLORS.primary },
  holeCards: { flexDirection: 'row', gap: 2, marginTop: 2 },
  playerBet: { position: 'absolute', top: -14, left: '50%', marginLeft: -12 },
  errorToast: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    backgroundColor: COLORS.danger,
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
  },
  errorText: { color: COLORS.textPrimary, fontFamily: FONTS.arabic.regular, fontSize: FONT_SIZES.small },
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(15,23,42,0.95)',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.lg,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  actionButtons: { flexDirection: 'row', gap: SPACING.sm },
  actionBtn: { flex: 1, height: 52, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  foldBtn: { backgroundColor: COLORS.danger },
  callBtn: { backgroundColor: COLORS.info },
  raiseBtn: { backgroundColor: COLORS.success },
  newHandBtn: { backgroundColor: COLORS.primary, height: 54 },
  actionBtnText: { fontFamily: FONTS.english.bold, fontSize: FONT_SIZES.body, color: COLORS.textPrimary },
});
