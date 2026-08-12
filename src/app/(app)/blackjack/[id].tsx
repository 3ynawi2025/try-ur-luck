// ============================================================
// جرب حظك — طاولة بلاك جاك
// ============================================================

import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Avatar from '../../../components/ui/Avatar';
import Chip from '../../../components/ui/Chip';
import PlayingCard, { Card as PCard } from '../../../components/game/PlayingCard';
import FeltTable from '../../../components/game/FeltTable';
import { BackIcon, MicIcon, MicOffIcon } from '../../../components/icons/GameIcons';
import {
  COLORS,
  FONTS,
  TYPE,
  SPACING,
  RADIUS,
  SHADOWS,
  formatCompact,
} from '../../../constants/theme';

const PLAYERS = [
  {
    id: 'p1',
    name: 'أنت',
    balance: 8500,
    bet: 200,
    status: 'playing' as const,
    cards: [
      { suit: 'hearts', rank: 'A' },
      { suit: 'clubs', rank: '8' },
    ] as PCard[],
    score: 19,
  },
  {
    id: 'p2',
    name: 'سلطان',
    balance: 12000,
    bet: 500,
    status: 'stood' as const,
    cards: [
      { suit: 'spades', rank: 'K' },
      { suit: 'hearts', rank: '9' },
    ] as PCard[],
    score: 19,
  },
  {
    id: 'p3',
    name: 'نورة',
    balance: 6200,
    bet: 100,
    status: 'bust' as const,
    cards: [
      { suit: 'diamonds', rank: '10' },
      { suit: 'spades', rank: '5' },
      { suit: 'clubs', rank: 'J' },
    ] as PCard[],
    score: 25,
  },
];

const DEALER = {
  cards: [
    { suit: 'spades', rank: 'K' },
    { suit: 'diamonds', rank: '7' },
  ] as PCard[],
  score: 17,
  revealed: true,
};

const STATUS_TONE = {
  playing: { bg: 'rgba(212,175,55,0.16)', bd: 'rgba(212,175,55,0.45)', fg: COLORS.goldLight, label: 'دورك' },
  stood: { bg: 'rgba(31,191,117,0.14)', bd: 'rgba(31,191,117,0.4)', fg: '#5BE0A4', label: 'وقف' },
  bust: { bg: 'rgba(226,61,77,0.15)', bd: 'rgba(226,61,77,0.42)', fg: '#FF8A94', label: 'احترق' },
};

function ActionButton({
  label,
  colors,
  onPress,
  flex = 1,
  darkText = false,
}: {
  label: string;
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

export default function BlackjackScreen() {
  useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [voiceMuted, setVoiceMuted] = useState(true);

  const me = PLAYERS[0];

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
          <Text style={styles.phaseText}>الموزع يقف على ١٧</Text>
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

      {/* ===== منطقة الموزع ===== */}
      <FeltTable style={styles.dealerFelt} radius={140} railWidth={11} watermark="">
        <Text style={styles.dealerLabel}>الموزع</Text>
        <View style={styles.dealerCards}>
          {DEALER.cards.map((c, i) => (
            <PlayingCard
              key={i}
              card={c}
              faceDown={!DEALER.revealed && i === 1}
              width={50}
              height={71}
              animate
              delay={i * 140}
            />
          ))}
        </View>
        <ScoreBubble score={DEALER.revealed ? DEALER.score : '؟'} />
      </FeltTable>

      {/* ===== اللاعبون ===== */}
      <ScrollView
        style={styles.players}
        contentContainerStyle={styles.playersContent}
        showsVerticalScrollIndicator={false}
      >
        {PLAYERS.map((p, pi) => {
          const tone = STATUS_TONE[p.status];
          const isMe = pi === 0;

          return (
            <View key={p.id} style={[styles.spot, isMe && styles.spotMe]}>
              {isMe && (
                <LinearGradient
                  colors={['rgba(212,175,55,0.10)', 'rgba(212,175,55,0)']}
                  style={StyleSheet.absoluteFill}
                />
              )}

              <View style={styles.spotTop}>
                <View style={styles.spotWho}>
                  <Avatar name={p.name} size={36} showBorder={isMe} isActive={isMe} />
                  <View style={styles.spotMeta}>
                    <Text style={styles.spotName}>{p.name}</Text>
                    <Text style={styles.spotBalance}>{formatCompact(p.balance)}</Text>
                  </View>
                </View>

                <View style={styles.spotStatus}>
                  <View style={[styles.tag, { backgroundColor: tone.bg, borderColor: tone.bd }]}>
                    <Text style={[styles.tagText, { color: tone.fg }]}>{tone.label}</Text>
                  </View>
                  <Chip amount={p.bet} size={30} />
                </View>
              </View>

              <View style={styles.spotCards}>
                <View style={styles.cardRow}>
                  {p.cards.map((c, i) => (
                    <View key={i} style={{ marginRight: i === 0 ? 0 : -14 }}>
                      <PlayingCard
                        card={c}
                        width={44}
                        height={62}
                        animate
                        delay={pi * 180 + i * 130}
                        dimmed={p.status === 'bust'}
                      />
                    </View>
                  ))}
                </View>
                <ScoreBubble score={p.score} tone={p.status === 'bust' ? COLORS.crimson : undefined} />
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* ===== شريط الإجراءات ===== */}
      <View style={[styles.actionBar, { paddingBottom: insets.bottom + SPACING.md }]}>
        <LinearGradient
          colors={['rgba(2,4,3,0)', 'rgba(2,4,3,0.95)']}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <Text style={styles.turnLabel}>
          دورك — مجموعك <Text style={styles.turnScore}>{me.score}</Text>
        </Text>
        <View style={styles.actions}>
          <ActionButton label="سحب" colors={['#5AA0FF', '#1B4EA8'] as const} onPress={() => {}} />
          <ActionButton label="وقوف" colors={['#2FD98A', '#0B7345'] as const} onPress={() => {}} />
          <ActionButton
            label="مضاعفة"
            colors={['#F7E7A6', '#B8912C'] as const}
            flex={1.2}
            darkText
            onPress={() => {}}
          />
        </View>
      </View>
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

  // الموزع
  dealerFelt: {
    marginHorizontal: SPACING.xl,
    height: 168,
  },
  dealerLabel: {
    fontFamily: FONTS.ar.semibold,
    fontSize: TYPE.caption.fontSize,
    color: 'rgba(246,242,232,0.72)',
    letterSpacing: 1,
    marginBottom: SPACING.sm,
  },
  dealerCards: {
    flexDirection: 'row',
    gap: 5,
    marginBottom: SPACING.sm,
  },

  score: {
    minWidth: 34,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(2,10,7,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.4)',
    alignItems: 'center',
  },
  scoreText: {
    fontFamily: FONTS.num.bold,
    fontSize: TYPE.small.fontSize,
    lineHeight: 19,
    color: COLORS.goldLight,
    includeFontPadding: false,
  },

  // اللاعبون
  players: { flex: 1 },
  playersContent: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xl,
    gap: SPACING.md,
  },
  spot: {
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    gap: SPACING.md,
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  spotMe: {
    borderColor: 'rgba(212,175,55,0.4)',
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
  spotMeta: { alignItems: 'flex-end' },
  spotName: {
    fontFamily: FONTS.ar.bold,
    fontSize: TYPE.small.fontSize,
    lineHeight: TYPE.small.lineHeight,
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
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  tagText: {
    fontFamily: FONTS.ar.semibold,
    fontSize: TYPE.caption.fontSize,
    lineHeight: TYPE.caption.lineHeight + 2,
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

  // الإجراءات
  actionBar: {
    paddingTop: SPACING.xl,
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
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
    gap: SPACING.sm,
  },
  actionBtn: {
    height: 54,
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
  actionLabelDark: {
    color: COLORS.onGold,
  },
});
