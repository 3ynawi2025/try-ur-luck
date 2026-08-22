// ============================================================
// جرب حظك — البوكر الروسي (ضد الموزع)
// نفس نسق البلاك جاك — لا تغيير في الثيم.
// ============================================================

import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Avatar from '../../../components/ui/Avatar';
import Chip from '../../../components/ui/Chip';
import GoldButton from '../../../components/ui/GoldButton';
import PlayingCard, { Card as PCard } from '../../../components/game/PlayingCard';
import FeltTable from '../../../components/game/FeltTable';
import InstructionsModal from '../../../components/game/InstructionsModal';
import GameHeader from '../../../components/game/GameHeader';
import SoloTableBar from '../../../components/game/SoloTableBar';
import ActionButton from '../../../components/game/ActionButton';
import WinFX from '../../../components/game/WinFX';
import { useErrorToast } from '../../../hooks/useErrorToast';
import { RussianSnapshot, RussianCategory } from '../../../server/game/russianPoker';
import { Card } from '../../../server/game/deck';
import { useSoloGame } from '../../../hooks/useSoloGame';
import { useScale, scaleSize } from '../../../hooks/useScale';
import {
  COLORS,
  FONTS,
  TYPE,
  SPACING,
  RADIUS,
  SHADOWS,
  formatCompact,
} from '../../../constants/theme';

const HAND_NAMES: Record<number, string> = {
  [RussianCategory.HIGH_CARD]: 'ورقة عالية',
  [RussianCategory.ACE_KING]: 'A-K عالية',
  [RussianCategory.ONE_PAIR]: 'زوج',
  [RussianCategory.TWO_PAIR]: 'زوجان',
  [RussianCategory.THREE_OF_A_KIND]: 'ثلاث أوراق متشابهة',
  [RussianCategory.STRAIGHT]: 'ستريت',
  [RussianCategory.FLUSH]: 'فلاش',
  [RussianCategory.FULL_HOUSE]: 'فول هاوس',
  [RussianCategory.FOUR_OF_A_KIND]: 'أربع أوراق متشابهة',
  [RussianCategory.STRAIGHT_FLUSH]: 'ستريت فلاش',
  [RussianCategory.ROYAL_FLUSH]: 'رويال فلاش',
};

const OUTCOME_LABEL: Record<string, string> = {
  FOLDED: 'انسحبت — خسرت الرهان الأساسي',
  DEALER_NO_QUALIFY: 'الموزع لم يتأهل — ربحت الأساسي',
  PLAYER_WINS: 'ربحت!',
  DEALER_WINS: 'خسرت',
  TIE: 'تعادل — أُعيد رهاناك',
};

const FACE_DOWN: PCard = { rank: 'A', suit: 'spades' };
const cardKey = (c: Card) => `${c.rank}-${c.suit}`;

const toPCard = (c: Card): PCard => ({ rank: c.rank, suit: c.suit });

export default function RussianScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const sc = useScale();
  const [helpOpen, setHelpOpen] = useState(false);

  const [ante, setAnte] = useState(100);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { showError, errorNode } = useErrorToast();

  // ===== المحرك على السيرفر =====
  const { snapshot, sendAction, players, isMuted, toggleMute } = useSoloGame('russian', `ru-${id ?? '1'}`, showError);

  const EMPTY_SNAP: RussianSnapshot = {
    phase: 'BETTING',
    handId: 0,
    balance: 10000,
    wagers: { ante: 0, bet: 0, insurance: 0, feesPaid: 0 },
    playerCards: [],
    dealerCards: null,
    dealerUpCard: null,
    folded: false,
    hasExchanged: false,
    hasBoughtSixth: false,
    hasInsured: false,
    playerHand: null,
    dealerHand: null,
    dealerQualified: null,
    combinationPair: null,
    outcome: null,
    settlement: null,
  };
  const snap: RussianSnapshot = (snapshot as RussianSnapshot) ?? EMPTY_SNAP;

  const deal = () => {
    setSelected(new Set());
    sendAction('ante', { amount: ante });
  };

  const betOrFold = (betNow: boolean) => {
    sendAction(betNow ? 'bet2x' : 'fold');
  };

  const doExchange = () => {
    sendAction('exchange', { cardIds: [...selected] });
    setSelected(new Set());
  };

  const toggleCard = (key: string) => {
    if (snap.phase !== 'DEALT' || snap.hasExchanged) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else if (next.size < 5) next.add(key);
      return next;
    });
  };

  const newRound = () => {
    setSelected(new Set());
    sendAction('next');
  };

  const s = snap.settlement;
  const placed = snap.wagers.ante + snap.wagers.bet + snap.wagers.feesPaid;
  const net = s ? s.netChange - placed : 0;
  const canDecide = snap.phase === 'DEALT' || snap.phase === 'POST_ACTION';
  const isSettled = snap.phase === 'SETTLE' || snap.phase === 'COMPLETE';
  const revealDealerCards = snap.dealerCards !== null;

  // ===== لحظة الفوز السينمائية =====
  const ruWin =
    isSettled && s && (s.outcome === 'PLAYER_WINS' || s.outcome === 'DEALER_NO_QUALIFY')
      ? { key: `ru-${snap.handId}`, magnitude: (s.totalMultiple >= 10 ? 3 : 2) as 1 | 2 | 3 }
      : null;

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.bgSoft, COLORS.bg, COLORS.surfaceSunken]} style={StyleSheet.absoluteFill} />

      {/* لحظة الفوز */}
      <WinFX trigger={ruWin} />

      {/* ===== الترويسة الموحدة ===== */}
      <View style={{ paddingTop: insets.top + SPACING.xs }}>
        <GameHeader title="البوكر الروسي" onBack={() => router.back()} onInfo={() => setHelpOpen(true)} live muted={isMuted} onToggleMute={toggleMute} />
        <View style={{ paddingHorizontal: SPACING.lg, marginBottom: SPACING.xs }}>
          <SoloTableBar players={players} isMuted={isMuted} onToggleMute={toggleMute} />
        </View>
        <Text style={styles.phaseText}>
          {snap.phase === 'BETTING'
            ? 'ضع رهانك'
            : canDecide
            ? 'اربح بالتركيبة الثانية'
            : isSettled
            ? 'انتهت الجولة'
            : '…'}
        </Text>
      </View>

      {/* ===== منطقة الموزع ===== */}
      <FeltTable
        style={[styles.dealerFelt, { width: scaleSize(340, sc), height: scaleSize(200, sc) }]}
        radius={scaleSize(150, sc)}
        railWidth={scaleSize(11, sc)}
        watermark=""
      >
        <Text style={styles.dealerLabel}>الموزع</Text>
        <View style={styles.dealerCards}>
          {revealDealerCards
            ? snap.dealerCards!.map((c, i) => (
                <PlayingCard key={i} card={toPCard(c)} width={scaleSize(40, sc)} height={scaleSize(56, sc)} animate delay={i * 120} />
              ))
            : [0, 1, 2, 3, 4].map((i) =>
                i === 0 && snap.dealerUpCard ? (
                  <PlayingCard key="up" card={toPCard(snap.dealerUpCard)} width={scaleSize(40, sc)} height={scaleSize(56, sc)} />
                ) : (
                  <PlayingCard key={`back-${i}`} card={FACE_DOWN} faceDown width={scaleSize(40, sc)} height={scaleSize(56, sc)} />
                )
              )}
        </View>
        {snap.dealerQualified !== null && (
          <View style={styles.dealerQualifyTag}>
            <Text style={styles.dealerQualifyText}>
              {snap.dealerQualified ? 'تأهل' : 'لم يتأهل'}
            </Text>
          </View>
        )}
      </FeltTable>

      {/* ===== اللاعب ===== */}
      <ScrollView
        style={styles.players}
        contentContainerStyle={styles.playersContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.spot, styles.spotMe]}>
          <LinearGradient
            colors={['rgba(201,169,97,0.08)', 'rgba(201,169,97,0)']}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.spotTop}>
            <View style={styles.spotWho}>
              <Avatar name="أنت" size={scaleSize(36, sc)} showBorder isActive />
              <View style={styles.spotMeta}>
                <Text style={styles.spotName}>أنت</Text>
                <Text style={styles.spotBalance}>{formatCompact(snap.balance)}</Text>
              </View>
            </View>
            <View style={styles.spotStatus}>
              <Chip amount={snap.wagers.ante} size={scaleSize(30, sc)} />
              {snap.wagers.bet > 0 && <Chip amount={snap.wagers.bet} size={scaleSize(30, sc)} />}
            </View>
          </View>

          <View style={styles.spotCards}>
            <View style={styles.cardRow}>
              {(snap.playerCards ?? []).map((c, i) => (
                <Pressable
                  key={i}
                  onPress={() => toggleCard(cardKey(c))}
                  style={[
                    styles.pressCard,
                    { marginRight: i === 0 ? 0 : -10 },
                    selected.has(cardKey(c)) && styles.pressCardSelected,
                  ]}
                >
                  <PlayingCard card={toPCard(c)} width={scaleSize(52, sc)} height={scaleSize(74, sc)} animate delay={i * 110} />
                </Pressable>
              ))}
            </View>
            {!!snap.playerHand && (
              <View style={styles.handCol}>
                <Text style={styles.handName}>{HAND_NAMES[snap.playerHand.category]}</Text>
                {snap.combinationPair && snap.combinationPair.totalMultiple > 0 && (
                  <Text style={styles.comboText}>دفعة ×{snap.combinationPair.totalMultiple}</Text>
                )}
              </View>
            )}
          </View>

          {snap.phase === 'DEALT' && (
            <Text style={styles.hintText}>اضغط الأوراق التي تريد تبديلها (رسوم = قيمة الأساسي)</Text>
          )}
        </View>
      </ScrollView>

      {/* ===== رسالة الخطأ الموحدة ===== */}
      {errorNode}

      {/* ===== شريط الإجراءات ===== */}
      <View style={[styles.actionBar, { paddingBottom: insets.bottom + SPACING.md }]}>
        <LinearGradient
          colors={['rgba(10,13,18,0)', 'rgba(10,13,18,0.95)']}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        {/* مرحلة الرهان */}
        {snap.phase === 'BETTING' && (
          <View style={styles.betArea}>
            <View style={styles.betRow}>
              <ActionButton label="−١٠٠" colors={['#8A94A3', '#4A5568'] as const} onPress={() => setAnte((b) => Math.max(10, b - 100))} />
              <View style={styles.betAmountBox}>
                <Text style={styles.betLabel}>الرهان الأساسي</Text>
                <Text style={styles.betValue}>{ante}</Text>
              </View>
              <ActionButton label="+١٠٠" colors={['#8A94A3', '#4A5568'] as const} onPress={() => setAnte((b) => Math.min(Math.floor(snap.balance / 4), b + 100))} />
            </View>
            <GoldButton title="وزّع الأوراق" onPress={deal} />
          </View>
        )}

        {/* مرحلة القرار */}
        {canDecide && (
          <View style={styles.betArea}>
            <Text style={styles.turnLabel}>
              {snap.phase === 'DEALT' && !snap.hasExchanged
                ? 'بدّل أوراقك أو اراهن مباشرة — رهان اللعب = ضعف الأساسي'
                : 'يدك جاهزة — اراهن أو انسحب'}
            </Text>
            {selected.size > 0 && (
              <GoldButton title={`تبديل ${selected.size} أوراق (${ante})`} onPress={doExchange} />
            )}
            <View style={styles.actions}>
              <ActionButton label="انسحاب" colors={['#7A1F2B', '#5C0F16'] as const} onPress={() => betOrFold(false)} />
              <ActionButton
                label="رهان"
                sub={`×٢ = ${ante * 2}`}
                colors={['#E3C98A', '#8C6D2F'] as const}
                flex={1.2}
                darkText
                onPress={() => betOrFold(true)}
              />
            </View>
          </View>
        )}

        {/* النتيجة */}
        {isSettled && !!s && (
          <View style={styles.betArea}>
            <View style={styles.resultsRow}>
              <Text style={styles.resultText}>{OUTCOME_LABEL[s.outcome] ?? s.outcome}</Text>
              <Text style={[styles.resultAmount, net < 0 && styles.resultLoss]}>
                {net >= 0 ? '+' : ''}{formatCompact(net)}
              </Text>
              {s.totalMultiple > 0 && (
                <Text style={styles.resultBonus}>دفعة اليد: ×{s.totalMultiple}</Text>
              )}
              {s.secondCombinationMultiple > 0 && (
                <Text style={styles.resultBonus}>التركيبة الثانية: ×{s.secondCombinationMultiple}</Text>
              )}
            </View>
            <GoldButton title="جولة جديدة" onPress={newRound} />
          </View>
        )}
      </View>

      {/* ===== نافذة التعليمات ===== */}
      <InstructionsModal
        game="russian_poker"
        visible={helpOpen}
        onClose={() => setHelpOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#070A0F' },


  headerSide: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  headerCenter: {
    alignItems: 'center',
    flex: 1,
  },
  tableTitle: {
    fontFamily: FONTS.ar.bold,
    fontSize: TYPE.h3.fontSize,
    lineHeight: TYPE.h3.lineHeight,
    color: COLORS.goldLight,
  },
  phaseText: {
    fontFamily: FONTS.ar.regular,
    fontSize: TYPE.caption.fontSize,
    color: COLORS.textDim,
    marginTop: 1,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnLive: {
    backgroundColor: 'rgba(143,203,180,0.15)',
    borderColor: 'rgba(143,203,180,0.5)',
  },

  dealerFelt: {
    alignSelf: 'center',
    marginTop: SPACING.sm,
  },
  dealerLabel: {
    fontFamily: FONTS.ar.semibold,
    fontSize: TYPE.caption.fontSize,
    color: COLORS.textDim,
    position: 'absolute',
    top: 14,
    alignSelf: 'center',
  },
  dealerCards: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 38,
  },
  dealerQualifyTag: {
    marginTop: 12,
    paddingHorizontal: SPACING.md,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(201,169,97,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(201,169,97,0.4)',
  },
  dealerQualifyText: {
    fontFamily: FONTS.ar.semibold,
    fontSize: TYPE.caption.fontSize,
    color: COLORS.goldLight,
    includeFontPadding: false,
  },

  players: {
    flex: 1,
    marginTop: SPACING.md,
  },
  playersContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
  },
  spot: {
    borderRadius: RADIUS.lg,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    overflow: 'hidden',
    gap: SPACING.md,
  },
  spotMe: {
    borderColor: 'rgba(201,169,97,0.45)',
    backgroundColor: 'rgba(201,169,97,0.05)',
  },
  spotTop: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  spotWho: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  spotMeta: {
    alignItems: 'flex-end',
  },
  spotName: {
    fontFamily: FONTS.ar.bold,
    fontSize: TYPE.body.fontSize,
    color: COLORS.text,
  },
  spotBalance: {
    fontFamily: FONTS.num.semibold,
    fontSize: TYPE.caption.fontSize,
    color: COLORS.textDim,
  },
  spotStatus: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  spotCards: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.lg,
  },
  cardRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    flexWrap: 'wrap',
    rowGap: 6,
  },
  pressCard: {
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  pressCardSelected: {
    borderColor: COLORS.gold,
    backgroundColor: 'rgba(201,169,97,0.18)',
    transform: [{ translateY: -6 }],
  },
  handCol: {
    alignItems: 'flex-end',
    gap: 2,
  },
  handName: {
    fontFamily: FONTS.ar.semibold,
    fontSize: TYPE.small.fontSize,
    color: COLORS.goldLight,
  },
  comboText: {
    fontFamily: FONTS.num.semibold,
    fontSize: TYPE.caption.fontSize,
    color: '#9CC2FF',
  },
  hintText: {
    fontFamily: FONTS.ar.regular,
    fontSize: TYPE.caption.fontSize,
    color: COLORS.textFaint,
    textAlign: 'right',
  },

  actionBar: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
  },
  betArea: {
    gap: SPACING.md,
  },
  betRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: SPACING.md,
  },
  betAmountBox: {
    flex: 1.4,
    alignItems: 'center',
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: SPACING.xs,
  },
  betLabel: {
    fontFamily: FONTS.ar.regular,
    fontSize: TYPE.caption.fontSize,
    color: COLORS.textDim,
  },
  betValue: {
    fontFamily: FONTS.num.bold,
    fontSize: TYPE.h2.fontSize,
    color: COLORS.goldLight,
  },
  turnLabel: {
    fontFamily: FONTS.ar.regular,
    fontSize: TYPE.small.fontSize,
    color: COLORS.textDim,
    textAlign: 'right',
  },
  actions: {
    flexDirection: 'row-reverse',
    gap: SPACING.sm,
  },

  actionGloss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '55%',
  },
  actionLabel: {
    fontFamily: FONTS.ar.bold,
    fontSize: TYPE.body.fontSize,
    color: '#FFFFFF',
    includeFontPadding: false,
  },
  actionLabelDark: {
    color: '#3c2f00',
  },
  actionSub: {
    fontFamily: FONTS.num.semibold,
    fontSize: TYPE.caption.fontSize,
    color: 'rgba(255,255,255,0.75)',
    includeFontPadding: false,
  },
  resultsRow: {
    alignItems: 'center',
    gap: 4,
  },
  resultText: {
    fontFamily: FONTS.ar.semibold,
    fontSize: TYPE.body.fontSize,
    color: COLORS.text,
  },
  resultAmount: {
    fontFamily: FONTS.num.bold,
    fontSize: TYPE.h2.fontSize,
    color: COLORS.goldLight,
  },
  resultLoss: {
    color: '#ffdad6',
  },
  resultBonus: {
    fontFamily: FONTS.ar.regular,
    fontSize: TYPE.small.fontSize,
    color: '#9CC2FF',
  },


  toastText: {
    fontFamily: FONTS.ar.semibold,
    fontSize: TYPE.small.fontSize,
    color: '#FFFFFF',
  },
});
