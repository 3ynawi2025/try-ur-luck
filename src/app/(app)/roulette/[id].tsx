// ============================================================
// جرب حظك — الروليت (ضد العجلة — لاعب واحد)
// تصميم Midnight Royale: عجلة ذهبية/ماهوجني + جوخ زمردي + رقاقات لامعة
// ============================================================

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, ScrollView, Easing } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Svg, { G, Circle, Path, Ellipse, Rect, Text as SvgText } from 'react-native-svg';
import GoldButton from '../../../components/ui/GoldButton';
import InstructionsModal from '../../../components/game/InstructionsModal';
import GameHeader from '../../../components/game/GameHeader';
import SoloTableBar from '../../../components/game/SoloTableBar';
import WinFX from '../../../components/game/WinFX';
import { CrownIcon } from '../../../components/icons/GameIcons';
import { useErrorToast } from '../../../hooks/useErrorToast';
import { useCountUp } from '../../../hooks/useCountUp';
import {
  RouletteSnapshot,
  RouletteBetType,
  EUROPEAN_WHEEL,
  numberColor,
} from '../../../server/game/roulette';
import { useSoloGame } from '../../../hooks/useSoloGame';
import {
  COLORS,
  FONTS,
  TYPE,
  SPACING,
  RADIUS,
  SHADOWS,
  formatCompact,
} from '../../../constants/theme';


// حجم القرص في النافذة السينمائية + مسار الكرة المناسب له
const WHEEL_SIZE = 300;
const BALL_START = Math.round(118 * (WHEEL_SIZE / 260));
const BALL_END = Math.round(78 * (WHEEL_SIZE / 260));

const CELL_COLOR: Record<string, string> = {
  red: COLORS.crimsonContainer,
  black: '#1B2230',
  green: COLORS.emeraldContainer,
};

// ===== عجلة الروليت (SVG) — الحجم قابل للضبط (للنافذة السينمائية) =====
function Wheel({ spinAngle, size = 300 }: { spinAngle: Animated.Value; size?: number }) {
  const R = size / 2;
  const CX = R;
  const CY = R;
  const N = EUROPEAN_WHEEL.length;
  const step = (2 * Math.PI) / N;

  const sectors = EUROPEAN_WHEEL.map((num, i) => {
    const a0 = i * step - Math.PI / 2;
    const a1 = (i + 1) * step - Math.PI / 2;
    const x0 = CX + R * Math.cos(a0);
    const y0 = CY + R * Math.sin(a0);
    const x1 = CX + R * Math.cos(a1);
    const y1 = CY + R * Math.sin(a1);
    const mid = (a0 + a1) / 2;
    const lx = CX + R * 0.8 * Math.cos(mid);
    const ly = CY + R * 0.8 * Math.sin(mid);
    const color = numberColor(num);
    return { num, d: `M ${CX} ${CY} L ${x0} ${y0} A ${R} ${R} 0 0 1 ${x1} ${y1} Z`, lx, ly, color };
  });

  return (
    <View style={[styles.wheelWrap, { width: size, height: size }]}>
      <Animated.View style={{ transform: [{ rotate: spinAngle.interpolate({ inputRange: [0, 360], outputRange: ['0deg', '360deg'], extrapolate: 'extend' }) }] }}>
        <Svg width={size} height={size}>
          {/* جسم العجلة — ماهوجني */}
          <Circle cx={CX} cy={CY} r={R + size * 0.03} fill="#2A1E12" />
          <Circle cx={CX} cy={CY} r={R + size * 0.012} fill={COLORS.railDark} />
          {sectors.map((s, i) => (
            <G key={i}>
              <Path d={s.d} fill={CELL_COLOR[s.color]} stroke="rgba(201,169,97,0.30)" strokeWidth={size * 0.0024} />
              <SvgText
                x={s.lx}
                y={s.ly}
                fill={s.color === 'black' ? '#F2EFE9' : '#fff'}
                fontSize={size * 0.032}
                fontWeight="700"
                textAnchor="middle"
                alignmentBaseline="central"
              >
                {s.num}
              </SvgText>
            </G>
          ))}
          {/* الفواصل الذهبية */}
          <Circle cx={CX} cy={CY} r={R} fill="none" stroke="#C9A961" strokeWidth={size * 0.008} />
          <Circle cx={CX} cy={CY} r={R * 0.42} fill="#1B2230" stroke="#C9A961" strokeWidth={size * 0.01} />
          <Circle cx={CX} cy={CY} r={R * 0.42} fill="none" stroke="rgba(201,169,97,0.35)" strokeWidth={size * 0.004} strokeDasharray="4 4" />
        </Svg>
      </Animated.View>

      {/* المؤشر الثابت (كرة) */}
      <View style={styles.pointer} pointerEvents="none">
        <View style={styles.pointerBall} />
      </View>
    </View>
  );
}

// ===== بيدق الشطرنج الذهبي — يُوضع على الرقم الفائز =====
function PawnMarker({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 26">
      {/* الرأس */}
      <Circle cx={12} cy={6} r={4.4} fill="#E3C98A" stroke="#14100A" strokeWidth={0.9} />
      {/* الطوق */}
      <Ellipse cx={12} cy={10.6} rx={4.8} ry={1.7} fill="#C9A961" stroke="#14100A" strokeWidth={0.9} />
      {/* الجسم المتدرج نحو القاعدة */}
      <Path d="M7.2 10.4 L16.8 10.4 L19 20.4 L5 20.4 Z" fill="#C9A961" stroke="#14100A" strokeWidth={0.9} />
      {/* القاعدة */}
      <Rect x={5} y={20.2} width={14} height={3.2} rx={1.6} fill="#8C6D2F" stroke="#14100A" strokeWidth={0.9} />
      {/* لمعة ضوئية */}
      <Circle cx={10} cy={4.6} r={1.4} fill="#ffffff" opacity={0.6} />
    </Svg>
  );
}

// ===== خلية رهان =====
function BetCell({
  label,
  numbers,
  type,
  color,
  flex,
  height,
  onPress,
  total,
  crowned = false,
  others = 0,
}: {
  label: string;
  numbers: number[];
  type: RouletteBetType;
  color: string;
  flex?: number;
  height?: number;
  onPress: (type: RouletteBetType, numbers: number[]) => void;
  total: number;
  crowned?: boolean;
  /** إجمالي رهانات بقية اللاعبين على هذه الخلية */
  others?: number;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Animated.View style={[{ flex: flex ?? 1, height: height ?? 54 }, { transform: [{ scale }] }]}>
      <Pressable
        style={[styles.cell, { backgroundColor: color }]}
        onPress={() => {
          Animated.sequence([
            Animated.timing(scale, { toValue: 0.88, duration: 80, useNativeDriver: true }),
            Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 40, bounciness: 8 }),
          ]).start();
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          onPress(type, numbers);
        }}
      >
        {crowned && (
          <View style={styles.cellCrown} pointerEvents="none">
            <PawnMarker size={20} />
          </View>
        )}
        <Text style={[styles.cellText, color === CELL_COLOR.black && { color: '#F2EFE9' }]}>{label}</Text>
        {total > 0 && <View style={styles.cellChip}><Text style={styles.cellChipText}>{total}</Text></View>}
        {others > 0 && (
          <View style={styles.cellOthers} pointerEvents="none">
            <Text style={styles.cellOthersText}>+{others >= 1000 ? `${Math.round(others / 1000)}K` : others}</Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

export default function RouletteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [helpOpen, setHelpOpen] = useState(false);

  const MIN_BET = id === '3' ? 200 : id === '2' ? 50 : 10;
  const TABLE_CHIPS = [MIN_BET, MIN_BET * 2, MIN_BET * 5, MIN_BET * 10];
  const [chip, setChip] = useState(MIN_BET);
  const { showError, errorNode } = useErrorToast();
  const [spinning, setSpinning] = useState(false);
  // إغلاق يدوي لنافذة القرص (تظهر تلقائيًا في الدورة القادمة)
  const [wheelDismissedAt, setWheelDismissedAt] = useState(0);
  const spinAngle = useRef(new Animated.Value(0)).current;
  const lastResultRef = useRef<number | null>(null);
  const lastRoundRef = useRef(0);
  // إجمالي زاوية الدوران المتراكمة — نضمن إضافة لفات كاملة كل جولة
  const rotationRef = useRef(0);
  // حركة لافتة الرقم الفائز
  const resultPop = useRef(new Animated.Value(0)).current;
  // الكرة: زاوية الدوران (عكس العجلة) + نصف القطر (من الخارج للداخل)
  const ballOrbit = useRef(new Animated.Value(0)).current;
  const ballRadius = useRef(new Animated.Value(BALL_START)).current;

  // ===== المحرك على السيرفر =====
  const { snapshot, sendAction, players, isMuted, toggleMute, rouletteRoom, countdown, othersBets, winners } = useSoloGame('roulette', `ro-${id ?? '1'}`, showError);

  const EMPTY_SNAP: RouletteSnapshot = {
    phase: 'BETTING',
    balance: 10000,
    totalBet: 0,
    bets: [],
    winningNumber: null,
    history: [],
    roundNumber: 0,
    result: null,
  };
  const snap: RouletteSnapshot = (snapshot as RouletteSnapshot) ?? EMPTY_SNAP;

  const roomBetting = rouletteRoom ? rouletteRoom.phase === 'betting' : snap.phase === 'BETTING';
  const place = (type: RouletteBetType, numbers: number[]) => {
    if (spinning || !roomBetting) return;
    sendAction('placeBet', { type, numbers, amount: chip });
  };

  const clear = () => sendAction('clearBets');


  // عند وصول النتيجة من السيرفر: حرّك العجلة إلى القطاع الفائز
  useEffect(() => {
    const num = snap.result?.winningNumber ?? null;
    if (num === null) return;
    if (num === lastResultRef.current && snap.roundNumber === lastRoundRef.current) return;
    lastResultRef.current = num;
    lastRoundRef.current = snap.roundNumber;

    const idx = EUROPEAN_WHEEL.indexOf(num);
    const sectorMid = idx * (360 / 37) + 360 / 74;
    // الزاوية النهائية المطلوبة للقطاع تحت المؤشر (مقيّمة 0..360)
    const targetMod = (((360 - sectorMid + 90) % 360) + 360) % 360;

    // ننطلق من آخر موضع تراكمي لضمان لفات كاملة إضافية كل مرة
    const current = rotationRef.current;
    const currentMod = ((current % 360) + 360) % 360;
    const delta = (targetMod - currentMod + 360) % 360;
    const toValue = current + 5 * 360 + delta;
    rotationRef.current = toValue;

    setSpinning(true);
    Animated.parallel([
      Animated.timing(spinAngle, {
        toValue,
        duration: 4800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(ballOrbit, {
        toValue: -6 * 360,
        duration: 4800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(ballRadius, {
        toValue: BALL_END,
        duration: 4800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      setSpinning(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snap.result?.winningNumber, snap.roundNumber]);

  // ظهور لافتة الرقم الفائز بعد استقرار الكرة
  useEffect(() => {
    if (snap.result && !spinning) {
      resultPop.setValue(0);
      Animated.spring(resultPop, { toValue: 1, useNativeDriver: true, speed: 18, bounciness: 8 }).start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snap.result?.winningNumber, spinning]);

  // ===== حساب إجمالي كل خلية (للعرض: رهاناتي + رهانات الآخرين) =====
  const sameNumbers = (a: number[], b: number[]) =>
    JSON.stringify([...a].sort((x, y) => x - y)) === JSON.stringify([...b].sort((x, y) => x - y));
  const cellTotal = (type: RouletteBetType, numbers: number[]) =>
    snap.bets
      .filter((b) => b.type === type && sameNumbers(b.numbers, numbers))
      .reduce((s, b) => s + b.amount, 0);
  // إجمالي رهانات بقية اللاعبين على نفس الخلية (لإظهارها على الطاولة)
  const othersOn = (type: RouletteBetType, numbers: number[]) => {
    let sum = 0;
    for (const p of othersBets) {
      for (const b of p.bets) {
        if (b.type === type && sameNumbers(b.numbers, numbers)) sum += b.amount;
      }
    }
    return sum;
  };

  const isBETTING = snap.phase === 'BETTING';
  const res = snap.result;

  // القرص يظهر خلال دوران/نتيجة الغرفة المشتركة (إلا إذا أُغلق يدويًا هذه الدورة)
  const showOverlay = rouletteRoom?.phase === 'spinning' || rouletteRoom?.phase === 'result';
  const wheelVisible = showOverlay && (rouletteRoom?.endsAt ?? Infinity) > wheelDismissedAt;

  // ===== لحظة الفوز السينمائية =====
  const roWin =
    res && res.netWin > 0 && snap.phase === 'SETTLED'
      ? {
          key: `ro-${snap.roundNumber}`,
          magnitude: (res.netWin >= 1000 ? 3 : 2) as 1 | 2 | 3,
        }
      : null;

  // عدّاد رصيد متدحرج
  const balanceDisplay = useCountUp(Math.round(snap.balance));

  // صفوف الأرقام: 12 صفًا × 3 أعمدة (1-36)
  const rows = Array.from({ length: 12 }, (_, r) => [r * 3 + 1, r * 3 + 2, r * 3 + 3]);

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#10151E', '#0A0D12', '#070A0F']} style={StyleSheet.absoluteFill} />

      {/* ===== الترويسة الموحدة ===== */}
      <View style={{ paddingTop: insets.top + SPACING.xs }}>
        <GameHeader title="الروليت" onBack={() => router.back()} onInfo={() => setHelpOpen(true)} live muted={isMuted} onToggleMute={toggleMute} />
        <View style={{ paddingHorizontal: SPACING.lg, marginBottom: SPACING.xs }}>
          <SoloTableBar players={players} isMuted={isMuted} onToggleMute={toggleMute} />
        </View>
        {/* ثلاث طاولات حسب الحد الأدنى للرهان */}
        <View style={styles.stakeRow}>
          {[
            { tid: '1', label: 'منخفضة', min: 10 },
            { tid: '2', label: 'متوسطة', min: 50 },
            { tid: '3', label: 'عالية', min: 200 },
          ].map((t) => {
            const active = (id ?? '1') === t.tid;
            return (
              <Pressable
                key={t.tid}
                onPress={() => router.push(`/(app)/roulette/${t.tid}` as never)}
                style={[styles.stakeTab, active && styles.stakeTabActive]}
              >
                <Text style={[styles.stakeTabText, active && styles.stakeTabTextActive]}>
                  {t.label} {t.min}+
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* عدّاد الدورة المشتركة */}
        {rouletteRoom?.phase === 'betting' && (
          <Text style={styles.countdownText}>
            ⏱️ {countdown !== null ? `أغلق رهاناتك — ${countdown}` : 'نافذة الرهان مفتوحة'}
          </Text>
        )}
        {rouletteRoom?.phase === 'spinning' && <Text style={styles.spinNotice}>🎡 العجلة تدور…</Text>}
        {rouletteRoom?.phase === 'result' && winners && (
          <Text style={styles.winnersLine}>
            🏆 الرقم {winners.number} —{' '}
            {winners.winners.length > 0
              ? winners.winners.slice(0, 3).map((w) => `${w.name} +${formatCompact(w.netWin)}`).join(' · ') +
                (winners.winners.length > 3 ? ` وآخرون (${winners.winners.length})` : '')
              : 'لا فائزين هذه الدورة'}
          </Text>
        )}

        <Text style={styles.phaseText}>
          {spinning ? 'العجلة تدور…' : roomBetting ? 'ضع رهاناتك' : 'انتهت الجولة'}
        </Text>
      </View>

      {/* ===== النافذة السينمائية للقرص — العنصر الأساسي الوحيد عند الدوران ===== */}
      {wheelVisible && (
        <View style={styles.wheelOverlay}>
          <LinearGradient colors={['rgba(7,10,15,0.97)', 'rgba(10,13,18,0.99)']} style={StyleSheet.absoluteFill} />

          {/* الرصيد والسجل أعلى النافذة */}
          <View style={styles.overlayTopRow}>
            <View style={[styles.glassPill, styles.pillStatic]}>
              <Text style={styles.pillLabel}>الرصيد</Text>
              <Text style={styles.pillValue}>{formatCompact(balanceDisplay)}</Text>
            </View>
            <View style={[styles.glassPill, styles.pillStatic]}>
              <Text style={styles.pillLabel}>آخر الأرقام</Text>
              <View style={styles.historyRow}>
                {snap.history.slice(0, 6).map((n, i) => (
                  <View key={i} style={[styles.historyBall, { backgroundColor: CELL_COLOR[numberColor(n)] }]}>
                    <Text style={styles.historyBallText}>{n}</Text>
                  </View>
                ))}
                {snap.history.length === 0 && <Text style={styles.pillLabel}>—</Text>}
              </View>
            </View>
          </View>

          {/* القرص في مركز الشاشة */}
          <View style={styles.wheelStage}>
            <Wheel spinAngle={spinAngle} size={WHEEL_SIZE} />

            {/* الكرة — تدور عكس العجلة وتستقر في المسار الداخلي */}
            <Animated.View
              pointerEvents="none"
              style={[
                styles.ballOrbit,
                {
                  transform: [
                    { rotate: ballOrbit.interpolate({ inputRange: [-2160, 0], outputRange: ['-2160deg', '0deg'], extrapolate: 'extend' }) },
                    { translateX: ballRadius },
                  ],
                },
              ]}
            >
              <View style={styles.rouletteBall} />
            </Animated.View>

            {!!res && !spinning && (
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.winBanner,
                  {
                    opacity: resultPop,
                    transform: [{ scale: resultPop.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }],
                  },
                ]}
              >
                <CrownIcon size={22} color={COLORS.goldLight} />
                <Text style={styles.winBannerText}>الرقم الفائز</Text>
                <Text style={styles.winBannerNumber}>{res.winningNumber}</Text>
              </Animated.View>
            )}
          </View>

          {spinning ? (
            <Text style={styles.spinningLabel}>العجلة تدور…</Text>
          ) : !!res ? (
            <View style={styles.overlayResult}>
              <Text style={styles.resultText}>
                {res.netWin >= 0 ? 'ربحت ' : 'خسرت '}
                <Text style={res.netWin >= 0 ? styles.resultWin : styles.resultLoss}>
                  {formatCompact(Math.abs(res.netWin))}
                </Text>
              </Text>
              <GoldButton title="متابعة" onPress={() => setWheelDismissedAt(Date.now())} />
            </View>
          ) : null}
        </View>
      )}

      {/* ===== طاولة الرهان — الشاشة كلها لها أثناء الرهان ===== */}
      <View style={styles.betPanel}>
        {/* شريط علوي مضغوط: الرصيد + السجل + تلميح */}
        <View style={styles.tableTopBar}>
          <View style={[styles.glassPill, styles.pillStatic]}>
            <Text style={styles.pillLabel}>الرصيد</Text>
            <Text style={styles.pillValue}>{formatCompact(balanceDisplay)}</Text>
          </View>
          {isBETTING && snap.totalBet === 0 && (
            <Text style={styles.hintTextInline}>اختر شريحة ثم اضغط على الطاولة لوضع رهانك</Text>
          )}
          <View style={[styles.glassPill, styles.pillStatic]}>
            <Text style={styles.pillLabel}>آخر الأرقام</Text>
            <View style={styles.historyRow}>
              {snap.history.slice(0, 6).map((n, i) => (
                <View key={i} style={[styles.historyBall, { backgroundColor: CELL_COLOR[numberColor(n)] }]}>
                  <Text style={styles.historyBallText}>{n}</Text>
                </View>
              ))}
              {snap.history.length === 0 && <Text style={styles.pillLabel}>—</Text>}
            </View>
          </View>
        </View>

        {/* سطح الطاولة ثلاثي الأبعاد */}
        <View style={styles.table3d}>
          <LinearGradient colors={['#0E4635', '#0A3D2E', '#02150F']} style={StyleSheet.absoluteFill} />
          <LinearGradient
            colors={['rgba(255,255,255,0.18)', 'rgba(255,255,255,0)']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 0.32 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <ScrollView contentContainerStyle={styles.gridWrap} showsVerticalScrollIndicator={false}>
          {/* صف الأصفار + أول صف */}
          <View style={styles.gridRow}>
            <BetCell label="0" numbers={[0]} type="straight" color={CELL_COLOR.green} height={120} flex={0.9} onPress={place} total={cellTotal('straight', [0])} others={othersOn('straight', [0])} crowned={!!res && res.winningNumber === 0} />
            <View style={styles.gridCol}>
              {rows.map((row, ri) => (
                <View key={ri} style={styles.gridRow}>
                  {row.map((n) => (
                    <BetCell key={n} label={String(n)} numbers={[n]} type="straight" color={CELL_COLOR[numberColor(n)]} onPress={place} total={cellTotal('straight', [n])} others={othersOn('straight', [n])} crowned={!!res && res.winningNumber === n} />
                  ))}
                </View>
              ))}
            </View>
            {/* أعمدة 2:1 */}
            <View style={styles.gridCol}>
              {[3, 2, 1].map((col) => {
                const nums = Array.from({ length: 12 }, (_, i) => col + i * 3);
                return (
                  <BetCell key={col} label={`2:1`} numbers={nums} type="column" color="#1B2230" height={54} onPress={place} total={cellTotal('column', nums)} others={othersOn('column', nums)} />
                );
              })}
            </View>
          </View>

          {/* الدزينات */}
          <View style={styles.gridRow}>
            {[
              ['1st 12', Array.from({ length: 12 }, (_, i) => i + 1)],
              ['2nd 12', Array.from({ length: 12 }, (_, i) => i + 13)],
              ['3rd 12', Array.from({ length: 12 }, (_, i) => i + 25)],
            ].map(([label, nums]) => (
              <BetCell key={String(label)} label={String(label)} numbers={nums as number[]} type="dozen" color="#1B2230" height={54} onPress={place} total={cellTotal('dozen', nums as number[])} others={othersOn('dozen', nums as number[])} />
            ))}
          </View>

          {/* الرهانات المتساوية */}
          <View style={styles.gridRow}>
            {(
              [
                ['1-18', 'low'],
                ['زوجي', 'even'],
                ['أحمر', 'red'],
                ['أسود', 'black'],
                ['فردي', 'odd'],
                ['19-36', 'high'],
              ] as [string, RouletteBetType][]
            ).map(([label, type]) => (
              <BetCell key={type} label={label} numbers={[]} type={type} color={type === 'red' ? CELL_COLOR.red : '#1B2230'} height={54} onPress={place} total={cellTotal(type, [])} others={othersOn(type, [])} />
            ))}
          </View>
          </ScrollView>
        </View>

        {/* صينية الرقاقات */}
        <View style={styles.trayRow}>
          <View style={styles.totalBox}>
            <Text style={styles.totalLabel}>إجمالي الرهان</Text>
            <Text style={styles.totalValue}>{snap.totalBet}</Text>
          </View>
          {TABLE_CHIPS.map((v) => (
            <Pressable
              key={v}
              onPress={() => {
                setChip(v);
                Haptics.selectionAsync().catch(() => {});
              }}
              style={[styles.chipCircle, chip === v && styles.chipActive]}
            >
              <Text style={styles.chipValue}>{v}</Text>
            </Pressable>
          ))}
          <Pressable style={styles.clearBtn} onPress={clear} disabled={snap.totalBet === 0}>
            <Text style={[styles.clearText, snap.totalBet === 0 && { opacity: 0.4 }]}>مسح</Text>
          </Pressable>
        </View>

        {/* حالة الدورة المشتركة — الدوران تلقائي كل ٣٠ ثانية */}
        <View style={styles.actionRow}>
          {rouletteRoom?.phase === 'betting' ? (
            <Text style={styles.autoText}>⚙️ الدوران تلقائي — الرهان يُغلق مع انتهاء العداد</Text>
          ) : (
            <>
              {!!res && (
                <View style={styles.resultRow}>
                  <Text style={styles.resultText}>
                    الرقم الفائز: <Text style={styles.resultNumber}>{res.winningNumber}</Text>
                    {'  '}·{'  '}
                    {res.netWin >= 0 ? 'ربحت ' : 'خسرت '}
                    <Text style={res.netWin >= 0 ? styles.resultWin : styles.resultLoss}>{formatCompact(Math.abs(res.netWin))}</Text>
                  </Text>
                </View>
              )}
              {rouletteRoom?.phase === 'result' && <Text style={styles.autoText}>جولة جديدة خلال ثوانٍ…</Text>}
            </>
          )}
        </View>
      </View>

      {/* لحظة الفوز */}
      <WinFX trigger={roWin} />

      {/* ===== رسالة الخطأ الموحدة ===== */}
      {errorNode}

      <InstructionsModal game="roulette" visible={helpOpen} onClose={() => setHelpOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },


  headerSide: { flexDirection: 'row-reverse', alignItems: 'center', gap: SPACING.sm },
  headerCenter: { alignItems: 'center', flex: 1 },
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

  // ===== النافذة السينمائية للقرص =====
  wheelOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayTopRow: {
    position: 'absolute',
    top: SPACING.xxl,
    left: SPACING.lg,
    right: SPACING.lg,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 42,
  },
  wheelStage: {
    width: WHEEL_SIZE,
    height: WHEEL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinningLabel: {
    position: 'absolute',
    bottom: SPACING.xxl + 24,
    fontFamily: FONTS.ar.semibold,
    fontSize: TYPE.body.fontSize,
    color: COLORS.goldLight,
    letterSpacing: 1,
  },
  overlayResult: {
    position: 'absolute',
    bottom: SPACING.xxl,
    alignItems: 'center',
    gap: SPACING.md,
  },

  // ===== شريط الطاولة العلوي =====
  tableTopBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.sm,
    paddingBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  hintTextInline: {
    flex: 1,
    fontFamily: FONTS.ar.regular,
    fontSize: TYPE.caption.fontSize,
    color: COLORS.textFaint,
    textAlign: 'center',
  },

  wheelWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointer: {
    position: 'absolute',
    top: -2,
    alignSelf: 'center',
    zIndex: 5,
  },
  ballOrbit: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 20,
    height: 20,
    marginLeft: -10,
    marginTop: -10,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 6,
  },
  rouletteBall: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.45)',
    shadowColor: '#ffffff',
    shadowOpacity: 0.9,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 9,
  },
  pointerBall: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.goldLight,
    borderWidth: 2,
    borderColor: '#fff',
    ...SHADOWS.gold,
  },
  glassPill: {
    zIndex: 6,
    backgroundColor: 'rgba(21,27,38,0.75)',
    borderWidth: 1,
    borderColor: 'rgba(201,169,97,0.35)',
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  pillStatic: {
    alignItems: 'center',
    gap: 2,
  },
  pillLabel: {
    fontFamily: FONTS.ar.regular,
    fontSize: TYPE.micro.fontSize,
    color: COLORS.textFaint,
  },
  pillValue: {
    fontFamily: FONTS.num.bold,
    fontSize: TYPE.h3.fontSize,
    color: COLORS.goldLight,
  },
  historyRow: { flexDirection: 'row', gap: 3 },
  historyBall: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  historyBallText: {
    fontFamily: FONTS.num.bold,
    fontSize: 9,
    color: '#fff',
  },
  betPanel: {
    flex: 1,
    overflow: 'hidden',
    padding: 6,
    backgroundColor: COLORS.rail,
    borderTopWidth: 1,
    borderTopColor: 'rgba(58,42,25,0.7)',
  },
  table3d: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.55)',
    transform: [{ perspective: 1000 }, { rotateX: '12deg' }],
    ...SHADOWS.e2,
  },
  gridWrap: {
    padding: SPACING.sm,
    gap: 4,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 4,
  },
  gridCol: {
    flex: 1,
    flexDirection: 'column',
    gap: 4,
  },
  cell: {
    flex: 1,
    height: 40,
    borderRadius: RADIUS.xs,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(201,169,97,0.22)',
    borderTopWidth: 1.5,
    borderTopColor: 'rgba(255,255,255,0.35)',
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(0,0,0,0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 4,
    position: 'relative',
  },
  cellText: {
    fontFamily: FONTS.num.semibold,
    fontSize: 15,
    color: '#fff',
    includeFontPadding: false,
  },
  cellCrown: {
    position: 'absolute',
    top: -14,
    alignSelf: 'center',
    zIndex: 3,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
    elevation: 5,
  },
  cellChip: {
    position: 'absolute',
    bottom: 3,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(201,169,97,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#fff',
  },
  cellChipText: {
    fontFamily: FONTS.num.bold,
    fontSize: 8,
    color: COLORS.onGold,
  },

  trayRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  totalBox: {
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  totalLabel: {
    fontFamily: FONTS.ar.regular,
    fontSize: TYPE.micro.fontSize,
    color: 'rgba(218,226,253,0.6)',
  },
  totalValue: {
    fontFamily: FONTS.num.bold,
    fontSize: TYPE.h3.fontSize,
    color: COLORS.goldLight,
  },
  chipCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1B2230',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.goldRim,
    ...SHADOWS.e1,
  },
  chipActive: {
    borderColor: COLORS.goldLight,
    ...SHADOWS.gold,
    transform: [{ scale: 1.12 }],
  },
  chipValue: {
    fontFamily: FONTS.num.bold,
    fontSize: TYPE.small.fontSize,
    color: '#fff',
  },
  clearBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
  },
  clearText: {
    fontFamily: FONTS.ar.medium,
    fontSize: TYPE.caption.fontSize,
    color: COLORS.textDim,
  },

  actionRow: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    gap: SPACING.sm,
  },
  resultRow: {
    alignItems: 'center',
    paddingBottom: SPACING.sm,
  },
  resultText: {
    fontFamily: FONTS.ar.semibold,
    fontSize: TYPE.body.fontSize,
    color: COLORS.text,
  },
  resultNumber: {
    fontFamily: FONTS.num.black,
    fontSize: TYPE.h2.fontSize,
    color: COLORS.goldLight,
  },
  resultWin: {
    fontFamily: FONTS.num.bold,
    color: '#7ee2b8',
  },
  resultLoss: {
    fontFamily: FONTS.num.bold,
    color: '#ff9488',
  },

  winBanner: {
    position: 'absolute',
    alignSelf: 'center',
    top: '34%',
    zIndex: 8,
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(10,13,18,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(201,169,97,0.6)',
    ...SHADOWS.gold,
  },
  winBannerText: {
    fontFamily: FONTS.ar.semibold,
    fontSize: TYPE.caption.fontSize,
    color: COLORS.goldLight,
  },
  winBannerNumber: {
    fontFamily: 'Cairo-Black',
    fontSize: TYPE.h1.fontSize,
    color: '#fff',
  },


  toastText: {
    fontFamily: FONTS.ar.semibold,
    fontSize: TYPE.small.fontSize,
    color: '#FFFFFF',
  },

  stakeRow: {
    flexDirection: 'row-reverse',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.xs,
  },
  stakeTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  stakeTabActive: {
    borderColor: COLORS.gold,
    backgroundColor: 'rgba(201,169,97,0.10)',
  },
  stakeTabText: {
    fontFamily: FONTS.ar.medium,
    fontSize: TYPE.caption.fontSize,
    color: COLORS.textDim,
  },
  stakeTabTextActive: {
    color: COLORS.goldLight,
  },
  countdownText: {
    fontFamily: FONTS.num.bold,
    fontSize: TYPE.body.fontSize,
    color: COLORS.goldLight,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
  spinNotice: {
    fontFamily: FONTS.ar.bold,
    fontSize: TYPE.body.fontSize,
    color: COLORS.goldLight,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
  winnersLine: {
    fontFamily: FONTS.ar.medium,
    fontSize: TYPE.caption.fontSize,
    color: COLORS.emerald,
    textAlign: 'center',
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.lg,
  },
  autoText: {
    fontFamily: FONTS.ar.regular,
    fontSize: TYPE.small.fontSize,
    color: COLORS.textDim,
    textAlign: 'center',
  },
  cellOthers: {
    position: 'absolute',
    bottom: 3,
    right: 3,
    backgroundColor: 'rgba(201,169,97,0.92)',
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  cellOthersText: {
    fontFamily: FONTS.num.bold,
    fontSize: 9,
    color: '#1A1206',
  },
});
