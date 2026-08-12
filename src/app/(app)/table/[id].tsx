// ============================================================
// جرب حظك — طاولة تكساس هولدم
// ============================================================

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Avatar from '../../../components/ui/Avatar';
import Chip from '../../../components/ui/Chip';
import PlayingCard from '../../../components/game/PlayingCard';
import FeltTable from '../../../components/game/FeltTable';
import { Badge } from '../../../components/ui/Bits';
import { BackIcon, MicIcon, MicOffIcon } from '../../../components/icons/GameIcons';
import {
  COLORS,
  FONTS,
  TYPE,
  SPACING,
  RADIUS,
  SHADOWS,
  formatNumber,
  formatCompact,
} from '../../../constants/theme';
import { TexasHoldemEngine, GameSnapshot } from '../../../server/game/texasHoldem';
import { Card as GameCard } from '../../../server/game/deck';

/**
 * مواقع المقاعد على حافة البيضاوي (٠ = أنت، أسفل الوسط).
 * القيم تتبع حدود الجوخ: عمودياً ٢٠٪→٧٤٪، أفقياً ٤٪→٩٦٪
 */
const SEATS = [
  { top: '95%', left: '50%' },
  { top: '80%', left: '87%' },
  { top: '22%', left: '87%' },
  { top: '5%', left: '50%' },
  { top: '22%', left: '13%' },
  { top: '80%', left: '13%' },
  { top: '95%', left: '24%' },
];

const PHASE_LABEL: Record<string, string> = {
  waiting: 'بانتظار اللاعبين',
  preflop: 'ما قبل الفلوب',
  flop: 'الفلوب',
  turn: 'التيرن',
  river: 'الريفر',
  showdown: 'كشف الأوراق',
};

// ------------------------------------------------------------
// زر إجراء
// ------------------------------------------------------------
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
            colors={['rgba(255,255,255,0.28)', 'rgba(255,255,255,0)']}
            style={styles.actionGloss}
            pointerEvents="none"
          />
          <Text style={[styles.actionLabel, darkText && styles.actionLabelDark]}>{label}</Text>
          {!!sub && (
            <Text style={[styles.actionSub, darkText && styles.actionSubDark]}>{sub}</Text>
          )}
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

// ------------------------------------------------------------
// مقعد لاعب
// ------------------------------------------------------------
function Seat({
  player,
  isMe,
  topHalf,
}: {
  player: GameSnapshot['players'][number];
  isMe: boolean;
  /** المقعد في النصف العلوي — الرقاقة تنزل تحته لتقترب من المركز */
  topHalf: boolean;
}) {
  const folded = player.status === 'folded';
  const allIn = player.status === 'all_in';

  const bet = player.totalRoundBet > 0 && (
    <View style={[styles.seatBet, topHalf ? styles.seatBetBelow : styles.seatBetAbove]}>
      <Chip amount={Math.min(player.totalRoundBet, 5000)} size={22} />
      <Text style={styles.seatBetText}>{formatCompact(player.totalRoundBet)}</Text>
    </View>
  );

  return (
    <View style={[styles.seat, folded && styles.seatFolded]}>
      {!topHalf && bet}

      <View
        style={[
          styles.seatPod,
          player.isCurrentTurn && styles.seatPodActive,
          isMe && styles.seatPodMe,
        ]}
      >
        <Avatar
          name={player.name}
          size={40}
          showBorder
          isActive={player.isCurrentTurn}
        />
        <View style={styles.seatInfo}>
          <Text style={styles.seatName} numberOfLines={1}>
            {isMe ? 'أنت' : player.name}
          </Text>
          <Text style={styles.seatStack}>{formatCompact(player.balance)}</Text>
        </View>

        {player.isDealer && (
          <View style={styles.dealerBtn}>
            <Text style={styles.dealerBtnText}>D</Text>
          </View>
        )}
      </View>

      {(folded || allIn) && (
        <View style={[styles.seatTag, allIn && styles.seatTagAllIn]}>
          <Text style={[styles.seatTagText, allIn && styles.seatTagTextAllIn]}>
            {allIn ? 'كل الرصيد' : 'انسحب'}
          </Text>
        </View>
      )}

      {topHalf && bet}
    </View>
  );
}

// ------------------------------------------------------------
export default function PokerTableScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();

  const [engine] = useState(
    () => new TexasHoldemEngine({ maxPlayers: 6, smallBlind: 20, bigBlind: 40, minBuyIn: 500 })
  );
  const [snapshot, setSnapshot] = useState<GameSnapshot | null>(null);
  const [holeCards, setHoleCards] = useState<GameCard[]>([]);
  const [voiceMuted, setVoiceMuted] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const errorAnim = useRef(new Animated.Value(0)).current;
  const potScale = useRef(new Animated.Value(1)).current;

  // --- تشغيل اليد الأولى ---
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

  // --- نبضة عند تغيّر مجموع الرهان ---
  useEffect(() => {
    if (!snapshot?.pot) return;
    Animated.sequence([
      Animated.timing(potScale, { toValue: 1.14, duration: 130, useNativeDriver: true }),
      Animated.spring(potScale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 10 }),
    ]).start();
  }, [snapshot?.pot]);

  // --- إظهار الخطأ ثم إخفاؤه ---
  useEffect(() => {
    if (!error) return;
    Animated.sequence([
      Animated.timing(errorAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.delay(1900),
      Animated.timing(errorAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(() => setError(null));
  }, [error]);

  const autoPlayBots = useCallback(() => {
    const snap = engine.snapshot();
    const current = snap.players.find((p) => p.isCurrentTurn);
    if (!current || current.id === 'me') return;

    const action: 'call' | 'fold' = Math.random() > 0.25 ? 'call' : 'fold';
    const result = engine.performAction(current.id, action);
    if (!('error' in result)) {
      setSnapshot(result);
      setHoleCards(engine.getHoleCards('me'));
      const next = engine.snapshot().players.find((p) => p.isCurrentTurn);
      if (next && next.id !== 'me') setTimeout(autoPlayBots, 620);
    }
  }, [engine]);

  const handleAction = useCallback(
    (action: 'fold' | 'check' | 'call' | 'raise', amount?: number) => {
      const result = engine.performAction('me', action, amount);
      if ('error' in result) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        setError(result.error);
        return;
      }
      setSnapshot(result);
      setHoleCards(engine.getHoleCards('me'));
      setTimeout(autoPlayBots, 700);
    },
    [engine, autoPlayBots]
  );

  const startNewHand = () => {
    const r = engine.startHand();
    if (!('error' in r)) {
      setSnapshot(r);
      setHoleCards(engine.getHoleCards('me'));
    }
  };

  const me = snapshot?.players.find((p) => p.id === 'me');
  const isMyTurn = !!me?.isCurrentTurn;
  const isShowdown = snapshot?.phase === 'showdown';
  const showActions = isMyTurn && !isShowdown;
  const toCall = Math.max(0, (snapshot?.currentBet || 0) - (me?.totalRoundBet || 0));
  const minRaiseTo = Math.max((snapshot?.currentBet || 0) * 2, 80);
  const community = snapshot?.communityCards || [];

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0A1410', '#050908', '#020403']} style={StyleSheet.absoluteFill} />

      {/* ===== الترويسة ===== */}
      <View style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}>
        <Pressable style={styles.iconBtn} onPress={() => router.back()} hitSlop={8}>
          <BackIcon size={20} color={COLORS.text} />
        </Pressable>

        <View style={styles.headerCenter}>
          <Text style={styles.tableTitle}>طاولة {id === '3' ? 'VIP' : 'الرياض'}</Text>
          <Text style={styles.phaseText}>
            {PHASE_LABEL[snapshot?.phase || 'waiting']} · ٢٠/٤٠
          </Text>
        </View>

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
      </View>

      {/* ===== الطاولة ===== */}
      <View style={styles.tableArea}>
        {/* حلقة بنسبة أبعاد ثابتة — تضمن بيضاوياً عريضاً على كل الشاشات */}
        <View style={styles.tableRing}>
        <FeltTable style={styles.felt} radius={155} railWidth={14}>
          {/* أوراق المجتمع */}
          <View style={styles.community}>
            {Array.from({ length: 5 }).map((_, i) => {
              const card = community[i];
              return card ? (
                <PlayingCard
                  key={`c-${i}-${card.rank}${card.suit}`}
                  card={card}
                  width={40}
                  height={57}
                  animate
                  delay={i * 90}
                />
              ) : (
                <View key={`slot-${i}`} style={styles.cardSlot} />
              );
            })}
          </View>

          {/* مجموع الرهان */}
          <Animated.View style={[styles.pot, { transform: [{ scale: potScale }] }]}>
            <Chip amount={Math.min(snapshot?.pot || 0, 5000)} size={22} stacked />
            <View>
              <Text style={styles.potLabel}>مجموع الرهان</Text>
              <Text style={styles.potValue}>{formatNumber(snapshot?.pot || 0)}</Text>
            </View>
          </Animated.View>
        </FeltTable>

        {/* المقاعد */}
        {snapshot?.players.map((p) => {
          const pos = SEATS[p.seatIndex % SEATS.length];
          return (
            <View
              key={p.id}
              style={[styles.seatAnchor, { top: pos.top, left: pos.left } as any]}
            >
              <Seat
                player={p}
                isMe={p.id === 'me'}
                topHalf={parseFloat(pos.top) < 50}
              />
            </View>
          );
        })}
        </View>
      </View>

      {/* ===== رسالة الخطأ ===== */}
      {!!error && (
        <Animated.View
          style={[
            styles.toast,
            {
              top: insets.top + 62,
              opacity: errorAnim,
              transform: [
                { translateY: errorAnim.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) },
              ],
            },
          ]}
        >
          <Text style={styles.toastText}>{error}</Text>
        </Animated.View>
      )}

      {/* ===== منطقتي ===== */}
      <View style={[styles.myArea, { paddingBottom: insets.bottom + SPACING.md }]}>
        <LinearGradient
          colors={['rgba(2,4,3,0)', 'rgba(2,4,3,0.92)', 'rgba(2,4,3,1)']}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        {/* أوراقي — مروحة */}
        {holeCards.length > 0 && (
          <View style={styles.myCards}>
            {holeCards.map((c, i) => (
              <View
                key={`${c.rank}${c.suit}`}
                style={[
                  styles.myCard,
                  {
                    transform: [
                      { rotate: i === 0 ? '-7deg' : '7deg' },
                      { translateX: i === 0 ? 10 : -10 },
                    ],
                    zIndex: i,
                  },
                ]}
              >
                <PlayingCard card={c} width={62} height={88} animate delay={i * 110} />
              </View>
            ))}
          </View>
        )}

        {/* شريط الإجراءات */}
        {showActions && (
          <View style={styles.actions}>
            <ActionButton
              label="انسحاب"
              colors={['#F05262', '#8E1B29'] as const}
              onPress={() => handleAction('fold')}
            />
            <ActionButton
              label={toCall > 0 ? 'مجاراة' : 'تمرير'}
              sub={toCall > 0 ? formatNumber(toCall) : undefined}
              colors={['#5AA0FF', '#1B4EA8'] as const}
              onPress={() => handleAction(toCall > 0 ? 'call' : 'check')}
            />
            <ActionButton
              label="مضاعفة"
              sub={formatNumber(Math.max((snapshot?.currentBet || 0) * 2, 80))}
              colors={['#2FD98A', '#0B7345'] as const}
              flex={1.15}
              onPress={() => handleAction('raise', minRaiseTo)}
            />
          </View>
        )}

        {/* بانتظار الآخرين */}
        {!showActions && !isShowdown && (
          <View style={styles.waiting}>
            <Text style={styles.waitingText}>
              بانتظار {snapshot?.players.find((p) => p.isCurrentTurn)?.name || 'اللاعبين'}…
            </Text>
          </View>
        )}

        {/* الكشف */}
        {isShowdown && (
          <View style={styles.showdown}>
            {!!snapshot?.winners?.length && (
              <View style={styles.winnerRow}>
                <Badge
                  label={`${snapshot.winners[0].name} فاز بـ ${formatNumber(
                    snapshot.winners[0].amount
                  )}`}
                  tone="gold"
                />
                <Text style={styles.handName}>{snapshot.winners[0].handName}</Text>
              </View>
            )}
            <ActionButton
              label="جولة جديدة"
              colors={['#F7E7A6', '#B8912C'] as const}
              darkText
              onPress={startNewHand}
            />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020403' },

  // الترويسة
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    zIndex: 30,
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
    backgroundColor: 'rgba(31,191,117,0.13)',
    borderColor: 'rgba(31,191,117,0.45)',
  },
  headerCenter: { alignItems: 'center', gap: 1 },
  tableTitle: {
    fontFamily: FONTS.ar.bold,
    fontSize: TYPE.h3.fontSize,
    lineHeight: TYPE.h3.lineHeight,
    color: COLORS.text,
  },
  phaseText: {
    fontFamily: FONTS.ar.medium,
    fontSize: TYPE.caption.fontSize,
    color: COLORS.gold,
  },

  // الطاولة
  tableArea: {
    flex: 1,
    marginHorizontal: SPACING.md,
    justifyContent: 'center',
  },
  tableRing: {
    width: '100%',
    // بيضاوي طولي — يملأ شاشة الجوال كما في تطبيقات البوكر الحقيقية
    aspectRatio: 0.82,
    maxHeight: '100%',
    alignSelf: 'center',
  },
  felt: {
    position: 'absolute',
    top: '7%',
    bottom: '7%',
    left: '6%',
    right: '6%',
  },
  community: {
    flexDirection: 'row',
    gap: 5,
  },
  cardSlot: {
    width: 40,
    height: 57,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(0,0,0,0.14)',
  },
  pot: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.lg,
    backgroundColor: 'rgba(2,10,7,0.62)',
    paddingHorizontal: SPACING.md,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.32)',
  },
  potLabel: {
    fontFamily: FONTS.ar.medium,
    fontSize: 9,
    lineHeight: 12,
    color: 'rgba(246,242,232,0.6)',
    textAlign: 'right',
  },
  potValue: {
    fontFamily: FONTS.num.bold,
    fontSize: TYPE.body.fontSize,
    lineHeight: 19,
    color: COLORS.goldLight,
    textAlign: 'right',
    includeFontPadding: false,
  },

  // المقاعد
  seatAnchor: {
    position: 'absolute',
    width: 92,
    marginLeft: -46,
    marginTop: -30,
    alignItems: 'center',
  },
  seat: {
    alignItems: 'center',
  },
  seatFolded: {
    opacity: 0.42,
  },
  seatPod: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 5,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(3,9,7,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
  },
  seatPodActive: {
    borderColor: COLORS.gold,
    backgroundColor: 'rgba(24,18,4,0.95)',
  },
  seatPodMe: {
    borderColor: 'rgba(212,175,55,0.5)',
  },
  seatInfo: {
    alignItems: 'flex-end',
    paddingLeft: 4,
    minWidth: 34,
  },
  seatName: {
    fontFamily: FONTS.ar.semibold,
    fontSize: 10,
    lineHeight: 14,
    color: COLORS.text,
    includeFontPadding: false,
  },
  seatStack: {
    fontFamily: FONTS.num.bold,
    fontSize: 10,
    lineHeight: 13,
    color: COLORS.goldLight,
    includeFontPadding: false,
  },
  dealerBtn: {
    position: 'absolute',
    top: -5,
    left: -5,
    width: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: '#F3EDE0',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#9A927F',
  },
  dealerBtnText: {
    fontFamily: FONTS.num.black,
    fontSize: 9,
    color: '#1A1206',
    includeFontPadding: false,
  },
  seatBet: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(2,8,6,0.7)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  seatBetAbove: { marginBottom: 3 },
  seatBetBelow: { marginTop: 3 },
  seatBetText: {
    fontFamily: FONTS.num.bold,
    fontSize: 9,
    color: COLORS.goldLight,
    includeFontPadding: false,
  },
  seatTag: {
    marginTop: 3,
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(226,61,77,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(226,61,77,0.4)',
  },
  seatTagAllIn: {
    backgroundColor: 'rgba(212,175,55,0.18)',
    borderColor: 'rgba(212,175,55,0.45)',
  },
  seatTagText: {
    fontFamily: FONTS.ar.semibold,
    fontSize: 9,
    lineHeight: 14,
    color: '#FF8A94',
    includeFontPadding: false,
  },
  seatTagTextAllIn: {
    color: COLORS.goldLight,
  },

  // التنبيه
  toast: {
    position: 'absolute',
    left: SPACING.xl,
    right: SPACING.xl,
    backgroundColor: 'rgba(58,10,16,0.97)',
    borderWidth: 1,
    borderColor: 'rgba(226,61,77,0.5)',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    zIndex: 60,
  },
  toastText: {
    fontFamily: FONTS.ar.semibold,
    fontSize: TYPE.small.fontSize,
    color: '#FFD9DD',
    textAlign: 'center',
  },

  // منطقتي
  myArea: {
    paddingTop: SPACING.md,
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
  myCards: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    height: 92,
  },
  myCard: {
    marginHorizontal: -6,
  },
  actions: {
    flexDirection: 'row-reverse',
    gap: SPACING.sm,
  },
  actionBtn: {
    height: 56,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  actionGloss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '46%',
  },
  actionLabel: {
    fontFamily: FONTS.ar.bold,
    fontSize: TYPE.body.fontSize,
    lineHeight: TYPE.body.lineHeight,
    color: '#FFFFFF',
    includeFontPadding: false,
  },
  actionSub: {
    fontFamily: FONTS.num.bold,
    fontSize: TYPE.caption.fontSize,
    color: 'rgba(255,255,255,0.85)',
    includeFontPadding: false,
  },
  actionLabelDark: {
    color: COLORS.onGold,
  },
  actionSubDark: {
    color: 'rgba(26,18,6,0.75)',
  },
  waiting: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waitingText: {
    fontFamily: FONTS.ar.medium,
    fontSize: TYPE.small.fontSize,
    color: COLORS.textDim,
  },
  showdown: {
    gap: SPACING.md,
  },
  winnerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
  },
  handName: {
    fontFamily: FONTS.ar.medium,
    fontSize: TYPE.small.fontSize,
    color: COLORS.textDim,
  },
});
