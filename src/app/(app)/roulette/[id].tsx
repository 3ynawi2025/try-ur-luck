// ============================================================
// جرب حظك — الروليت (ضد العجلة — لاعب واحد)
// تصميم Midnight Royale: عجلة ذهبية/ماهوجني + جوخ زمردي + رقاقات لامعة
// ============================================================

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, ScrollView, Easing, useWindowDimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Svg, { G, Circle, Path, Ellipse, Rect, Text as SvgText } from 'react-native-svg';
import GoldButton from '../../../components/ui/GoldButton';
import InstructionsModal from '../../../components/game/InstructionsModal';
import GameHeader from '../../../components/game/GameHeader';
import SoloTableBar from '../../../components/game/SoloTableBar';
import { CrownIcon } from '../../../components/icons/GameIcons';
import { useErrorToast } from '../../../hooks/useErrorToast';
import { useCountUp } from '../../../hooks/useCountUp';
import { useLandscapeLock } from '../../../hooks/useOrientationLock';
import { sfx } from '../../../lib/sounds';
import {
  RouletteSnapshot,
  RouletteBetType,
  EUROPEAN_WHEEL,
  numberColor,
  wheelNeighbors,
  VOISINS_DU_ZERO,
  TIERS_DU_CYLINDRE,
  ORPHELINS,
  JEU_ZERO,
  type CallBetUnit,
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


// حجم القرص الأساسي في النافذة السينمائية (عرض التصميم 390) — يُضبط تلقائيًا حسب عرض الشاشة
const WHEEL_SIZE = 300;

const CELL_COLOR: Record<string, string> = {
  red: COLORS.crimsonContainer,
  black: '#1B2230',
  green: COLORS.emeraldContainer,
};

// ===== أوضاع الرهان الإضافية =====
type BetMode = 'straight' | 'split' | 'trio' | 'street' | 'corner' | 'sixline' | 'neighbors';

const rowOf = (n: number) => Math.ceil(n / 3);
const colOf = (n: number) => ((n - 1) % 3) + 1;
const rowNumbers = (r: number) => [r * 3 - 2, r * 3 - 1, r * 3];
const pairRows = (r1: number, r2: number) => [...rowNumbers(r1), ...rowNumbers(r2)];

/** خيارات الرهان القانونية للرقم n حسب الوضع المختار */
function candidatesFor(mode: BetMode, n: number): number[][] {
  switch (mode) {
    case 'straight':
      return [[n]];
    case 'split': {
      if (n === 0) return [[0, 1], [0, 2], [0, 3]];
      const out: number[][] = [];
      if (colOf(n) !== 3) out.push([n, n + 1]);
      if (colOf(n) !== 1) out.push([n, n - 1]);
      if (rowOf(n) <= 11) out.push([n, n + 3]);
      if (rowOf(n) >= 2) out.push([n, n - 3]);
      if (n === 1) out.push([0, 1]);
      if (n === 2) out.push([0, 2]);
      if (n === 3) out.push([0, 3]);
      return out;
    }
    case 'trio': {
      if (n === 0) return [[0, 1, 2], [0, 2, 3]];
      if (n === 1) return [[0, 1, 2]];
      if (n === 2) return [[0, 1, 2], [0, 2, 3]];
      if (n === 3) return [[0, 2, 3]];
      return [];
    }
    case 'street':
      return n === 0 ? [] : [rowNumbers(rowOf(n))];
    case 'corner': {
      if (n === 0) return [[0, 1, 2, 3]];
      const out: number[][] = [];
      if (colOf(n) <= 2 && rowOf(n) <= 11) out.push([n, n + 1, n + 3, n + 4]);
      if (colOf(n) >= 2 && rowOf(n) <= 11) out.push([n - 1, n, n + 2, n + 3]);
      if (colOf(n) <= 2 && rowOf(n) >= 2) out.push([n - 3, n - 2, n, n + 1]);
      if (colOf(n) >= 2 && rowOf(n) >= 2) out.push([n - 4, n - 3, n - 1, n]);
      return out;
    }
    case 'sixline': {
      const r = rowOf(n);
      const out: number[][] = [];
      if (r >= 2) out.push(pairRows(r - 1, r));
      if (r <= 11) out.push(pairRows(r, r + 1));
      return out;
    }
    case 'neighbors':
      return [wheelNeighbors(n, 2)];
    default:
      return [];
  }
}

const MODE_LABELS: { key: BetMode; label: string }[] = [
  { key: 'straight', label: 'رقم' },
  { key: 'split', label: 'رقمان' },
  { key: 'trio', label: 'ثلاثي' },
  { key: 'street', label: 'صف' },
  { key: 'corner', label: 'مربع' },
  { key: 'sixline', label: 'ستة' },
  { key: 'neighbors', label: 'جيران' },
];

const CALL_BETS: { label: string; units: CallBetUnit[]; hint: string }[] = [
  { label: 'جيران الصفر', units: VOISINS_DU_ZERO, hint: '17 رقمًا — 9 رقائق' },
  { label: 'ثلث العجلة', units: TIERS_DU_CYLINDRE, hint: '12 رقمًا — 6 رقائق' },
  { label: 'الأيتام', units: ORPHELINS, hint: '8 أرقام — 5 رقائق' },
  { label: 'لعبة الصفر', units: JEU_ZERO, hint: '7 أرقام — 4 رقائق' },
];

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
  suggested = false,
  isAnchor = false,
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
  /** خلية مقترحة لإتمام رهان مركّب (علامة ذهبية) */
  suggested?: boolean;
  /** خلية المرساة الحالية (الرقم المختار أولًا) */
  isAnchor?: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const glow = useRef(new Animated.Value(suggested ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(glow, {
      toValue: suggested ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [suggested, glow]);
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
        {suggested && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.cellSuggestGlow,
              {
                opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0, 0.9] }),
                transform: [{ scale: glow.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }],
              },
            ]}
          >
            <View style={styles.cellSuggestDot} />
          </Animated.View>
        )}
        {isAnchor && (
          <View style={styles.cellAnchorRing} pointerEvents="none">
            <View style={styles.cellAnchorDot} />
          </View>
        )}
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
  useLandscapeLock();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [helpOpen, setHelpOpen] = useState(false);

  // ===== تكبير/تصغير تلقائي حسب عرض الشاشة (عرض التصميم 390، حد أقصى 1.15) =====
  const { width, height } = useWindowDimensions();
  const landscape = width > height;
  const s = Math.min(width / 390, 1.15);
  const wheelSize = Math.round(WHEEL_SIZE * s);
  const ballStart = Math.round(118 * (wheelSize / 260));
  const ballEnd = Math.round(78 * (wheelSize / 260));
  const cellH = Math.round(54 * s);
  const zeroH = Math.round(120 * s);
  const chipSize = Math.round(44 * s);

  // ===== أحجام مخصصة للوضع العرضي: خلايا أقصر وصينية مدمجة =====
  const lsCellH = 44;
  const lsZeroH = Math.round(44 * (120 / 54));
  const lsChip = 36;

  const MIN_BET = id === '3' ? 200 : id === '2' ? 50 : 10;
  const TABLE_CHIPS = [MIN_BET, MIN_BET * 2, MIN_BET * 5, MIN_BET * 10];
  const [chip, setChip] = useState(MIN_BET);
  const { showError, errorNode } = useErrorToast();
  const [spinning, setSpinning] = useState(false);
  // وضع الرهان: رقم / رقمان / ثلاثي / صف / مربع / ستة / جيران
  const [betMode, setBetMode] = useState<BetMode>('straight');
  // المرساة: الرقم المختار أولًا في الرهانات المركّبة — تُضيء مقترحاته على اللوحة
  const [anchor, setAnchor] = useState<{ mode: BetMode; n: number } | null>(null);
  // نافذة احتياطية فقط عند تعارض خيارين على نفس الخلية
  const [popupOpts, setPopupOpts] = useState<{ type: RouletteBetType; options: number[][] } | null>(null);
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
  const ballRadius = useRef(new Animated.Value(ballStart)).current;

  // ===== المحرك على السيرفر =====
  const { snapshot, sendAction, players, isMuted, toggleMute, rouletteRoom, countdown, othersBets, winners, autoRebet, leaveRoom, kickedReason, muteAllRemote, toggleMuteAllRemote, mutedRemoteUids, toggleRemoteMute, isRemoteMuted } = useSoloGame('roulette', `ro-${id ?? '1'}`, showError);

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
    sfx.chip();
    sendAction('placeBet', { type, numbers, amount: chip });
  };

  /**
   * ضغط خلية أرقام:
   * - وضع الرقم: رهان مباشر.
   * - وضع مركّب: أول ضغطة تعيّن المرساة وتُضيء مقترحاتها ذهبيًا على اللوحة،
   *   والضغطة الثانية على خلية مذهّبة تُنفّذ الرهان (أو نافذة صغيرة عند التعارض).
   * - الضغط على المرساة نفسها يلغي التحديد.
   */
  const handleCellPress = (n: number) => {
    if (spinning || !roomBetting) return;
    setPopupOpts(null);
    if (betMode === 'straight') {
      place('straight', [n]);
      return;
    }
    if (anchor) {
      // إلغاء عند الضغط على المرساة نفسها
      if (anchor.n === n && anchor.mode === betMode) {
        setAnchor(null);
        return;
      }
      const cands = candidatesFor(anchor.mode, anchor.n).filter((c) => c.includes(n));
      if (cands.length === 1) {
        place(anchor.mode, cands[0]);
        setAnchor(null);
        return;
      }
      if (cands.length > 1) {
        // تعارض نادر (مثل تقاطع مربعين) — نافذة اختيار صغيرة
        setPopupOpts({ type: anchor.mode, options: cands });
        return;
      }
      // خلية خارج المقترحات → انقل المرساة إليها
      setAnchor({ mode: betMode, n });
      return;
    }
    setAnchor({ mode: betMode, n });
  };

  /** خلايا المقترحات الذهبية لمرساة الرهان الحالية */
  const suggestedNumbers = (() => {
    if (!anchor) return new Set<number>();
    const set = new Set<number>();
    for (const c of candidatesFor(anchor.mode, anchor.n)) {
      for (const num of c) {
        if (num !== anchor.n) set.add(num);
      }
    }
    return set;
  })();

  /** الرهانات المعلنة الفرنسية — تُوضع كوحدات متعددة بقيمة الشريحة المختارة */
  const placeCallBet = (units: CallBetUnit[]) => {
    if (spinning || !roomBetting) return;
    setPopupOpts(null);
    setAnchor(null);
    for (const u of units) {
      for (let i = 0; i < u.multiplier; i++) {
        place(u.type, u.numbers);
      }
    }
  };

  const clear = () => sendAction('clearBets');

  // طرد بسبب الخمول (دقيقتان بلا نشاط) → رسالة ثم عودة للوبي
  useEffect(() => {
    if (!kickedReason) return;
    showError(kickedReason);
    const t = setTimeout(() => router.back(), 1500);
    return () => clearTimeout(t);
  }, [kickedReason, showError]);

  // خروج فوري من الطاولة: إيقاف اللعب والصوت ثم عودة للوبي
  const leaveTable = () => {
    leaveRoom();
    router.back();
  };


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
        toValue: ballEnd,
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

  // ===== الأصوات: دقات الكرة أثناء الدوران + نتيجة الرهان =====
  useEffect(() => {
    if (!spinning) return;
    const iv = setInterval(() => sfx.tick(), 270);
    return () => clearInterval(iv);
  }, [spinning]);

  const lastResultKeyRef = useRef<string | null>(null);
  useEffect(() => {
    const res = snap.result;
    if (!res || spinning) return;
    const key = `${snap.roundNumber}-${res.winningNumber}`;
    if (lastResultKeyRef.current === key) return;
    lastResultKeyRef.current = key;
    const t = setTimeout(() => {
      if (res.netWin > 0) sfx.win();
      else if (res.netWin < 0) sfx.lose();
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snap.result?.winningNumber, snap.roundNumber, spinning]);

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

  // عدّاد رصيد متدحرج
  const balanceDisplay = useCountUp(Math.round(snap.balance));

  // صفوف الأرقام: 12 صفًا × 3 أعمدة (1-36)
  const rows = Array.from({ length: 12 }, (_, r) => [r * 3 + 1, r * 3 + 2, r * 3 + 3]);

  /** شبكة الرهانات — تُستخدم في الوضع العرضي بارتفاع خلايا أقصر */
  const renderTableGrid = (cH: number, zH: number) => (
    <>
      {/* صف الأصفار + أول صف */}
      <View style={styles.gridRow}>
        <BetCell label="0" numbers={[0]} type="straight" color={CELL_COLOR.green} height={zH} flex={0.9} onPress={() => handleCellPress(0)} total={cellTotal('straight', [0])} others={othersOn('straight', [0])} crowned={!spinning && !!res && res.winningNumber === 0} suggested={suggestedNumbers.has(0)} isAnchor={anchor?.n === 0} />
        <View style={styles.gridCol}>
          {rows.map((row, ri) => (
            <View key={ri} style={styles.gridRow}>
              {row.map((n) => (
                <BetCell key={n} label={String(n)} numbers={[n]} type="straight" color={CELL_COLOR[numberColor(n)]} height={cH} onPress={() => handleCellPress(n)} total={cellTotal('straight', [n])} others={othersOn('straight', [n])} crowned={!spinning && !!res && res.winningNumber === n} suggested={suggestedNumbers.has(n)} isAnchor={anchor?.n === n} />
              ))}
            </View>
          ))}
        </View>
        {/* أعمدة 2:1 */}
        <View style={styles.gridCol}>
          {[3, 2, 1].map((col) => {
            const nums = Array.from({ length: 12 }, (_, i) => col + i * 3);
            return (
              <BetCell key={col} label={`2:1`} numbers={nums} type="column" color="#1B2230" height={cH} onPress={place} total={cellTotal('column', nums)} others={othersOn('column', nums)} />
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
          <BetCell key={String(label)} label={String(label)} numbers={nums as number[]} type="dozen" color="#1B2230" height={cH} onPress={place} total={cellTotal('dozen', nums as number[])} others={othersOn('dozen', nums as number[])} />
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
          <BetCell key={type} label={label} numbers={[]} type={type} color={type === 'red' ? CELL_COLOR.red : '#1B2230'} height={cH} onPress={place} total={cellTotal(type, [])} others={othersOn(type, [])} />
        ))}
      </View>

      {/* الرهانات المعلنة الفرنسية */}
      <View style={styles.callRow}>
        {CALL_BETS.map((c) => (
          <Pressable key={c.label} style={styles.callBtn} onPress={() => placeCallBet(c.units)}>
            <Text style={styles.callBtnLabel}>{c.label}</Text>
            <Text style={styles.callBtnHint}>{c.hint}</Text>
          </Pressable>
        ))}
      </View>
    </>
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#10151E', '#0A0D12', '#070A0F']} style={StyleSheet.absoluteFill} />

      {landscape ? (
        <View style={lsc.root}>
          {/* ===== الوضع العرضي — ترويسة مدمجة ===== */}
          <View style={{ paddingTop: insets.top }}>
            <GameHeader title="الروليت" onBack={() => router.back()} onInfo={() => setHelpOpen(true)} live muted={isMuted} onToggleMute={toggleMute} />
            <View style={lsc.subheader}>
              <View style={lsc.soloWrap}>
                <SoloTableBar
                  players={players}
                  isMuted={isMuted}
                  onToggleMute={toggleMute}
                  muteAllRemote={muteAllRemote}
                  onToggleMuteAllRemote={toggleMuteAllRemote}
                  mutedRemoteUids={mutedRemoteUids}
                  onToggleRemoteMute={toggleRemoteMute}
                  isRemoteMuted={isRemoteMuted}
                />
              </View>
              <View style={lsc.stakeRow}>
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
                      style={[lsc.stakeTab, active && lsc.stakeTabActive]}
                    >
                      <Text style={[lsc.stakeTabText, active && lsc.stakeTabTextActive]}>
                        {t.label} {t.min}+
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>

          {/* ===== لوحة الرهان — شبكة أعرض وكروم رأسي أقل ===== */}
          <View style={[styles.betPanel, lsc.betPanel]}>
            {/* شريط علوي مضغوط: الرصيد + السجل + حالة الجولة */}
            <View style={[styles.tableTopBar, lsc.tableTopBar]}>
              <View style={[styles.glassPill, styles.pillStatic, lsc.pill]}>
                <Text style={styles.pillLabel}>الرصيد</Text>
                <Text style={[styles.pillValue, lsc.pillValue]}>{formatCompact(balanceDisplay)}</Text>
              </View>
              <View style={[styles.glassPill, styles.pillStatic, lsc.pill]}>
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
              <View style={lsc.topStatus}>
                {rouletteRoom?.phase === 'betting' ? (
                  <>
                    <Text style={lsc.statusLine} numberOfLines={1}>
                      ⏱️ {countdown !== null ? `أغلق رهاناتك — ${countdown}` : 'نافذة الرهان مفتوحة'}
                    </Text>
                    <Text style={lsc.statusSub} numberOfLines={1}>⚙️ الدوران تلقائي — الرهان يُغلق مع انتهاء العداد</Text>
                  </>
                ) : rouletteRoom?.phase === 'spinning' ? (
                  <Text style={lsc.statusLine} numberOfLines={1}>🎡 العجلة تدور…</Text>
                ) : (
                  <>
                    {!spinning && !!res && (
                      <Text style={lsc.statusLine} numberOfLines={1}>
                        الرقم الفائز: {res.winningNumber} · {res.netWin >= 0 ? 'ربحت ' : 'خسرت '}{formatCompact(Math.abs(res.netWin))}
                      </Text>
                    )}
                    {rouletteRoom?.phase === 'result' && winners && (
                      <Text style={lsc.statusSub} numberOfLines={1}>
                        🏆 الرقم {winners.number} —{' '}
                        {winners.winners.length > 0
                          ? winners.winners.slice(0, 3).map((w) => `${w.name} +${formatCompact(w.netWin)}`).join(' · ') +
                            (winners.winners.length > 3 ? ` وآخرون (${winners.winners.length})` : '')
                          : 'لا فائزين هذه الدورة'}
                      </Text>
                    )}
                    {rouletteRoom?.phase === 'result' && <Text style={lsc.statusSub} numberOfLines={1}>جولة جديدة خلال ثوانٍ…</Text>}
                  </>
                )}
              </View>
            </View>

            {/* شريط أوضاع الرهان: رقم / رقمان / ثلاثي / صف / مربع / ستة / جيران */}
            <View style={[styles.modeRow, lsc.modeRow]}>
              {MODE_LABELS.map((m) => (
                <Pressable
                  key={m.key}
                  onPress={() => {
                    setBetMode(m.key);
                    setAnchor(null);
                    setPopupOpts(null);
                  }}
                  style={[styles.modeChip, betMode === m.key && styles.modeChipActive]}
                >
                  <Text style={[styles.modeChipText, betMode === m.key && styles.modeChipTextActive]}>
                    {m.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* تلميح المرساة: الخلايا المذهّبة تُكمل الرهان */}
            {anchor && !spinning && roomBetting && (
              <Text style={[styles.anchorHint, lsc.anchorHint]}>
                ✦ اضغط خلية مذهّبة لإتمام الرهان — أو اضغط الرقم المحدد للإلغاء
              </Text>
            )}

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
              <ScrollView contentContainerStyle={[styles.gridWrap, lsc.gridWrap]} showsVerticalScrollIndicator={false}>
                {renderTableGrid(lsCellH, lsZeroH)}
              </ScrollView>
            </View>

            {/* نافذة احتياطية صغيرة عند تعارض خيارين على نفس الخلية */}
            {popupOpts && !spinning && roomBetting && (
              <View style={styles.anchorOverlay}>
                <Text style={styles.anchorTitle}>اختر الرهان المطلوب</Text>
                <View style={styles.anchorOptions}>
                  {popupOpts.options.map((opt, i) => (
                    <Pressable
                      key={i}
                      style={styles.anchorChip}
                      onPress={() => {
                        place(popupOpts.type, opt);
                        setPopupOpts(null);
                        setAnchor(null);
                      }}
                    >
                      <Text style={styles.anchorChipText}>{[...opt].sort((a, b) => a - b).join(' · ')}</Text>
                    </Pressable>
                  ))}
                </View>
                <Pressable style={styles.anchorCancel} onPress={() => setPopupOpts(null)}>
                  <Text style={styles.anchorCancelText}>إلغاء</Text>
                </Pressable>
              </View>
            )}

            {/* شريط سفلي مدمج: الصينية + إعادة الرهان + الخروج */}
            <View style={lsc.bottomStrip}>
              <View style={styles.totalBox}>
                <Text style={styles.totalLabel}>إجمالي الرهان</Text>
                <Text style={[styles.totalValue, lsc.totalValue]}>{snap.totalBet}</Text>
              </View>
              {TABLE_CHIPS.map((v) => (
                <Pressable
                  key={v}
                  onPress={() => {
                    setChip(v);
                    Haptics.selectionAsync().catch(() => {});
                  }}
                  style={[
                    styles.chipCircle,
                    { width: lsChip, height: lsChip, borderRadius: Math.round(lsChip / 2) },
                    chip === v && styles.chipActive,
                  ]}
                >
                  <Text style={styles.chipValue}>{v}</Text>
                </Pressable>
              ))}
              <Pressable style={[styles.clearBtn, lsc.clearBtn]} onPress={clear} disabled={snap.totalBet === 0}>
                <Text style={[styles.clearText, snap.totalBet === 0 && { opacity: 0.4 }]}>مسح</Text>
              </Pressable>
              <Pressable
                style={[lsc.rebetBtnL, autoRebet && styles.rebetBtnFullActive]}
                onPress={() => sendAction('autoRebet', { enabled: !autoRebet })}
              >
                <Text style={[styles.rebetText, autoRebet && styles.rebetTextActive]}>
                  🔄 إعادة الرهان تلقائيًا{autoRebet ? ' ✓' : ''}
                </Text>
              </Pressable>
              <Pressable style={lsc.leaveBtnL} onPress={leaveTable}>
                <Text style={styles.leaveText}>🚪 خروج من الطاولة</Text>
              </Pressable>
            </View>
          </View>

          {/* ===== النافذة السينمائية للقرص — العنصر الأساسي الوحيد عند الدوران ===== */}
          {wheelVisible && (
            <View style={styles.wheelOverlay}>
              <LinearGradient colors={['rgba(7,10,15,0.97)', 'rgba(10,13,18,0.99)']} style={StyleSheet.absoluteFill} />

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

              <View style={[styles.wheelStage, { width: wheelSize, height: wheelSize }]}>
                <Wheel spinAngle={spinAngle} size={wheelSize} />
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
        </View>
      ) : (
        <>
          {/* ===== الترويسة الموحدة ===== */}
          <View style={{ paddingTop: insets.top + SPACING.xs }}>
            <GameHeader title="الروليت" onBack={() => router.back()} onInfo={() => setHelpOpen(true)} live muted={isMuted} onToggleMute={toggleMute} />
        <View style={{ paddingHorizontal: SPACING.lg, marginBottom: SPACING.xs }}>
          <SoloTableBar
            players={players}
            isMuted={isMuted}
            onToggleMute={toggleMute}
            muteAllRemote={muteAllRemote}
            onToggleMuteAllRemote={toggleMuteAllRemote}
            mutedRemoteUids={mutedRemoteUids}
            onToggleRemoteMute={toggleRemoteMute}
            isRemoteMuted={isRemoteMuted}
          />
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
        {rouletteRoom?.phase === 'result' && !spinning && winners && (
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
          <View style={[styles.wheelStage, { width: wheelSize, height: wheelSize }]}>
            <Wheel spinAngle={spinAngle} size={wheelSize} />

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

        {/* شريط أوضاع الرهان: رقم / رقمان / ثلاثي / صف / مربع / ستة / جيران */}
        <View style={styles.modeRow}>
          {MODE_LABELS.map((m) => (
            <Pressable
              key={m.key}
              onPress={() => {
                setBetMode(m.key);
                setAnchor(null);
                setPopupOpts(null);
              }}
              style={[styles.modeChip, betMode === m.key && styles.modeChipActive]}
            >
              <Text style={[styles.modeChipText, betMode === m.key && styles.modeChipTextActive]}>
                {m.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* تلميح المرساة: الخلايا المذهّبة تُكمل الرهان */}
        {anchor && !spinning && roomBetting && (
          <Text style={styles.anchorHint}>
            ✦ اضغط خلية مذهّبة لإتمام الرهان — أو اضغط الرقم المحدد للإلغاء
          </Text>
        )}

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
            <BetCell label="0" numbers={[0]} type="straight" color={CELL_COLOR.green} height={zeroH} flex={0.9} onPress={() => handleCellPress(0)} total={cellTotal('straight', [0])} others={othersOn('straight', [0])} crowned={!spinning && !!res && res.winningNumber === 0} suggested={suggestedNumbers.has(0)} isAnchor={anchor?.n === 0} />
            <View style={styles.gridCol}>
              {rows.map((row, ri) => (
                <View key={ri} style={styles.gridRow}>
                  {row.map((n) => (
                    <BetCell key={n} label={String(n)} numbers={[n]} type="straight" color={CELL_COLOR[numberColor(n)]} height={cellH} onPress={() => handleCellPress(n)} total={cellTotal('straight', [n])} others={othersOn('straight', [n])} crowned={!spinning && !!res && res.winningNumber === n} suggested={suggestedNumbers.has(n)} isAnchor={anchor?.n === n} />
                  ))}
                </View>
              ))}
            </View>
            {/* أعمدة 2:1 */}
            <View style={styles.gridCol}>
              {[3, 2, 1].map((col) => {
                const nums = Array.from({ length: 12 }, (_, i) => col + i * 3);
                return (
                  <BetCell key={col} label={`2:1`} numbers={nums} type="column" color="#1B2230" height={cellH} onPress={place} total={cellTotal('column', nums)} others={othersOn('column', nums)} />
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
              <BetCell key={String(label)} label={String(label)} numbers={nums as number[]} type="dozen" color="#1B2230" height={cellH} onPress={place} total={cellTotal('dozen', nums as number[])} others={othersOn('dozen', nums as number[])} />
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
              <BetCell key={type} label={label} numbers={[]} type={type} color={type === 'red' ? CELL_COLOR.red : '#1B2230'} height={cellH} onPress={place} total={cellTotal(type, [])} others={othersOn(type, [])} />
            ))}
          </View>

          {/* الرهانات المعلنة الفرنسية */}
          <View style={styles.callRow}>
            {CALL_BETS.map((c) => (
              <Pressable key={c.label} style={styles.callBtn} onPress={() => placeCallBet(c.units)}>
                <Text style={styles.callBtnLabel}>{c.label}</Text>
                <Text style={styles.callBtnHint}>{c.hint}</Text>
              </Pressable>
            ))}
          </View>
          </ScrollView>
        </View>

        {/* نافذة احتياطية صغيرة عند تعارض خيارين على نفس الخلية */}
        {popupOpts && !spinning && roomBetting && (
          <View style={styles.anchorOverlay}>
            <Text style={styles.anchorTitle}>اختر الرهان المطلوب</Text>
            <View style={styles.anchorOptions}>
              {popupOpts.options.map((opt, i) => (
                <Pressable
                  key={i}
                  style={styles.anchorChip}
                  onPress={() => {
                    place(popupOpts.type, opt);
                    setPopupOpts(null);
                    setAnchor(null);
                  }}
                >
                  <Text style={styles.anchorChipText}>{[...opt].sort((a, b) => a - b).join(' · ')}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable style={styles.anchorCancel} onPress={() => setPopupOpts(null)}>
              <Text style={styles.anchorCancelText}>إلغاء</Text>
            </Pressable>
          </View>
        )}

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
              style={[
                styles.chipCircle,
                { width: chipSize, height: chipSize, borderRadius: Math.round(chipSize / 2) },
                chip === v && styles.chipActive,
              ]}
            >
              <Text style={styles.chipValue}>{v}</Text>
            </Pressable>
          ))}
          <Pressable style={styles.clearBtn} onPress={clear} disabled={snap.totalBet === 0}>
            <Text style={[styles.clearText, snap.totalBet === 0 && { opacity: 0.4 }]}>مسح</Text>
          </Pressable>
        </View>

        {/* إعادة الرهان التلقائي — صف مستقل أسفل الصينية لتجنب التداخل على الشاشات الضيقة */}
        <View style={styles.rebetRow}>
          <Pressable
            style={[styles.rebetBtnFull, autoRebet && styles.rebetBtnFullActive]}
            onPress={() => sendAction('autoRebet', { enabled: !autoRebet })}
          >
            <Text style={[styles.rebetText, autoRebet && styles.rebetTextActive]}>
              🔄 إعادة الرهان تلقائيًا{autoRebet ? ' ✓' : ''}
            </Text>
          </Pressable>
        </View>

        {/* خروج من الطاولة — يوقف اللعب والصوت فورًا ويعيد للوبي */}
        <View style={styles.rebetRow}>
          <Pressable style={styles.leaveBtn} onPress={leaveTable}>
            <Text style={styles.leaveText}>🚪 خروج من الطاولة</Text>
          </Pressable>
        </View>

        {/* حالة الدورة المشتركة — الدوران تلقائي كل ٣٠ ثانية */}
        <View style={styles.actionRow}>
          {rouletteRoom?.phase === 'betting' ? (
            <Text style={styles.autoText}>⚙️ الدوران تلقائي — الرهان يُغلق مع انتهاء العداد</Text>
          ) : (
            <>
              {!spinning && !!res && (
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
        </>
      )}

      {/* لحظة الفوز — أُلغيت جرافيكس الفوز في الروليت حتى لا ينكشف رقم الفوز قبل توقف الكرة */}
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
  modeRow: {
    flexDirection: 'row',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  modeChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
    backgroundColor: 'rgba(0,0,0,0.28)',
    borderWidth: 1,
    borderColor: 'rgba(242,239,233,0.08)',
  },
  modeChipActive: {
    backgroundColor: 'rgba(201,169,97,0.16)',
    borderColor: COLORS.hairlineGold,
  },
  modeChipText: {
    fontFamily: FONTS.ar.medium,
    fontSize: 11,
    color: COLORS.textDim,
  },
  modeChipTextActive: {
    color: COLORS.goldLight,
  },
  callRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 2,
  },
  callBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
    backgroundColor: 'rgba(201,169,97,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(201,169,97,0.30)',
  },
  callBtnLabel: {
    fontFamily: FONTS.ar.bold,
    fontSize: 11,
    color: COLORS.goldLight,
  },
  callBtnHint: {
    fontFamily: FONTS.ar.regular,
    fontSize: 9,
    color: COLORS.textFaint,
    marginTop: 1,
  },
  anchorOverlay: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 8,
    zIndex: 30,
    backgroundColor: 'rgba(10,13,18,0.96)',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.hairlineGold,
    padding: SPACING.md,
    ...SHADOWS.e2,
  },
  anchorTitle: {
    fontFamily: FONTS.ar.bold,
    fontSize: 12,
    color: COLORS.goldLight,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  anchorOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
  },
  anchorChip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: RADIUS.sm,
    backgroundColor: 'rgba(201,169,97,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(201,169,97,0.4)',
  },
  anchorChipText: {
    fontFamily: FONTS.ar.bold,
    fontSize: 12,
    color: COLORS.text,
  },
  anchorCancel: {
    alignSelf: 'center',
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
  },
  anchorCancelText: {
    fontFamily: FONTS.ar.medium,
    fontSize: 12,
    color: COLORS.textDim,
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
  cellSuggestGlow: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.goldLight,
    backgroundColor: 'rgba(201,169,97,0.25)',
    zIndex: 4,
  },
  cellSuggestDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: COLORS.goldLight,
    shadowColor: COLORS.goldLight,
    shadowOpacity: 0.9,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 0 },
  },
  cellAnchorRing: {
    position: 'absolute',
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    borderRadius: RADIUS.sm,
    borderWidth: 2,
    borderColor: COLORS.gold,
    zIndex: 3,
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingLeft: 3,
  },
  cellAnchorDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: COLORS.goldLight,
    borderWidth: 1,
    borderColor: '#171007',
  },
  anchorHint: {
    fontFamily: FONTS.ar.medium,
    fontSize: 11,
    color: COLORS.goldLight,
    textAlign: 'center',
    paddingVertical: 3,
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
  rebetBtn: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  rebetBtnActive: {
    borderColor: COLORS.gold,
    backgroundColor: 'rgba(201,169,97,0.14)',
  },
  rebetText: {
    fontFamily: FONTS.ar.medium,
    fontSize: TYPE.caption.fontSize,
    color: COLORS.textDim,
  },
  rebetTextActive: {
    color: COLORS.goldLight,
  },
  rebetRow: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xs,
  },
  rebetBtnFull: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  rebetBtnFullActive: {
    borderColor: COLORS.gold,
    backgroundColor: 'rgba(201,169,97,0.14)',
  },
  leaveBtn: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: 'rgba(232,169,160,0.35)',
    backgroundColor: 'rgba(232,169,160,0.08)',
  },
  leaveText: {
    fontFamily: FONTS.ar.bold,
    fontSize: TYPE.caption.fontSize,
    color: COLORS.crimson,
  },
});

// ===== أنماط الوضع العرضي (landscape) — مسبوقة بـ lsc- =====
const lsc = StyleSheet.create({
  root: { flex: 1 },
  subheader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    marginTop: -SPACING.xs,
  },
  soloWrap: { flex: 1 },
  stakeRow: { flexDirection: 'row-reverse', gap: SPACING.xs },
  stakeTab: {
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
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
    fontSize: 10,
    color: COLORS.textDim,
  },
  stakeTabTextActive: { color: COLORS.goldLight },
  betPanel: { padding: 4 },
  tableTopBar: {
    paddingHorizontal: SPACING.xs,
    paddingBottom: SPACING.xs,
    gap: SPACING.sm,
  },
  pill: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  pillValue: {
    fontSize: 16,
    lineHeight: 20,
  },
  topStatus: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusLine: {
    fontFamily: FONTS.ar.medium,
    fontSize: 11,
    color: COLORS.goldLight,
    textAlign: 'center',
  },
  statusSub: {
    fontFamily: FONTS.ar.regular,
    fontSize: 9,
    color: COLORS.textFaint,
    textAlign: 'center',
    marginTop: 1,
  },
  modeRow: {
    gap: 3,
    paddingVertical: 2,
  },
  anchorHint: {
    fontSize: 10,
    paddingVertical: 1,
  },
  gridWrap: {
    padding: SPACING.xs,
    gap: 3,
  },
  bottomStrip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
  },
  totalValue: {
    fontSize: 18,
    lineHeight: 22,
  },
  clearBtn: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
  },
  rebetBtnL: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  leaveBtnL: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: 'rgba(232,169,160,0.35)',
    backgroundColor: 'rgba(232,169,160,0.08)',
  },
});
