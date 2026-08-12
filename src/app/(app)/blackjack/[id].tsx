// ============================================================
// جرب حظك — طاولة بلاك جاك (لعبة حقيقية ضد الموزع)
// نفس التصميم الأصلي + ربط بمحرك BlackjackEngine الحقيقي.
// ============================================================

import React, { useEffect, useRef, useState } from 'react';
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
import { BackIcon, MicIcon, MicOffIcon, InfoIcon } from '../../../components/icons/GameIcons';
import {
  BlackjackEngine,
  DEFAULT_BLACKJACK_CONFIG,
  BlackjackSnapshot,
  BlackjackHand,
} from '../../../server/game/blackjack';
import { Card } from '../../../server/game/deck';
import {
  COLORS,
  FONTS,
  TYPE,
  SPACING,
  RADIUS,
  SHADOWS,
  formatCompact,
} from '../../../constants/theme';

// ===== حالة اليد وألوانها =====
const STATUS_TONE: Record<string, { bg: string; bd: string; fg: string; label: string }> = {
  playing: { bg: 'rgba(212,175,55,0.16)', bd: 'rgba(212,175,55,0.45)', fg: COLORS.goldLight, label: 'دورك' },
  stood: { bg: 'rgba(31,191,117,0.14)', bd: 'rgba(31,191,117,0.4)', fg: '#5BE0A4', label: 'وقف' },
  bust: { bg: 'rgba(226,61,77,0.15)', bd: 'rgba(226,61,77,0.42)', fg: '#FF8A94', label: 'احترق' },
  blackjack: { bg: 'rgba(212,175,55,0.2)', bd: 'rgba(212,175,55,0.6)', fg: COLORS.goldLight, label: 'بلاك جاك' },
  charlie: { bg: 'rgba(31,191,117,0.18)', bd: 'rgba(31,191,117,0.5)', fg: '#5BE0A4', label: 'خمس أوراق' },
  surrendered: { bg: 'rgba(255,255,255,0.08)', bd: 'rgba(255,255,255,0.2)', fg: COLORS.textDim, label: 'استسلام' },
};

const RESULT_LABEL: Record<string, string> = {
  win: 'ربحت',
  lose: 'خسرت',
  push: 'تعادل — أُعيد رهانك',
  blackjack: 'بلاك جاك! ٣:٢',
  charlie: 'خمس أوراق — فوز فوري',
  surrender: 'استسلام — نصف الرهان',
};

function ActionButton({
  label,
  sub,
  colors,
  onPress,
  flex = 1,
  darkText = false,
}: {
  label: string;
  sub?: string;
  colors: readonly [string, string];
  onPress: () => void;
  flex?: number;
  /** نص داكن — للأزرار الذهبية الفاتحة */
  darkText?: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const to = (v: number) =>
    Animated.spring(scale, { toValue: v, useNativeDriver: true, speed: 50, bounciness: 6 }).start();

  return (
    <Animated.View style={{ flex, transform: [{ scale }] }}>
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
          onPress();
        }}
        onPressIn={() => to(0.95)}
        onPressOut={() => to(1)}
      >
        <LinearGradient
          colors={colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[styles.actionBtn, SHADOWS.e2]}
        >
          <LinearGradient
            colors={['rgba(255,255,255,0.26)', 'rgba(255,255,255,0)']}
            style={styles.actionGloss}
            pointerEvents="none"
          />
          <Text style={[styles.actionLabel, darkText && styles.actionLabelDark]}>{label}</Text>
          {!!sub && <Text style={[styles.actionSub, darkText && styles.actionLabelDark]}>{sub}</Text>}
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

function ScoreBubble({ score, tone }: { score: number | string; tone?: string }) {
  return (
    <View style={[styles.score, !!tone && { borderColor: tone }]}>
      <Text style={[styles.scoreText, !!tone && { color: tone }]}>{score}</Text>
    </View>
  );
}

const toPCard = (c: Card): PCard => ({ rank: c.rank, suit: c.suit });

export default function BlackjackScreen() {
  useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [voiceMuted, setVoiceMuted] = useState(true);
  const [helpOpen, setHelpOpen] = useState(false);

  // ===== المحرك الحقيقي (لاعب واحد ضد الموزع) =====
  const [engine] = useState(() => new BlackjackEngine({ ...DEFAULT_BLACKJACK_CONFIG }));
  const [snap, setSnap] = useState<BlackjackSnapshot>(() => engine.snapshot());
  const [bet, setBet] = useState(100);
  const [error, setError] = useState<string | null>(null);
  const errorAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    engine.addPlayer('me', 'أنت', 10000);
    setSnap(engine.snapshot());
  }, [engine]);

  useEffect(() => {
    if (!error) return;
    Animated.sequence([
      Animated.timing(errorAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.delay(1900),
      Animated.timing(errorAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(() => setError(null));
  }, [error, errorAnim]);

  const refresh = () => setSnap(engine.snapshot());

  const me = snap.players[0];
  const activeHand: BlackjackHand | undefined = me?.hands[me.activeHandIndex] ?? me?.hands[0];
  const dealerScore = snap.dealerScore?.total ?? 0;
  const myScore = activeHand ? engine.calculateScore(activeHand.cards).total : 0;

  // ===== الإجراءات =====
  const deal = () => {
    const e = engine.placeBet('me', bet);
    if (e) return setError(e);
    const r = engine.startRound();
    if ('error' in r) return setError(r.error);
    refresh();
  };

  const act = (action: 'hit' | 'stand' | 'double' | 'split' | 'surrender') => {
    const r = engine.performAction('me', action);
    if ('error' in r) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      return setError(r.error);
    }
    refresh();
  };

  const takeInsurance = (wants: boolean) => {
    if (wants) {
      const stake = Math.min(Math.floor(bet / 2), me?.balance ?? 0);
      const e = engine.takeInsurance('me', stake);
      if (e) return setError(e);
    } else {
      const e = engine.declineInsurance('me');
      if (e) return setError(e);
    }
    const r = engine.finishInsurance();
    if ('error' in r) return setError(r.error);
    refresh();
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

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0A1410', '#050908', '#020403']} style={StyleSheet.absoluteFill} />

      {/* ===== الترويسة ===== */}
      <View style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}>
        <Pressable style={styles.iconBtn} onPress={() => router.back()} hitSlop={8}>
          <BackIcon size={20} color={COLORS.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.tableTitle}>بلاك جاك</Text>
          <Text style={styles.phaseText}>
            {snap.phase === 'betting'
              ? 'ضع رهانك'
              : snap.phase === 'insurance'
              ? 'الموزع يُظهر آص — تأمين؟'
              : snap.phase === 'playing'
              ? 'الموزع يقف على ١٧'
              : 'انتهت الجولة'}
          </Text>
        </View>
        <View style={styles.headerSide}>
          <Pressable
            style={[styles.iconBtn, !voiceMuted && styles.iconBtnLive]}
            onPress={() => setVoiceMuted((v) => !v)}
            hitSlop={8}
          >
            {voiceMuted ? (
              <MicOffIcon size={20} color={COLORS.textDim} />
            ) : (
              <MicIcon size={20} color={COLORS.emerald} />
            )}
          </Pressable>

          <Pressable
            style={styles.iconBtn}
            onPress={() => setHelpOpen(true)}
            hitSlop={8}
            accessibilityLabel="تعليمات"
          >
            <InfoIcon size={20} color={COLORS.textDim} />
          </Pressable>
        </View>
      </View>

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
          <LinearGradient
            colors={['rgba(212,175,55,0.10)', 'rgba(212,175,55,0)']}
            style={StyleSheet.absoluteFill}
          />

          <View style={styles.spotTop}>
            <View style={styles.spotWho}>
              <Avatar name="أنت" size={36} showBorder isActive />
              <View style={styles.spotMeta}>
                <Text style={styles.spotName}>أنت</Text>
                <Text style={styles.spotBalance}>{formatCompact(me?.balance ?? 0)}</Text>
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

      {/* ===== رسالة الخطأ ===== */}
      {!!error && (
        <Animated.View
          style={[
            styles.toast,
            {
              top: insets.top + 62,
              opacity: errorAnim,
              transform: [{ translateY: errorAnim.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) }],
            },
          ]}
        >
          <Text style={styles.toastText}>{error}</Text>
        </Animated.View>
      )}

      {/* ===== شريط الإجراءات ===== */}
      <View style={[styles.actionBar, { paddingBottom: insets.bottom + SPACING.md }]}>
        <LinearGradient
          colors={['rgba(2,4,3,0)', 'rgba(2,4,3,0.95)']}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        {/* مرحلة الرهان */}
        {(snap.phase === 'betting' || snap.phase === 'complete') && (
          <View style={styles.betArea}>
            <View style={styles.betRow}>
              <ActionButton label="−١٠٠" colors={['#3A4650', '#20282E'] as const} onPress={() => setBet((b) => Math.max(10, b - 100))} />
              <View style={styles.betAmountBox}>
                <Text style={styles.betLabel}>رهانك</Text>
                <Text style={styles.betValue}>{bet}</Text>
              </View>
              <ActionButton label="+١٠٠" colors={['#3A4650', '#20282E'] as const} onPress={() => setBet((b) => Math.min(5000, (me?.balance ?? 0), b + 100))} />
            </View>
            <GoldButton title={snap.phase === 'complete' ? 'جولة جديدة' : 'ابدأ الجولة'} onPress={deal} />
          </View>
        )}

        {/* مرحلة التأمين */}
        {snap.phase === 'insurance' && (
          <View style={styles.betArea}>
            <Text style={styles.turnLabel}>
              الموزع يُظهر <Text style={styles.turnScore}>آص A</Text> — بلاك جاك الموزع يدفع ٣:٢.
              هل تريد تأمينًا على رهانك؟
            </Text>
            <View style={styles.actions}>
              <ActionButton label="تأمين" colors={['#F7E7A6', '#B8912C'] as const} darkText onPress={() => takeInsurance(true)} />
              <ActionButton label="بلا تأمين" colors={['#5AA0FF', '#1B4EA8'] as const} onPress={() => takeInsurance(false)} />
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
              <ActionButton label="سحب" colors={['#5AA0FF', '#1B4EA8'] as const} onPress={() => act('hit')} />
              <ActionButton label="وقوف" colors={['#2FD98A', '#0B7345'] as const} onPress={() => act('stand')} />
              {canDouble && (
                <ActionButton
                  label="مضاعفة"
                  colors={['#F7E7A6', '#B8912C'] as const}
                  flex={1.2}
                  darkText
                  onPress={() => act('double')}
                />
              )}
            </View>
            {(canSplit || canSurrender) && (
              <View style={styles.actions}>
                {canSplit && (
                  <ActionButton label="فصل" colors={['#9B6BF0', '#4B2E85'] as const} onPress={() => act('split')} />
                )}
                {canSurrender && (
                  <ActionButton label="استسلام" colors={['#F05262', '#8E1B29'] as const} onPress={() => act('surrender')} />
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

      {/* ===== نافذة التعليمات ===== */}
      <InstructionsModal
        game="blackjack"
        visible={helpOpen}
        onClose={() => setHelpOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020403' },

  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
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
    color: COLORS.text,
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
    backgroundColor: 'rgba(31,191,117,0.15)',
    borderColor: 'rgba(31,191,117,0.5)',
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
    borderColor: 'rgba(212,175,55,0.45)',
    backgroundColor: 'rgba(212,175,55,0.05)',
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
  tag: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
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
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  score: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreText: {
    fontFamily: FONTS.num.bold,
    fontSize: TYPE.h3.fontSize,
    color: COLORS.text,
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
  turnScore: {
    fontFamily: FONTS.num.bold,
    color: COLORS.goldLight,
  },
  actions: {
    flexDirection: 'row-reverse',
    gap: SPACING.sm,
  },
  actionBtn: {
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    gap: 2,
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
    color: '#3A2E10',
  },
  actionSub: {
    fontFamily: FONTS.num.semibold,
    fontSize: TYPE.caption.fontSize,
    color: 'rgba(255,255,255,0.75)',
    includeFontPadding: false,
  },
  resultsRow: {
    alignItems: 'center',
    paddingTop: SPACING.xs,
    gap: 4,
  },
  resultText: {
    fontFamily: FONTS.ar.semibold,
    fontSize: TYPE.body.fontSize,
    color: COLORS.text,
  },
  resultAmount: {
    fontFamily: FONTS.num.bold,
    color: COLORS.goldLight,
  },

  toast: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 50,
    backgroundColor: 'rgba(226,61,77,0.95)',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
  },
  toastText: {
    fontFamily: FONTS.ar.semibold,
    fontSize: TYPE.small.fontSize,
    color: '#FFFFFF',
  },
});
