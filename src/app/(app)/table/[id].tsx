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
  Easing,
  Modal,
  TextInput,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Avatar from '../../../components/ui/Avatar';
import Chip from '../../../components/ui/Chip';
import PlayingCard from '../../../components/game/PlayingCard';
import FlyCard from '../../../components/game/FlyCard';
import WinFX from '../../../components/game/WinFX';
import ActionButton from '../../../components/game/ActionButton';
import FeltTable from '../../../components/game/FeltTable';
import InstructionsModal from '../../../components/game/InstructionsModal';
import { Badge } from '../../../components/ui/Bits';
import GoldButton from '../../../components/ui/GoldButton';
import { BackIcon, MicIcon, MicOffIcon, InfoIcon, UserPlusIcon, UserCheckIcon } from '../../../components/icons/GameIcons';
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
import { useReducedMotion } from '../../../constants/motion';
import { GameSnapshot } from '../../../server/game/texasHoldem';
import { Card as GameCard } from '../../../server/game/deck';
import { useGameSocket } from '../../../hooks/useGameSocket';
import { useAgoraVoice } from '../../../hooks/useAgoraVoice';
import { useCountUp } from '../../../hooks/useCountUp';
import { useFriendsStore } from '../../../stores/friendsStore';
import { useAuthStore } from '../../../stores/authStore';
import { AGORA_APP_ID } from '../../../lib/config';

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
// (ActionButton مشترك من components/game — أُزيلت النسخة المحلية المكررة)
// ------------------------------------------------------------

// ------------------------------------------------------------
// مقعد لاعب
// ------------------------------------------------------------
/** رفع الورقة بالضغط المطول: ترتفع وتميل نحو المركز بإحساس ورقي */
function LiftCard({ children }: { children: React.ReactNode }) {
  const lift = useRef(new Animated.Value(0)).current;
  const reduced = useReducedMotion();
  const to = (v: number) => {
    if (reduced) return;
    Animated.spring(lift, {
      toValue: v,
      useNativeDriver: true,
      damping: 18,
      stiffness: 220,
      mass: 0.7,
    }).start();
  };

  return (
    <Pressable onPressIn={() => to(1)} onPressOut={() => to(0)}>
      <Animated.View
        style={{
          transform: [
            { translateY: lift.interpolate({ inputRange: [0, 1], outputRange: [0, -16] }) },
            { rotate: lift.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-4deg'] }) },
            { scale: lift.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] }) },
          ],
        }}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}

function Seat({
  player,
  isMe,
  topHalf,
  winner = false,
}: {
  player: GameSnapshot['players'][number];
  isMe: boolean;
  /** المقعد في النصف العلوي — الرقاقة تنزل تحته لتقترب من المركز */
  topHalf: boolean;
  /** فائز باليد — حلقة شامبين نابضة */
  winner?: boolean;
}) {
  const folded = player.status === 'folded';
  const allIn = player.status === 'all_in';

  const isFriend = useFriendsStore((s) => s.isFriend(player.id));
  const sendFriendRequest = useFriendsStore((s) => s.sendRequest);

  // نبض حلقة الفائز
  const winPulse = useRef(new Animated.Value(0)).current;
  const reduced = useReducedMotion();
  useEffect(() => {
    if (!winner || reduced) {
      winPulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(winPulse, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(winPulse, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [winner, reduced, winPulse]);

  const bet = player.totalRoundBet > 0 && (
    <View style={[styles.seatBet, topHalf ? styles.seatBetBelow : styles.seatBetAbove]}>
      <Chip amount={Math.min(player.totalRoundBet, 5000)} size={22} />
      <Text style={styles.seatBetText}>{formatCompact(player.totalRoundBet)}</Text>
    </View>
  );

  return (
    <View style={[styles.seat, folded && styles.seatFolded]}>
      {!topHalf && bet}

      {/* حلقة الفائز النابضة */}
      {winner && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.winnerRing,
            {
              opacity: winPulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }),
              transform: [{ scale: winPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] }) }],
            },
          ]}
        />
      )}

      <View
        style={[
          styles.seatPod,
          player.isCurrentTurn && styles.seatPodActive,
          isMe && styles.seatPodMe,
          winner && styles.seatPodWinner,
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

      {!isMe && (
        <Pressable
          style={[styles.addFriendBtn, isFriend && styles.addFriendBtnDone]}
          onPress={() => {
            if (isFriend) return;
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            sendFriendRequest(player.id, player.name).catch(() => {
              /* تجاهل — قد يكونون أصدقاء بالفعل */
            });
          }}
          hitSlop={6}
        >
          {isFriend ? (
            <UserCheckIcon size={12} color={COLORS.emerald} />
          ) : (
            <UserPlusIcon size={12} color={COLORS.goldLight} />
          )}
        </Pressable>
      )}

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
  const { isConnected, joinTable, leaveTable, performAction, on } = useGameSocket();
  const { isMuted, joinChannel, toggleMute, destroy, joinError } = useAgoraVoice();

  // هوية هذه الجلسة — من الحساب الحقيقي، أو من معرّف المقعد الذي يمنحه الخادم
  const profile = useAuthStore((s) => s.profile);
  const [seatId, setSeatId] = useState<string | null>(null);
  const myId = seatId ?? profile?.id ?? 'guest';
  const myName = profile?.displayName ?? 'أنت';
  const tableId = `table-${id ?? '1'}`;

  const [snapshot, setSnapshot] = useState<GameSnapshot | null>(null);
  const [holeCards, setHoleCards] = useState<GameCard[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  // طاولة خاصة: طلب كلمة السر عند الرفض من السيرفر
  const [pwPrompt, setPwPrompt] = useState(false);
  const [pwText, setPwText] = useState('');

  const errorAnim = useRef(new Animated.Value(0)).current;
  const noticeAnim = useRef(new Animated.Value(0)).current;
  const potScale = useRef(new Animated.Value(1)).current;

  // إظهار أخطاء الصوت للمستخدم بدل الفشل الصامت
  useEffect(() => {
    if (joinError) setError(joinError);
  }, [joinError]);

  // --- الانضمام للطاولة ---
  useEffect(() => {
    joinTable(tableId, myId, myName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableId, myId]);

  // --- مغادرة صريحة عند الخروج من الشاشة (يُزال المقعد فورًا ولا يبقى شبحًا) ---
  useEffect(() => {
    return () => {
      leaveTable(tableId, myId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableId, myId]);

  // --- دخول طاولة خاصة بكلمة السر (يعيد الانضمام بكلمة السر) ---
  const submitPassword = useCallback(() => {
    const pwd = pwText.trim();
    setPwPrompt(false);
    setPwText('');
    if (pwd) joinTable(tableId, myId, myName, pwd);
  }, [pwText, tableId, myId, myName, joinTable]);

  // --- الاستماع لحالة الطاولة وقناة الصوت من السيرفر ---
  useEffect(() => {
    const offState = on<GameSnapshot>('table:state', (s) => setSnapshot(s));
    const offHoles = on<{ cards: GameCard[] }>('game:holeCards', (d) => setHoleCards(d.cards ?? []));
    const offSeat = on<{ playerId: string }>('table:seat', (d) => {
      if (d?.playerId) setSeatId(d.playerId);
    });
    const offError = on<{ message: string; code?: string }>('error', (d) => {
      if (d?.code === 'PASSWORD_WRONG') {
        setPwPrompt(true);
        setError(null);
      } else {
        setError(d.message);
      }
    });
    const offNotice = on<{ text: string }>('table:notice', (d) => setNotice(d.text));
    const offClosed = on<{ message?: string }>('table:closed', (d) => {
      setNotice(d?.message ?? 'أُغلقت الطاولة من قبل منشئها');
      setTimeout(() => {
        router.back();
      }, 2000);
    });
    const offVoice = on<{ appId: string; channelName: string; token: string }>(
      'voice:token',
      (d) => joinChannel(d.appId || AGORA_APP_ID, d.channelName, d.token)
    );
    return () => {
      offState();
      offHoles();
      offSeat();
      offError();
      offNotice();
      offClosed();
      offVoice();
    };
  }, [on, joinChannel]);

  // --- إتلاف محرك الصوت عند مغادرة الشاشة ---
  useEffect(() => {
    return () => {
      destroy();
    };
  }, [destroy]);

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

  // --- إظهار الإشعار ثم إخفاؤه ---
  useEffect(() => {
    if (!notice) return;
    Animated.sequence([
      Animated.timing(noticeAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.delay(2400),
      Animated.timing(noticeAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(() => setNotice(null));
  }, [notice]);

  const handleAction = useCallback(
    (action: 'fold' | 'check' | 'call' | 'raise' | 'all_in' | 'bet', amount?: number) => {
      performAction(tableId, myId, action, amount);
    },
    [performAction, tableId, myId]
  );

  const startNewHand = () => {
    setError('تبدأ الجولة التالية تلقائيًا خلال ثوانٍ');
  };

  const me = snapshot?.players.find((p) => p.id === myId);
  const isMyTurn = !!me?.isCurrentTurn;
  const isShowdown = snapshot?.phase === 'showdown';
  const showActions = isMyTurn && !isShowdown;
  const toCall = Math.max(0, (snapshot?.currentBet || 0) - (me?.totalRoundBet || 0));
  const minRaiseTo = Math.max((snapshot?.currentBet || 0) * 2, 80);
  const community = snapshot?.communityCards || [];
  const winnerIds = new Set((snapshot?.winners ?? []).map((w) => w.playerId));
  const winnersCards = (snapshot?.winners ?? []).flatMap((w) =>
    (w.revealedCards ?? []).map((c) => ({ id: w.playerId, card: c }))
  );
  const potDisplay = useCountUp(snapshot?.pot || 0);
  const handKey = `h${snapshot?.handNumber ?? 0}`;

  // ===== لحظة الفوز السينمائية (عند فوزي بالكشف) =====
  const heWin =
    isShowdown && winnerIds.has(myId)
      ? { key: `he-${snapshot?.handNumber ?? 0}`, magnitude: 3 as const }
      : null;

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.bgSoft, COLORS.bg, COLORS.surfaceSunken]} style={StyleSheet.absoluteFill} />

      {/* لحظة الفوز */}
      <WinFX trigger={heWin} />

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

        <View style={styles.headerSide}>
          <Pressable
            style={[styles.iconBtn, !isMuted && styles.iconBtnLive]}
            onPress={() => toggleMute()}
            hitSlop={8}
          >
            {isMuted ? (
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

      {/* ===== الطاولة ===== */}
      <View style={styles.tableArea}>
        {/* حلقة بنسبة أبعاد ثابتة — تضمن بيضاوياً عريضاً على كل الشاشات */}
        <View style={styles.tableRing}>
        <FeltTable style={styles.felt} radius={155} railWidth={14}>
          {/* أوراق المجتمع — توزيع سينمائي من يد الموزع */}
          <View style={styles.community}>
            {Array.from({ length: 5 }).map((_, i) => {
              const card = community[i];
              return card ? (
                <FlyCard
                  key={`c-${i}-${card.rank}${card.suit}-${handKey}`}
                  dealKey={`${handKey}-${i}`}
                  origin="dealer"
                  // الفلوب يتتابع، والتيرن/الريفر بعد وقفة ترقّب (الموزع يحرق ورقة)
                  delay={i === 3 || i === 4 ? 480 : i * 140}
                  duration={i === 3 || i === 4 ? 520 : 380}
                >
                  <PlayingCard card={card} width={40} height={57} />
                </FlyCard>
              ) : (
                <View key={`slot-${i}`} style={styles.cardSlot} />
              );
            })}
          </View>

          {/* أوراق الفائزين عند الكشف — تطير وتُقلب من المركز */}
          {isShowdown && winnersCards.length > 0 && (
            <View style={styles.revealedRow} pointerEvents="none">
              {winnersCards.map((w, i) => (
                <FlyCard
                  key={`win-${w.id}-${i}`}
                  dealKey={`reveal-${handKey}-${i}`}
                  origin="center"
                  delay={300 + i * 160}
                  flip
                >
                  <PlayingCard card={w.card} width={34} height={48} />
                </FlyCard>
              ))}
            </View>
          )}

          {/* مجموع الرهان — عدّاد متدحرج + نبضة */}
          <Animated.View style={[styles.pot, { transform: [{ scale: potScale }] }]}>
            <Chip amount={Math.min(snapshot?.pot || 0, 5000)} size={22} stacked />
            <View>
              <Text style={styles.potLabel}>مجموع الرهان</Text>
              <Text style={styles.potValue}>{formatNumber(potDisplay)}</Text>
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
                isMe={p.id === myId}
                topHalf={parseFloat(pos.top) < 50}
                winner={winnerIds.has(p.id)}
              />
            </View>
          );
        })}
        </View>
      </View>

      {/* ===== تنبيه انقطاع الاتصال ===== */}
      {!isConnected && (
        <View style={[styles.offlineBar, { top: insets.top + 62 }]}>
          <Text style={styles.offlineText}>
            جارٍ الاتصال بالخادم… إذا استمرت المشكلة تأكد من تشغيل السيرفر
          </Text>
        </View>
      )}

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

      {/* ===== طلب كلمة سر الطاولة الخاصة ===== */}
      <Modal visible={pwPrompt} transparent animationType="fade" onRequestClose={() => setPwPrompt(false)}>
        <View style={styles.pwOverlay}>
          <View style={styles.pwCard}>
            <Text style={styles.pwTitle}>طاولة خاصة 🔒</Text>
            <Text style={styles.pwSubtitle}>هذه الطاولة محمية — أدخل كلمة السر للدخول</Text>
            <TextInput
              value={pwText}
              onChangeText={setPwText}
              placeholder="كلمة السر"
              placeholderTextColor={COLORS.textFaint}
              secureTextEntry
              autoFocus
              style={styles.pwInput}
              onSubmitEditing={submitPassword}
              returnKeyType="done"
            />
            <View style={styles.pwRow}>
              <Pressable onPress={() => setPwPrompt(false)} hitSlop={8} style={styles.pwCancel}>
                <Text style={styles.pwCancelText}>إلغاء</Text>
              </Pressable>
              <GoldButton title="دخول" onPress={submitPassword} disabled={!pwText.trim()} style={styles.pwBtn} />
            </View>
          </View>
        </View>
      </Modal>

      {/* ===== شريط الإشعار ===== */}
      {!!notice && (
        <Animated.View
          style={[
            styles.noticeBar,
            {
              top: insets.top + 62,
              opacity: noticeAnim,
              transform: [
                { translateY: noticeAnim.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) },
              ],
            },
          ]}
        >
          <Text style={styles.noticeText}>{notice}</Text>
        </Animated.View>
      )}

      {/* ===== منطقتي ===== */}
      <View style={[styles.myArea, { paddingBottom: insets.bottom + SPACING.md }]}>
        <LinearGradient
          colors={['rgba(10,13,18,0)', 'rgba(10,13,18,0.92)', 'rgba(10,13,18,1)']}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        {/* أوراقي — مروحة تنساب من حذاء البطاقات ثم تُقلب عند الكشف */}
        {holeCards.length > 0 && (
          <View style={styles.myCards}>
            {holeCards.map((c, i) => (
              <View
                key={`${c.rank}${c.suit}-${handKey}`}
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
                <FlyCard
                  dealKey={`mine-${handKey}-${i}`}
                  origin="shoe"
                  delay={i * 120}
                  duration={460}
                  flip
                  flipKey={`${handKey}-${isShowdown ? 'show' : 'hide'}`}
                >
                  <LiftCard>
                    <PlayingCard card={c} width={62} height={88} />
                  </LiftCard>
                </FlyCard>
              </View>
            ))}
          </View>
        )}

        {/* شريط الإجراءات */}
        {showActions && (
          <View style={styles.actions}>
            <ActionButton
              label="انسحاب"
              colors={['#b4233a', '#8e000b'] as const}
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
              colors={['#8FCBB4', '#0A3D2E'] as const}
              flex={1.15}
              onPress={() => {
                // توجيه صحيح حسب حالة الرهان + كل الرصيد عندما لا يكفي المبلغ.
                const stack = (me?.balance ?? 0) + (me?.currentBet ?? 0);
                const desired = minRaiseTo;
                if (desired >= stack) handleAction('all_in');
                else handleAction((snapshot?.currentBet || 0) > 0 ? 'raise' : 'bet', desired);
              }}
            />
          </View>
        )}

        {/* بانتظار الآخرين */}
        {!showActions && !isShowdown && (
          <View style={styles.waiting}>
            <Text style={styles.waitingText}>
              بانتظار {snapshot?.players.find((p) => p.isCurrentTurn)?.name || 'اللاعبين'}…
            </Text>
            {(!snapshot || (snapshot?.players ?? []).length < 2) && (
              <View style={styles.waitingHint}>
                <Text style={styles.waitingHintText}>
                  تكساس هولدم لعبة بين اللاعبين — لكن يمكنك اللعب وحدك ضد الموزع في:
                </Text>
                <GoldButton title="بلاك جاك" onPress={() => router.push('/(app)/blackjack/1')} />
                <GoldButton title="ثلاث أوراق بوكر" onPress={() => router.push('/(app)/three-card/1')} />
                <GoldButton title="البوكر الروسي" onPress={() => router.push('/(app)/russian/1')} />
              </View>
            )}
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
              colors={['#E3C98A', '#8C6D2F'] as const}
              darkText
              onPress={startNewHand}
            />
          </View>
        )}
      </View>

      {/* ===== نافذة التعليمات ===== */}
      <InstructionsModal
        game="texas_holdem"
        visible={helpOpen}
        onClose={() => setHelpOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#070A0F' },

  // الترويسة
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    zIndex: 30,
  },
  headerSide: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: SPACING.sm,
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
    backgroundColor: 'rgba(143,203,180,0.13)',
    borderColor: 'rgba(143,203,180,0.45)',
  },
  headerCenter: { alignItems: 'center', gap: 1 },
  tableTitle: {
    fontFamily: FONTS.ar.bold,
    fontSize: TYPE.h3.fontSize,
    lineHeight: TYPE.h3.lineHeight,
    color: COLORS.goldLight,
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
    backgroundColor: 'rgba(10,13,18,0.62)',
    paddingHorizontal: SPACING.md,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(201,169,97,0.32)',
  },
  potLabel: {
    fontFamily: FONTS.ar.medium,
    fontSize: 9,
    lineHeight: 12,
    color: 'rgba(218,226,253,0.6)',
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
  addFriendBtn: {
    marginTop: 3,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(10,13,18,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(201,169,97,0.4)',
  },
  addFriendBtnDone: {
    borderColor: 'rgba(143,203,180,0.5)',
  },
  seatPod: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 5,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(10,13,18,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
  },
  seatPodActive: {
    borderColor: COLORS.gold,
    backgroundColor: 'rgba(38,30,12,0.95)',
  },
  seatPodMe: {
    borderColor: 'rgba(201,169,97,0.5)',
  },
  seatPodWinner: {
    borderColor: COLORS.goldLight,
    backgroundColor: 'rgba(38,30,12,0.98)',
    ...SHADOWS.goldSoft,
  },
  winnerRing: {
    position: 'absolute',
    top: -7,
    width: 74,
    height: 52,
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
    borderColor: COLORS.gold,
    backgroundColor: 'rgba(201,169,97,0.10)',
  },
  revealedRow: {
    position: 'absolute',
    bottom: 56,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
    zIndex: 8,
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
    backgroundColor: '#fdfbf7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#89938d',
  },
  dealerBtnText: {
    fontFamily: FONTS.num.black,
    fontSize: 9,
    color: '#3c2f00',
    includeFontPadding: false,
  },
  seatBet: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(10,13,18,0.7)',
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
    backgroundColor: 'rgba(255,180,171,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,180,171,0.4)',
  },
  seatTagAllIn: {
    backgroundColor: 'rgba(201,169,97,0.18)',
    borderColor: 'rgba(201,169,97,0.45)',
  },
  seatTagText: {
    fontFamily: FONTS.ar.semibold,
    fontSize: 9,
    lineHeight: 14,
    color: '#ffdad6',
    includeFontPadding: false,
  },
  seatTagTextAllIn: {
    color: COLORS.goldLight,
  },

  // التنبيه
  offlineBar: {
    position: 'absolute',
    left: SPACING.xl,
    right: SPACING.xl,
    backgroundColor: 'rgba(60,47,0,0.97)',
    borderWidth: 1,
    borderColor: 'rgba(201,169,97,0.6)',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    zIndex: 65,
  },
  offlineText: {
    fontFamily: FONTS.ar.semibold,
    fontSize: TYPE.small.fontSize,
    color: COLORS.goldLight,
    textAlign: 'center',
  },
  toast: {
    position: 'absolute',
    left: SPACING.xl,
    right: SPACING.xl,
    backgroundColor: 'rgba(62,0,8,0.97)',
    borderWidth: 1,
    borderColor: 'rgba(255,180,171,0.5)',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    zIndex: 60,
  },
  toastText: {
    fontFamily: FONTS.ar.semibold,
    fontSize: TYPE.small.fontSize,
    color: '#ffdad6',
    textAlign: 'center',
  },
  noticeBar: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 60,
    backgroundColor: 'rgba(10,13,18,0.97)',
    borderWidth: 1,
    borderColor: 'rgba(201,169,97,0.5)',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
  },
  noticeText: {
    fontFamily: FONTS.ar.semibold,
    fontSize: TYPE.small.fontSize,
    color: COLORS.goldLight,
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
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.md,
  },
  waitingText: {
    fontFamily: FONTS.ar.medium,
    fontSize: TYPE.small.fontSize,
    color: COLORS.textDim,
  },
  waitingHint: {
    alignItems: 'center',
    gap: SPACING.md,
    width: '100%',
  },
  waitingHintText: {
    fontFamily: FONTS.ar.regular,
    fontSize: TYPE.small.fontSize,
    color: COLORS.textFaint,
    textAlign: 'center',
    lineHeight: TYPE.small.lineHeight * 1.3,
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
  // ===== نافذة كلمة سر الطاولة الخاصة =====
  pwOverlay: {
    flex: 1,
    backgroundColor: 'rgba(4,6,10,0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  pwCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    backgroundColor: '#0E131B',
    padding: SPACING.xl,
    gap: SPACING.md,
    ...SHADOWS.e3,
  },
  pwTitle: {
    fontFamily: FONTS.ar.bold,
    fontSize: TYPE.h3.fontSize,
    color: COLORS.text,
    textAlign: 'center',
  },
  pwSubtitle: {
    fontFamily: FONTS.ar.regular,
    fontSize: TYPE.small.fontSize,
    color: COLORS.textDim,
    textAlign: 'center',
    lineHeight: TYPE.small.lineHeight * 1.35,
  },
  pwInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    color: COLORS.text,
    fontFamily: FONTS.ar.regular,
    fontSize: TYPE.body.fontSize,
    textAlign: 'center',
  },
  pwRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: SPACING.md,
    marginTop: SPACING.sm,
  },
  pwCancel: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pwCancelText: {
    fontFamily: FONTS.ar.medium,
    fontSize: TYPE.body.fontSize,
    color: COLORS.textDim,
  },
  pwBtn: {
    flex: 1.4,
  },
});
