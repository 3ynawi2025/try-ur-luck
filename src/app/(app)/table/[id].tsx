// ============================================================
// جرب حظك — Playable Texas Hold'em Table v2 (Luxury Casino)
// ============================================================

import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Avatar from '../../../components/ui/Avatar';
import Chip from '../../../components/ui/Chip';
import PlayingCard, { Card } from '../../../components/game/PlayingCard';
import { COLORS, FONTS, FONT_SIZES, SPACING, RADIUS, GRADIENTS } from '../../../constants/theme';
import { TexasHoldemEngine, GameSnapshot } from '../../../server/game/texasHoldem';
import { Card as GameCard } from '../../../server/game/deck';

const { width, height } = Dimensions.get('window');

const SEATS = [
  { top: '74%', left: '44%' }, // user
  { top: '62%', left: '76%' },
  { top: '34%', left: '82%' },
  { top: '12%', left: '62%' },
  { top: '12%', left: '20%' },
  { top: '34%', left: '2%' },
  { top: '62%', left: '8%' },
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
      {/* Felt background */}
      <LinearGradient
        colors={['#0D3B10', '#1B5E20', '#0D3B10'] as const}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.felt}
      >
        {/* Table oval */}
        <LinearGradient
          colors={['#2E7D32', '#1B5E20', '#0D3B10'] as const}
          style={styles.tableOval}
        >
          <View style={styles.tableBorder}>
            {/* Community cards */}
            <View style={styles.communityCards}>
              {(snapshot?.communityCards || []).map((card, i) => (
                <PlayingCard key={i} card={card} width={46} height={64} />
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

        {/* Player seats */}
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
                      <PlayingCard key={i} card={c} width={38} height={53} />
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
      </LinearGradient>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.headerIcon}>⬅️</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.tableName}>طاولة {id || 'الرياض'}</Text>
          <Text style={styles.phaseText}>
            {snapshot?.phase === 'preflop' && 'Pre-flop'}
            {snapshot?.phase === 'flop' && 'Flop'}
            {snapshot?.phase === 'turn' && 'Turn'}
            {snapshot?.phase === 'river' && 'River'}
            {snapshot?.phase === 'showdown' && '🎉 Showdown'}
          </Text>
        </View>
        <TouchableOpacity onPress={() => setVoiceMuted(!voiceMuted)}>
          <Text style={styles.headerIcon}>{voiceMuted ? '🔇' : '🎤'}</Text>
        </TouchableOpacity>
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
            <Text style={styles.actionBtnText}>🔄 جولة جديدة</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgPrimary },
  felt: {
    flex: 1,
    paddingTop: 90,
    paddingBottom: 120,
    paddingHorizontal: 10,
  },
  tableOval: {
    position: 'absolute',
    top: '18%',
    left: '6%',
    right: '6%',
    bottom: '34%',
    borderRadius: 220,
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: 'rgba(212,175,55,0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
  tableBorder: {
    flex: 1,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 216,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  communityCards: { flexDirection: 'row', gap: 6 },
  emptyCard: {
    width: 46,
    height: 64,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderStyle: 'dashed',
  },
  pot: { alignItems: 'center', gap: 2 },
  potLabel: { fontFamily: FONTS.arabic.regular, fontSize: FONT_SIZES.caption, color: 'rgba(255,255,255,0.7)' },
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
    backgroundColor: 'rgba(10,15,20,0.75)',
    padding: 6,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    minWidth: 80,
  },
  folded: { opacity: 0.35 },
  playerName: { fontFamily: FONTS.arabic.bold, fontSize: 11, color: COLORS.textPrimary },
  playerBalance: { fontFamily: FONTS.english.bold, fontSize: 11, color: COLORS.primary },
  holeCards: { flexDirection: 'row', gap: 2, marginTop: 2 },
  playerBet: { position: 'absolute', top: -14, left: '50%', marginLeft: -12 },
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
    backgroundColor: 'rgba(10,15,20,0.6)',
  },
  headerCenter: { alignItems: 'center' },
  headerIcon: { fontSize: 24 },
  tableName: { fontFamily: FONTS.arabic.bold, fontSize: FONT_SIZES.h3, color: COLORS.textPrimary },
  phaseText: { fontFamily: FONTS.arabic.regular, fontSize: FONT_SIZES.caption, color: COLORS.primary },
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
    backgroundColor: 'rgba(10,15,20,0.92)',
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
  raiseBtn: { backgroundColor: COLORS.primary },
  newHandBtn: { backgroundColor: COLORS.primary, height: 54 },
  actionBtnText: { fontFamily: FONTS.english.bold, fontSize: FONT_SIZES.body, color: COLORS.textPrimary },
});
