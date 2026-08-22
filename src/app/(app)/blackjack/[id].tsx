// ============================================================
// جرب حظك — طاولة بلاك جاك (Dark Luxe)
// لعبة حقيقية ضد الموزع عبر محرك BlackjackEngine على السيرفر.
// الشاشة مبنية على الغلاف المشترك SoloGameScreen.
// ============================================================

import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Avatar from '../../../components/ui/Avatar';
import Chip from '../../../components/ui/Chip';
import GoldButton from '../../../components/ui/GoldButton';
import PlayingCard, { Card as PCard } from '../../../components/game/PlayingCard';
import FeltTable from '../../../components/game/FeltTable';
import ActionButton from '../../../components/game/ActionButton';
import SoloGameScreen from '../../../components/game/SoloGameScreen';
import InstructionsModal from '../../../components/game/InstructionsModal';
import WinFX from '../../../components/game/WinFX';
import { useSoloGame } from '../../../hooks/useSoloGame';
import { useErrorToast } from '../../../hooks/useErrorToast';
import { useCountUp } from '../../../hooks/useCountUp';
import { BlackjackSnapshot, BlackjackHand } from '../../../server/game/blackjack';
import { Card, getRankValue } from '../../../server/game/deck';
import {
  COLORS,
  FONTS,
  TYPE,
  SPACING,
  RADIUS,
  formatCompact,
} from '../../../constants/theme';

// ===== حالة اليد وألوانها =====
const STATUS_TONE: Record<string, { bg: string; bd: string; fg: string; label: string }> = {
  playing: { bg: 'rgba(201,169,97,0.10)', bd: 'rgba(201,169,97,0.35)', fg: COLORS.goldLight, label: 'دورك' },
  stood: { bg: 'rgba(143,203,180,0.10)', bd: 'rgba(143,203,180,0.35)', fg: COLORS.emerald, label: 'وقف' },
  bust: { bg: 'rgba(232,169,160,0.10)', bd: 'rgba(232,169,160,0.35)', fg: COLORS.crimson, label: 'احترق' },
  blackjack: { bg: 'rgba(201,169,97,0.14)', bd: 'rgba(201,169,97,0.5)', fg: COLORS.goldLight, label: 'بلاك جاك' },
  charlie: { bg: 'rgba(143,203,180,0.12)', bd: 'rgba(143,203,180,0.4)', fg: COLORS.emerald, label: 'خمس أوراق' },
  surrendered: { bg: 'rgba(255,255,255,0.06)', bd: 'rgba(255,255,255,0.16)', fg: COLORS.textDim, label: 'استسلام' },
};

const toPCard = (c: Card): PCard => ({ rank: c.rank, suit: c.suit });

function handTotal(cards: Card[]): number {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    const v = getRankValue(c.rank);
    if (v === 14) {
      aces++;
      total += 11;
    } else if (v >= 10) {
      total += 10;
    } else {
      total += v;
    }
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return total;
}

function ScoreBubble({ score, tone }: { score: number | string; tone?: string }) {
  return (
    <View style={[styles.score, !!tone && { borderColor: tone }]}>
      <Text style={[styles.scoreText, !!tone && { color: tone }]}>{score}</Text>
    </View>
  );
}

export default function BlackjackScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [helpOpen, setHelpOpen] = useState(false);
  const [bet, setBet] = useState(100);

  const { showError, errorNode } = useErrorToast();
  const { snapshot, sendAction, players, isMuted, toggleMute } = useSoloGame('blackjack', `bj-${id ?? '1'}`, showError);

  const EMPTY_SNAP: BlackjackSnapshot = {
    phase: 'betting',
    players: [],
    dealerCards: [],
    dealerRevealed: false,
    dealerScore: null,
    deckRemaining: 0,
    reshufflePending: false,
    currentPlayerId: null,
    insuranceOffered: false,
    roundNumber: 0,
  };
  const snap: BlackjackSnapshot = (snapshot as BlackjackSnapshot) ?? EMPTY_SNAP;

  const me = snap.players[0];
  const activeHand: BlackjackHand | undefined = me?.hands[me.activeHandIndex] ?? me?.hands[0];
  const dealerScore = snap.dealerScore?.total ?? 0;
  const myScore = activeHand ? handTotal(activeHand.cards) : 0;

  // ===== الإجراءات =====
  const deal = () => sendAction('bet', { amount: bet });

  const act = (action: 'hit' | 'stand' | 'double' | 'split' | 'surrender') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    sendAction(action);
  };

  const takeInsurance = (wants: boolean) => {
    sendAction('insurance', {
      wants,
      amount: Math.floor((activeHand?.bet ?? bet) / 2),
      mainBet: activeHand?.bet ?? bet,
    });
  };

  const canDouble =
    snap.phase === 'playing' &&
    !!activeHand &&
    activeHand.cards.length === 2 &&
    !activeHand.isSplitAces &&
    (me?.balance ?? 0) >= activeHand.bet;

  const canSplit =
    snap.phase === 'playing' &&
    !!activeHand &&
    activeHand.cards.length === 2 &&
    activeHand.cards[0].rank === activeHand.cards[1].rank &&
    (me?.balance ?? 0) >= activeHand.bet;

  const canSurrender =
    snap.phase === 'playing' &&
    !!activeHand &&
    activeHand.cards.length === 2 &&
    !activeHand.doubled;

  const handCount = me?.hands.length ?? 1;

  // ===== لحظة الفوز السينمائية =====
  const bjWin = useMemo(() => {
    if (snap.phase !== 'complete' || !snap.results?.length) return null;
    const wins = snap.results.filter(
      (r) => r.result === 'win' || r.result === 'blackjack' || r.result === 'charlie'
    );
    if (wins.length === 0) return null;
    const isNatural = snap.results.some((r) => r.result === 'blackjack');
    return {
      key: `bj-${snap.roundNumber}`,
      magnitude: (isNatural ? 3 : 2) as 1 | 2 | 3,
    };
  }, [snap.phase, snap.roundNumber, snap.results]);

  // عدّاد رصيد متدحرج
  const balanceDisplay = useCountUp(Math.round(me?.balance ?? 0));

  const phaseText =
    snap.phase === 'betting'
      ? 'ضع رهانك'
      : snap.phase === 'insurance'
      ? 'الموزع يُظهر آص — تأمين؟'
      : snap.phase === 'playing'
      ? 'الموزع يقف على ١٧'
      : 'انتهت الجولة';

  // ===== شريط الإجراءات حسب المرحلة =====
  const footer = (
    <View style={styles.footerInner}>
      {/* مرحلة الرهان */}
      {(snap.phase === 'betting' || snap.phase === 'complete') && (
        <View style={styles.betArea}>
          <View style={styles.betRow}>
            <ActionButton label="−١٠٠" colors={['#8A94A3', '#4A5568'] as const} onPress={() => setBet((b) => Math.max(10, b - 100))} />
            <View style={styles.betAmountBox}>
              <Text style={styles.betLabel}>رهانك</Text>
              <Text style={styles.betValue}>{bet}</Text>
            </View>
            <ActionButton label="+١٠٠" colors={['#8A94A3', '#4A5568'] as const} onPress={() => setBet((b) => Math.min(5000, (me?.balance ?? 0), b + 100))} />
          </View>
          <GoldButton title={snap.phase === 'complete' ? 'جولة جديدة' : 'ابدأ الجولة'} onPress={deal} />
        </View>
      )}

      {/* مرحلة التأمين */}
      {snap.phase === 'insurance' && (
        <View style={styles.betArea}>
          <Text style={styles.turnLabel}>
            الموزع يُظهر <Text style={styles.turnScore}>آص A</Text> — هل تريد تأمينًا على رهانك؟
          </Text>
          <View style={styles.actions}>
            <ActionButton label="تأمين" colors={['#E3C98A', '#8C6D2F'] as const} darkText onPress={() => takeInsurance(true)} />
            <ActionButton label="بلا تأمين" colors={['#6E9DFF', '#2C4E9E'] as const} onPress={() => takeInsurance(false)} />
          </View>
        </View>
      )}

      {/* مرحلة اللعب */}
      {snap.phase === 'playing' && !!activeHand && (
        <View style={styles.betArea}>
          <Text style={styles.turnLabel}>
            دورك — مجموعك <Text style={styles.turnScore}>{myScore}</Text>
          </Text>
          <View style={styles.actions}>
            <ActionButton label="سحب" colors={['#6E9DFF', '#2C4E9E'] as const} onPress={() => act('hit')} />
            <ActionButton label="وقوف" colors={['#8FCBB4', '#0A3D2E'] as const} onPress={() => act('stand')} />
            {canDouble && (
              <ActionButton
                label="مضاعفة"
                colors={['#E3C98A', '#8C6D2F'] as const}
                flex={1.2}
                darkText
                onPress={() => act('double')}
              />
            )}
          </View>
          {(canSplit || canSurrender) && (
            <View style={styles.actions}>
              {canSplit && (
                <ActionButton label="فصل" colors={['#9A7BFF', '#4B3A8C'] as const} onPress={() => act('split')} />
              )}
              {canSurrender && (
                <ActionButton label="استسلام" colors={['#7A1F2B', '#5C0F16'] as const} onPress={() => act('surrender')} />
              )}
            </View>
          )}
        </View>
      )}

      {/* نتائج الجولة */}
      {snap.phase === 'complete' && !!snap.results?.length && (
        <View style={styles.resultsRow}>
          {snap.results.map((r, i) => (
            <Text key={i} style={styles.resultText}>
              {r.result === 'lose' ? 'خسرت ' : r.result === 'push' ? 'تعادل — ' : 'ربحت '}
              <Text style={styles.resultAmount}>{formatCompact(r.payout)}</Text>
              {r.result === 'blackjack' ? ' (٣:٢)' : r.result === 'charlie' ? ' (خمس أوراق)' : ''}
            </Text>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <SoloGameScreen
      title="بلاك جاك"
      onBack={() => router.back()}
      onInfo={() => setHelpOpen(true)}
      errorNode={errorNode}
      footer={footer}
      live
      muted={isMuted}
      onToggleMute={toggleMute}
      players={players}
    >
      {/* لحظة الفوز */}
      <WinFX trigger={bjWin} />

      <Text style={styles.phaseText}>{phaseText}</Text>

      {/* ===== منطقة الموزع ===== */}
      <FeltTable style={styles.dealerFelt} radius={150} railWidth={11} watermark="">
        <Text style={styles.dealerLabel}>الموزع</Text>
        <View style={styles.dealerCards}>
          {snap.dealerCards.map((c, i) => (
            <PlayingCard
              key={i}
              card={toPCard(c)}
              width={46}
              height={65}
              animate
              delay={i * 140}
            />
          ))}
        </View>
        {snap.dealerRevealed && <ScoreBubble score={dealerScore} />}
      </FeltTable>

      {/* ===== اللاعب ===== */}
      <ScrollView
        style={styles.players}
        contentContainerStyle={styles.playersContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.spot, styles.spotMe]}>
          <View style={styles.spotTop}>
            <View style={styles.spotWho}>
              <Avatar name="أنت" size={36} showBorder isActive />
              <View style={styles.spotMeta}>
                <Text style={styles.spotName}>أنت</Text>
                <Text style={styles.spotBalance}>{formatCompact(balanceDisplay)}</Text>
              </View>
            </View>

            <View style={styles.spotStatus}>
              {activeHand ? (
                <>
                  <View
                    style={[
                      styles.tag,
                      {
                        backgroundColor: STATUS_TONE[activeHand.status]?.bg ?? STATUS_TONE.playing.bg,
                        borderColor: STATUS_TONE[activeHand.status]?.bd ?? STATUS_TONE.playing.bd,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.tagText,
                        { color: STATUS_TONE[activeHand.status]?.fg ?? STATUS_TONE.playing.fg },
                      ]}
                    >
                      {handCount > 1 ? `يد ${me.activeHandIndex + 1}/${handCount} · ` : ''}
                      {STATUS_TONE[activeHand.status]?.label ?? 'دورك'}
                    </Text>
                  </View>
                  <Chip amount={activeHand.bet || bet} size={30} />
                </>
              ) : (
                <Chip amount={bet} size={30} />
              )}
            </View>
          </View>

          <View style={styles.spotCards}>
            <View style={styles.cardRow}>
              {(activeHand?.cards ?? []).map((c, i) => (
                <View key={i} style={{ marginRight: i === 0 ? 0 : -14 }}>
                  <PlayingCard
                    card={toPCard(c)}
                    width={44}
                    height={62}
                    animate
                    delay={i * 130}
                    dimmed={activeHand?.status === 'bust'}
                  />
                </View>
              ))}
            </View>
            {!!activeHand && (
              <ScoreBubble
                score={myScore}
                tone={activeHand.status === 'bust' ? COLORS.crimson : undefined}
              />
            )}
          </View>
        </View>
      </ScrollView>

      <InstructionsModal
        game="blackjack"
        visible={helpOpen}
        onClose={() => setHelpOpen(false)}
      />
    </SoloGameScreen>
  );
}

const styles = StyleSheet.create({
  phaseText: {
    fontFamily: FONTS.ar.regular,
    fontSize: TYPE.caption.fontSize,
    color: COLORS.textDim,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },

  dealerFelt: {
    alignSelf: 'center',
    width: 340,
    height: 200,
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
    gap: 8,
    marginTop: 38,
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
    borderColor: COLORS.hairlineGold,
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
    color: COLORS.goldLight,
  },
  spotStatus: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  tag: {
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
  },
  tagText: {
    fontFamily: FONTS.ar.semibold,
    fontSize: TYPE.caption.fontSize,
    includeFontPadding: false,
  },
  spotCards: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  score: {
    minWidth: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    borderColor: COLORS.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingHorizontal: SPACING.sm,
  },
  scoreText: {
    fontFamily: FONTS.num.bold,
    fontSize: TYPE.small.fontSize,
    color: COLORS.text,
    includeFontPadding: false,
  },

  // ===== شريط الإجراءات =====
  footerInner: {
    gap: SPACING.sm,
  },
  betArea: {
    gap: SPACING.sm,
  },
  betRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  betAmountBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.hairlineGold,
    backgroundColor: 'rgba(201,169,97,0.06)',
  },
  betLabel: {
    fontFamily: FONTS.ar.medium,
    fontSize: TYPE.caption.fontSize,
    color: COLORS.textDim,
  },
  betValue: {
    fontFamily: FONTS.num.bold,
    fontSize: TYPE.h3.fontSize,
    color: COLORS.goldLight,
    includeFontPadding: false,
  },
  turnLabel: {
    fontFamily: FONTS.ar.medium,
    fontSize: TYPE.small.fontSize,
    color: COLORS.textDim,
    textAlign: 'center',
  },
  turnScore: {
    fontFamily: FONTS.num.bold,
    color: COLORS.goldLight,
  },
  actions: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  resultsRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
    flexWrap: 'wrap',
  },
  resultText: {
    fontFamily: FONTS.ar.semibold,
    fontSize: TYPE.small.fontSize,
    color: COLORS.textDim,
  },
  resultAmount: {
    fontFamily: FONTS.num.bold,
    color: COLORS.goldLight,
  },
});
