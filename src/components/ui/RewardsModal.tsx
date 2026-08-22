// ============================================================
// جرب حظك — RewardsModal
// نافذة المكافآت اليومية: سلسلة حضور 7 أيام + عجلة حظ يومية.
// السيرفر يحسم الجائزة أولًا ثم تدور العجلة لتستقر عليها.
// ============================================================

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Animated,
  Easing,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Path, G, Text as SvgText } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import GoldButton from './GoldButton';
import WinFX from '../game/WinFX';
import { CloseIcon } from '../icons/GameIcons';
import { apiFetch } from '../../lib/api';
import { useReducedMotion } from '../../constants/motion';
import { useCountUp } from '../../hooks/useCountUp';
import {
  COLORS,
  FONTS,
  TYPE,
  SPACING,
  RADIUS,
  SHADOWS,
  formatCompact,
} from '../../constants/theme';

const STREAK_DAYS = [
  { day: 1, amount: 500 },
  { day: 2, amount: 600 },
  { day: 3, amount: 800 },
  { day: 4, amount: 1000 },
  { day: 5, amount: 1200 },
  { day: 6, amount: 1500 },
  { day: 7, amount: 2000 },
];

// قطاعات العجلة (7 — مطابقة لجوائز السيرفر بلا تكرار) — السيرفر يقرر الجائزة ثم نحرك العجلة إليها
const WHEEL_PRIZES = [50, 100, 200, 500, 1000, 2000, 5000];
const SEG_COLORS = ['#1B2230', '#151B26'];
const SEG_ANGLE = 360 / WHEEL_PRIZES.length;

interface RewardsModalProps {
  visible: boolean;
  onClose: () => void;
  /** بعد أي مكافأة — يحدّث رصيد اللوبي فورًا */
  onReward?: (amount: number) => void;
}

interface Status {
  streak: number;
  claimedToday: boolean;
  wheelSpunToday: boolean;
}

export default function RewardsModal({ visible, onClose, onReward }: RewardsModalProps) {
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [prize, setPrize] = useState<number | null>(null);
  const rotation = useRef(new Animated.Value(0)).current;
  const rotationRef = useRef(0);
  const [winTrigger, setWinTrigger] = useState<{ key: string; magnitude: 1 | 2 | 3 } | null>(null);
  const reduced = useReducedMotion();
  const balanceDisplay = useCountUp(prize ?? 0, 700);

  const load = useCallback(async () => {
    try {
      const s = await apiFetch<Status>('/api/rewards/status');
      setStatus(s);
    } catch {
      /* وضع ضيف */
    }
  }, []);

  useEffect(() => {
    if (visible) {
      load();
      setPrize(null);
      setSpinning(false);
    }
  }, [visible, load]);

  const claimDaily = async () => {
    if (busy || !status || status.claimedToday) return;
    setBusy(true);
    try {
      const r = await apiFetch<{ awarded: number; streak: number }>('/api/rewards/daily', { method: 'POST' });
      if (r.awarded > 0) {
        onReward?.(r.awarded);
        setWinTrigger({ key: `daily-${Date.now()}`, magnitude: r.awarded >= 1500 ? 3 : 2 });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
      setStatus({ streak: r.streak, claimedToday: true, wheelSpunToday: status.wheelSpunToday });
    } catch {
      /* ignore */
    } finally {
      setBusy(false);
    }
  };

  const spinWheel = async () => {
    if (busy || spinning || !status || status.wheelSpunToday) return;
    setSpinning(true);
    try {
      // السيرفر يحسم الجائزة أولًا — ثم نحرّك العجلة إليها
      const r = await apiFetch<{ prize: number }>('/api/rewards/wheel', { method: 'POST' });
      if (!r.prize || r.prize === 0) {
        setSpinning(false);
        return;
      }
      const idx = WHEEL_PRIZES.indexOf(r.prize);
      const segCenter = idx * SEG_ANGLE + SEG_ANGLE / 2;
      const targetMod = ((360 - segCenter) % 360 + 360) % 360;
      const current = rotationRef.current;
      const currentMod = ((current % 360) + 360) % 360;
      const delta = (targetMod - currentMod + 360) % 360;
      const toValue = current + 5 * 360 + delta;
      rotationRef.current = toValue;

      if (reduced) {
        rotation.setValue(toValue);
        setPrize(r.prize);
        setStatus({ ...status, wheelSpunToday: true });
        setSpinning(false);
      } else {
        Animated.timing(rotation, {
          toValue,
          duration: 3600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start(() => {
          setPrize(r.prize);
          setStatus({ ...status, wheelSpunToday: true });
          setSpinning(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        });
      }
      onReward?.(r.prize);
      setWinTrigger({ key: `wheel-${Date.now()}`, magnitude: r.prize >= 2000 ? 3 : r.prize >= 500 ? 2 : 1 });
    } catch {
      setSpinning(false);
    }
  };

  // ===== قطاعات العجلة =====
  const R = 110;
  const CX = R;
  const CY = R;
  const segments = WHEEL_PRIZES.map((p, i) => {
    const a0 = ((i * SEG_ANGLE - 90) * Math.PI) / 180;
    const a1 = (((i + 1) * SEG_ANGLE - 90) * Math.PI) / 180;
    const x0 = CX + R * Math.cos(a0);
    const y0 = CY + R * Math.sin(a0);
    const x1 = CX + R * Math.cos(a1);
    const y1 = CY + R * Math.sin(a1);
    const mid = ((i * SEG_ANGLE + SEG_ANGLE / 2 - 90) * Math.PI) / 180;
    const lx = CX + R * 0.62 * Math.cos(mid);
    const ly = CY + R * 0.62 * Math.sin(mid);
    return {
      d: `M ${CX} ${CY} L ${x0} ${y0} A ${R} ${R} 0 0 1 ${x1} ${y1} Z`,
      lx,
      ly,
      fill: SEG_COLORS[i % 2],
      label: p >= 1000 ? formatCompact(p) : String(p),
    };
  });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.card}>
          {/* لحظة الفوز داخل النافذة */}
          <WinFX trigger={winTrigger} />

          <View style={styles.headerRow}>
            <Text style={styles.title}>مكافآت اليوم</Text>
            <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={8}>
              <CloseIcon size={18} color={COLORS.textDim} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            {/* ===== سلسلة الحضور ===== */}
            <Text style={styles.sectionLabel}>سلسلة الحضور</Text>
            <View style={styles.streakRow}>
              {STREAK_DAYS.map((d) => {
                const claimed = (status?.streak ?? 0) >= d.day;
                const todayCell = (status?.streak ?? 0) + 1 === d.day && !status?.claimedToday;
                return (
                  <View key={d.day} style={[styles.dayCell, claimed && styles.dayCellDone, todayCell && styles.dayCellToday]}>
                    <Text style={styles.dayNum}>يوم {d.day}</Text>
                    <Text style={[styles.dayAmount, claimed && styles.dayAmountDone]}>
                      {d.amount >= 1000 ? formatCompact(d.amount) : d.amount}
                    </Text>
                  </View>
                );
              })}
            </View>

            <GoldButton
              title={status?.claimedToday ? 'استُلمت اليوم ✓' : 'استلم مكافأة اليوم'}
              onPress={claimDaily}
              disabled={busy || !status || status.claimedToday}
              variant={status?.claimedToday ? 'ghost' : 'primary'}
            />

            {/* ===== عجلة الحظ ===== */}
            <Text style={[styles.sectionLabel, { marginTop: SPACING.xl }]}>عجلة الحظ — مرة يوميًا</Text>

            <View style={styles.wheelStage}>
              <Animated.View
                style={{
                  transform: [
                    {
                      rotate: rotation.interpolate({
                        inputRange: [0, 360],
                        outputRange: ['0deg', '360deg'],
                        extrapolate: 'extend',
                      }),
                    },
                  ],
                }}
              >
                <Svg width={R * 2} height={R * 2}>
                  <Circle cx={CX} cy={CY} r={R + 6} fill="#2A1E12" />
                  {segments.map((s, i) => (
                    <G key={i}>
                      <Path d={s.d} fill={s.fill} stroke="rgba(201,169,97,0.35)" strokeWidth={1} />
                      <SvgText
                        x={s.lx}
                        y={s.ly}
                        fill={COLORS.goldLight}
                        fontSize={13}
                        fontWeight="700"
                        textAnchor="middle"
                        alignmentBaseline="central"
                      >
                        {s.label}
                      </SvgText>
                    </G>
                  ))}
                  <Circle cx={CX} cy={CY} r={R} fill="none" stroke="#C9A961" strokeWidth={2.5} />
                  <Circle cx={CX} cy={CY} r={26} fill="#151B26" stroke="#C9A961" strokeWidth={2} />
                </Svg>
              </Animated.View>
              {/* المؤشر */}
              <View style={styles.wheelPointer} pointerEvents="none">
                <View style={styles.wheelPointerTip} />
              </View>
            </View>

            {prize !== null && !spinning && (
              <View style={styles.prizeRow}>
                <LinearGradient colors={['rgba(201,169,97,0.14)', 'rgba(201,169,97,0.03)']} style={styles.prizeBox}>
                  <Text style={styles.prizeLabel}>ربحت اليوم</Text>
                  <Text style={styles.prizeValue}>+{formatCompact(balanceDisplay)}</Text>
                </LinearGradient>
              </View>
            )}

            <GoldButton
              title={status?.wheelSpunToday ? 'دارت اليوم ✓' : spinning ? 'تدور…' : 'أدر العجلة'}
              onPress={spinWheel}
              disabled={busy || spinning || !status || status.wheelSpunToday}
              variant={status?.wheelSpunToday ? 'ghost' : 'primary'}
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(4,6,10,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '88%',
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    backgroundColor: '#0E131B',
    padding: SPACING.xl,
    ...SHADOWS.e3,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  title: {
    fontFamily: FONTS.ar.bold,
    fontSize: TYPE.h2.fontSize,
    color: COLORS.text,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  scroll: {
    gap: SPACING.md,
    paddingBottom: SPACING.md,
  },
  sectionLabel: {
    fontFamily: FONTS.ar.semibold,
    fontSize: TYPE.small.fontSize,
    color: COLORS.textDim,
  },
  streakRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
    justifyContent: 'space-between',
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  dayCellDone: {
    borderColor: COLORS.hairlineGold,
    backgroundColor: 'rgba(201,169,97,0.10)',
  },
  dayCellToday: {
    borderColor: COLORS.goldLight,
    ...SHADOWS.goldSoft,
  },
  dayNum: {
    fontFamily: FONTS.ar.regular,
    fontSize: 9,
    color: COLORS.textFaint,
  },
  dayAmount: {
    fontFamily: FONTS.num.bold,
    fontSize: 11,
    color: COLORS.textDim,
  },
  dayAmountDone: {
    color: COLORS.goldLight,
  },
  wheelStage: {
    alignSelf: 'center',
    width: 232,
    height: 232,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheelPointer: {
    position: 'absolute',
    top: -10,
    alignSelf: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  wheelPointerTip: {
    width: 0,
    height: 0,
    borderLeftWidth: 9,
    borderRightWidth: 9,
    borderTopWidth: 16,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: COLORS.goldLight,
  },
  prizeRow: {
    alignItems: 'center',
  },
  prizeBox: {
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.hairlineGold,
  },
  prizeLabel: {
    fontFamily: FONTS.ar.medium,
    fontSize: TYPE.caption.fontSize,
    color: COLORS.textDim,
  },
  prizeValue: {
    fontFamily: FONTS.num.black,
    fontSize: TYPE.h1.fontSize,
    color: COLORS.goldLight,
  },
});
