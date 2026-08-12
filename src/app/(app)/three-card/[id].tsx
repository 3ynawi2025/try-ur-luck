// ============================================================
// جرب حظك — ثلاث أوراق بوكر (ضد الموزع)
// نفس نسق البلاك جاك — لا تغيير في الثيم.
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
import { ThreeCardPokerEngine, ThreeCardSnapshot, ThreeCardCategory } from '../../../server/game/threeCardPoker';
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

const HAND_NAMES: Record<number, string> = {
  [ThreeCardCategory.HIGH_CARD]: 'ورقة عالية',
  [ThreeCardCategory.PAIR]: 'زوج',
  [ThreeCardCategory.FLUSH]: 'فلاش',
  [ThreeCardCategory.STRAIGHT]: 'ستريت',
  [ThreeCardCategory.THREE_OF_A_KIND]: 'ثلاث أوراق متشابهة',
  [ThreeCardCategory.STRAIGHT_FLUSH]: 'ستريت فلاش',
};

const OUTCOME_LABEL: Record<string, string> = {
  FOLDED: 'انسحبت — خسرت الرهان الأساسي',
  DEALER_NOT_QUALIFIED: 'الموزع لم يتأهل — ربحت الأساسي',
  PLAYER_WINS: 'ربحت!',
  DEALER_WINS: 'خسرت',
  PUSH: 'تعادل — أُعيد رهاناك',
};

const FACE_DOWN: PCard = { rank: 'A', suit: 'spades' };

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

const toPCard = (c: Card): PCard => ({ rank: c.rank, suit: c.suit });

export default function ThreeCardScreen() {
  useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [voiceMuted, setVoiceMuted] = useState(true);
  const [helpOpen, setHelpOpen] = useState(false);

  const [engine] = useState(() => new ThreeCardPokerEngine(10000));
  const [snap, setSnap] = useState<ThreeCardSnapshot>(() => engine.snapshot());
  const [ante, setAnte] = useState(100);
  const [pairPlusOn, setPairPlusOn] = useState(false);
  const [sixCardOn, setSixCardOn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errorAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!error) return;
    Animated.sequence([
      Animated.timing(errorAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.delay(1900),
      Animated.timing(errorAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(() => setError(null));
  }, [error, errorAnim]);

  const refresh = () => setSnap(engine.snapshot());

  const deal = () => {
    const e = engine.placeWagers({
      ante,
      pairPlus: pairPlusOn ? ante : 0,
      sixCardBonus: sixCardOn ? ante : 0,
    });
    if (e) return setError(e);
    refresh();
    engine.deal();
    refresh();
  };

  const decide = (playNow: boolean) => {
    const e = playNow ? engine.play() : engine.fold();
    if (e) return setError(e);
    refresh();
  };

  const newRound = () => {
    engine.newRound();
    refresh();
  };

  const round = snap.result;
  const placed = snap.wagers.ante + snap.wagers.play + snap.wagers.pairPlus + snap.wagers.sixCardBonus;
  const net = round ? round.totalNet + round.returnedStakes - placed : 0;
  const isSettled = snap.phase === 'SETTLED' || snap.phase === 'REVEALING';

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0A1410', '#050908', '#020403']} style={StyleSheet.absoluteFill} />

      {/* ===== الترويسة ===== */}
      <View style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}>
        <Pressable style={styles.iconBtn} onPress={() => router.back()} hitSlop={8}>
          <BackIcon size={20} color={COLORS.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.tableTitle}>ثلاث أوراق بوكر</Text>
          <Text style={styles.phaseText}>
            {snap.phase === 'BETTING'
              ? 'ضع رهانك'
              : snap.phase === 'DECISION'
              ? 'العب أو انسحب'
              : isSettled
              ? 'انتهت الجولة'
              : '…'}
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
          {snap.dealerCards
            ? snap.dealerCards.map((c, i) => (
                <PlayingCard key={i} card={toPCard(c)} width={46} height={65} animate delay={i * 140} />
              ))
            : [0, 1, 2].map((i) => (
                <PlayingCard key={`back-${i}`} card={FACE_DOWN} faceDown width={46} height={65} />
              ))}
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
            colors={['rgba(212,175,55,0.10)', 'rgba(212,175,55,0)']}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.spotTop}>
            <View style={styles.spotWho}>
              <Avatar name="أنت" size={36} showBorder isActive />
              <View style={styles.spotMeta}>
                <Text style={styles.spotName}>أنت</Text>
                <Text style={styles.spotBalance}>{formatCompact(snap.balance)}</Text>
              </View>
            </View>
            <View style={styles.spotStatus}>
              {snap.wagers.ante > 0 && <Chip amount={snap.wagers.ante} size={30} />}
              {snap.wagers.pairPlus > 0 && (
                <View style={styles.sideTag}>
                  <Text style={styles.sideTagText}>زوج +</Text>
                </View>
              )}
              {snap.wagers.sixCardBonus > 0 && (
                <View style={styles.sideTag}>
                  <Text style={styles.sideTagText}>٦ أوراق</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.spotCards}>
            <View style={styles.cardRow}>
              {(snap.playerCards ?? []).map((c, i) => (
                <View key={i} style={{ marginRight: i === 0 ? 0 : -14 }}>
                  <PlayingCard card={toPCard(c)} width={52} height={74} animate delay={i * 130} />
                </View>
              ))}
            </View>
            {!!snap.playerHand && (
              <Text style={styles.handName}>{HAND_NAMES[snap.playerHand.category]}</Text>
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
        {snap.phase === 'BETTING' && (
          <View style={styles.betArea}>
            <View style={styles.betRow}>
              <ActionButton label="−١٠٠" colors={['#3A4650', '#20282E'] as const} onPress={() => setAnte((b) => Math.max(10, b - 100))} />
              <View style={styles.betAmountBox}>
                <Text style={styles.betLabel}>الرهان الأساسي</Text>
                <Text style={styles.betValue}>{ante}</Text>
              </View>
              <ActionButton label="+١٠٠" colors={['#3A4650', '#20282E'] as const} onPress={() => setAnte((b) => Math.min(2500, Math.floor(snap.balance / 2), b + 100))} />
            </View>
            <View style={styles.toggles}>
              <Pressable
                style={[styles.toggle, pairPlusOn && styles.toggleOn]}
                onPress={() => setPairPlusOn((v) => !v)}
              >
                <Text style={[styles.toggleText, pairPlusOn && styles.toggleTextOn]}>الزوج الإضافي (={ante})</Text>
              </Pressable>
              <Pressable
                style={[styles.toggle, sixCardOn && styles.toggleOn]}
                onPress={() => setSixCardOn((v) => !v)}
              >
                <Text style={[styles.toggleText, sixCardOn && styles.toggleTextOn]}>بونص ٦ أوراق (={ante})</Text>
              </Pressable>
            </View>
            <GoldButton title="وزّع الأوراق" onPress={deal} />
          </View>
        )}

        {/* مرحلة القرار */}
        {snap.phase === 'DECISION' && (
          <View style={styles.betArea}>
            <Text style={styles.turnLabel}>
              يدك: <Text style={styles.turnScore}>{HAND_NAMES[snap.playerHand!.category]}</Text> — العب أو انسحب؟
            </Text>
            <View style={styles.actions}>
              <ActionButton label="انسحاب" colors={['#F05262', '#8E1B29'] as const} onPress={() => decide(false)} />
              <ActionButton
                label="لعب"
                sub={`+${snap.wagers.ante}`}
                colors={['#F7E7A6', '#B8912C'] as const}
                flex={1.2}
                darkText
                onPress={() => decide(true)}
              />
            </View>
          </View>
        )}

        {/* النتيجة */}
        {isSettled && !!round && (
          <View style={styles.betArea}>
            <View style={styles.resultsRow}>
              <Text style={styles.resultText}>{OUTCOME_LABEL[round.outcome] ?? round.outcome}</Text>
              <Text style={[styles.resultAmount, net < 0 && styles.resultLoss]}>
                {net >= 0 ? '+' : ''}{formatCompact(net)}
              </Text>
              {round.anteBonusNet > 0 && (
                <Text style={styles.resultBonus}>بونص اليد: {formatCompact(round.anteBonusNet)}</Text>
              )}
              {round.pairPlusNet > 0 && (
                <Text style={styles.resultBonus}>الزوج الإضافي: {formatCompact(round.pairPlusNet)}</Text>
              )}
              {round.sixCardBonusNet > 0 && (
                <Text style={styles.resultBonus}>بونص ٦ أوراق: {formatCompact(round.sixCardBonusNet)}</Text>
              )}
            </View>
            <GoldButton title="جولة جديدة" onPress={newRound} />
          </View>
        )}
      </View>

      {/* ===== نافذة التعليمات ===== */}
      <InstructionsModal
        game="three_card_poker"
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
  dealerQualifyTag: {
    marginTop: 10,
    paddingHorizontal: SPACING.md,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(212,175,55,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.4)',
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
  sideTag: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(91,160,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(91,160,255,0.4)',
  },
  sideTagText: {
    fontFamily: FONTS.ar.semibold,
    fontSize: TYPE.caption.fontSize,
    color: '#9CC2FF',
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
  handName: {
    fontFamily: FONTS.ar.semibold,
    fontSize: TYPE.small.fontSize,
    color: COLORS.goldLight,
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
  toggles: {
    flexDirection: 'row-reverse',
    gap: SPACING.sm,
  },
  toggle: {
    flex: 1,
    alignItems: 'center',
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: SPACING.sm,
  },
  toggleOn: {
    backgroundColor: 'rgba(212,175,55,0.14)',
    borderColor: COLORS.gold,
  },
  toggleText: {
    fontFamily: FONTS.ar.medium,
    fontSize: TYPE.caption.fontSize,
    color: COLORS.textDim,
    includeFontPadding: false,
  },
  toggleTextOn: {
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
    color: '#FF8A94',
  },
  resultBonus: {
    fontFamily: FONTS.ar.regular,
    fontSize: TYPE.small.fontSize,
    color: '#9CC2FF',
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
