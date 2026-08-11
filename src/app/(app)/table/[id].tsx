// ============================================================
// جرب حظك — Playable Texas Hold'em Table
// ============================================================

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Avatar from '../../../components/ui/Avatar';
import Chip from '../../../components/ui/Chip';
import PlayingCard, { Card } from '../../../components/game/PlayingCard';
import { COLORS, FONTS, FONT_SIZES, SPACING, RADIUS, GRADIENTS } from '../../../constants/theme';
import { TexasHoldemEngine, GameSnapshot, TablePlayer } from '../../../server/game/texasHoldem';
import { Card as GameCard } from '../../../server/game/deck';

const { width, height } = Dimensions.get('window');

const SEAT_POSITIONS = [
  { top: '62%', left: '42%' },
  { top: '52%', left: '72%' },
  { top: '35%', left: '82%' },
  { top: '18%', left: '68%' },
  { top: '12%', left: '38%' },
  { top: '18%', left: '8%' },
  { top: '35%', left: '0%' },
  { top: '52%', left: '8%' },
];

export default function PlayableTableScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [engine] = useState(() => new TexasHoldemEngine({ maxPlayers: 6, smallBlind: 20, bigBlind: 40, minBuyIn: 500 }));
  const [snapshot, setSnapshot] = useState<GameSnapshot | null>(null);
  const [holeCards, setHoleCards] = useState<GameCard[]>([]);
  const [voiceMuted, setVoiceMuted] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // تهيئة اللعبة
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

      // Bot auto-play
      setTimeout(() => {
        autoPlayBots();
      }, 800);
    }
  }, [engine, snapshot]);

  const autoPlayBots = useCallback(() => {
    const snap = engine.snapshot();
    const currentPlayer = snap.players.find(p => p.isCurrentTurn);
    if (!currentPlayer || currentPlayer.id === 'me') return;

    // Bot logic: fold if weak, call if ok
    const action: 'fold' | 'check' | 'call' | 'raise' = Math.random() > 0.3 ? 'call' : 'fold';
    const result = engine.performAction(currentPlayer.id, action);
    if (!('error' in result)) {
      setSnapshot(result);
      setHoleCards(engine.getHoleCards('me'));

      // Continue auto-play if still bot's turn
      const newSnap = engine.snapshot();
      const nextPlayer = newSnap.players.find(p => p.isCurrentTurn);
      if (nextPlayer && nextPlayer.id !== 'me') {
        setTimeout(() => autoPlayBots(), 600);
      }
    }
  }, [engine]);

  const currentPlayer = snapshot?.players.find(p => p.isCurrentTurn);
  const isMyTurn = currentPlayer?.id === 'me';
  const showActions = isMyTurn && snapshot?.phase !== 'showdown';

  return (
    <View style={styles.container}>
      {/* Felt */}
      <View style={styles.felt}>
        {/* Table oval */}
        <View style={styles.tableOval}>
          <LinearGradient
            colors={GRADIENTS.table as readonly [string, string, ...string[]]}
            style={styles.tableGradient}
          >
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
              <Text style={styles.potAmount}>{snapshot?.pot?.toLocaleString() || '0'}</Text>
            </View>
          </LinearGradient>
        </View>

        {/* Player seats */}
        {snapshot?.players.map((player, idx) => {
          const pos = SEAT_POSITIONS[player.seatIndex % SEAT_POSITIONS.length];
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
                <Avatar
                  name={player.name}
                  size={36}
                  showBorder={player.isCurrentTurn}
                  isActive={player.isCurrentTurn}
                />
                <Text style={styles.playerName}>{isMe ? 'أنت' : player.name}</Text>
                <Chip amount={player.balance} size={26} />
                {isMe && holeCards.length > 0 && (
                  <View style={styles.holeCards}>
                    {holeCards.map((c, i) => (
                      <PlayingCard key={i} card={c} width={36} height={50} />
                    ))}
                  </View>
                )}
                {player.totalRoundBet > 0 && (
                  <Text style={styles.betAmount}>{player.totalRoundBet}</Text>
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
        <View style={styles.headerCenter}>
          <Text style={styles.tableName}>طاولة {id || 'الرياض'}</Text>
          <Text style={styles.phaseText}>
            {snapshot?.phase === 'preflop' && 'Pre-flop'}
            {snapshot?.phase === 'flop' && 'Flop'}
            {snapshot?.phase === 'turn' && 'Turn'}
            {snapshot?.phase === 'river' && 'River'}
            {snapshot?.phase === 'showdown' && '🎉 انتهت الجولة'}
          </Text>
        </View>
        <TouchableOpacity onPress={() => setVoiceMuted(!voiceMuted)}>
          <Text style={styles.voiceButton}>{voiceMuted ? '🔇' : '🎤'}</Text>
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

      {/* New hand button */}
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
  felt: { flex: 1, paddingTop: 80, paddingBottom: 10, paddingHorizontal: 10 },
  tableOval: {
    position: 'absolute', top: '18%', left: '8%', right: '8%', bottom: '38%',
    borderRadius: 200, overflow: 'hidden',
  },
  tableGradient: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: COLORS.primaryDark, borderRadius: 200,
  },
  communityCards: { flexDirection: 'row', gap: 4, marginBottom: 4 },
  emptyCard: {
    width: 44, height: 62, borderRadius: RADIUS.card,
    borderWidth: 1, borderColor: COLORS.border, borderStyle: 'dashed',
  },
  pot: { alignItems: 'center' },
  potLabel: { fontFamily: FONTS.arabic.regular, fontSize: FONT_SIZES.caption, color: COLORS.textMuted },
  potAmount: { fontFamily: FONTS.english.bold, fontSize: FONT_SIZES.h3, color: COLORS.primary },
  playerSeat: { position: 'absolute', transform: [{ translateX: -40 }, { translateY: -60 }] },
  activeSeat: { zIndex: 10 },
  seatContent: {
    alignItems: 'center', gap: 1,
    backgroundColor: COLORS.overlay, padding: 5, borderRadius: RADIUS.md, minWidth: 70,
  },
  folded: { opacity: 0.4 },
  playerName: { fontFamily: FONTS.arabic.regular, fontSize: 10, color: COLORS.textPrimary },
  holeCards: { flexDirection: 'row', gap: 1 },
  betAmount: { fontFamily: FONTS.english.bold, fontSize: 10, color: COLORS.primaryLight },
  header: {
    position: 'absolute', top: 45, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.md,
  },
  headerCenter: { alignItems: 'center' },
  backButton: { fontSize: 24 },
  tableName: { fontFamily: FONTS.arabic.bold, fontSize: FONT_SIZES.body, color: COLORS.textPrimary },
  phaseText: { fontFamily: FONTS.arabic.regular, fontSize: FONT_SIZES.caption, color: COLORS.primary },
  voiceButton: { fontSize: 24 },
  errorToast: {
    position: 'absolute', top: 100, left: 20, right: 20,
    backgroundColor: COLORS.danger, padding: SPACING.sm, borderRadius: RADIUS.sm, alignItems: 'center',
  },
  errorText: { color: COLORS.textPrimary, fontFamily: FONTS.arabic.regular, fontSize: FONT_SIZES.small },
  actionBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: COLORS.bgSurface, paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.lg, paddingTop: SPACING.md,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  actionButtons: { flexDirection: 'row', gap: SPACING.sm },
  actionBtn: { flex: 1, height: 48, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  foldBtn: { backgroundColor: COLORS.danger },
  callBtn: { backgroundColor: COLORS.info },
  raiseBtn: { backgroundColor: COLORS.primary },
  newHandBtn: { backgroundColor: COLORS.primary, height: 56, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  actionBtnText: { fontFamily: FONTS.english.bold, fontSize: FONT_SIZES.body, color: COLORS.textPrimary },
});
