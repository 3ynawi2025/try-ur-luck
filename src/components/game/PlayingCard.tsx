// ============================================================
// جرب حظك — PlayingCard
// ورقة عاجية حقيقية + ظهر أحمر بزخرفة ذهبية + قلب ثلاثي الأبعاد
// ============================================================

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Path, G, Defs, Pattern, Rect } from 'react-native-svg';
import { RADIUS, FONTS, COLORS, GRADIENTS, SHADOWS, SIZES } from '../../constants/theme';
import { useReducedMotion } from '../../constants/motion';
import SuitIcon, { SUIT_COLORS, Suit } from './SuitIcons';

export type { Suit };
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface Card {
  suit: Suit;
  rank: Rank;
}

interface PlayingCardProps {
  card?: Card | null;
  faceDown?: boolean;
  width?: number;
  height?: number;
  /** يوزّع الورقة بحركة دخول */
  animate?: boolean;
  delay?: number;
  /** خفوت للأوراق غير الفعّالة */
  dimmed?: boolean;
}

const FACE_RANKS: Record<string, string> = { J: 'J', Q: 'Q', K: 'K' };

// ------------------------------------------------------------
// ظهر الورقة — نقش ماسي ذهبي
// ------------------------------------------------------------
function CardBack({ w, h }: { w: number; h: number }) {
  const inset = Math.max(3, w * 0.08);
  return (
    <LinearGradient colors={GRADIENTS.cardBack} style={styles.fill}>
      <View style={[styles.backFrame, { margin: inset, borderRadius: RADIUS.xs }]}>
        <Svg width="100%" height="100%">
          <Defs>
            <Pattern id="lattice" width="10" height="10" patternUnits="userSpaceOnUse">
              <Path
                d="M5 0 10 5 5 10 0 5z"
                fill="none"
                stroke={COLORS.goldLight}
                strokeWidth={0.7}
                opacity={0.5}
              />
            </Pattern>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#lattice)" />
        </Svg>
        <View style={styles.backEmblem}>
          <Svg width={w * 0.34} height={w * 0.34} viewBox="0 0 24 24">
            <Circle cx={12} cy={12} r={11} fill="rgba(90,18,32,0.85)" stroke={COLORS.goldLight} strokeWidth={0.9} />
            <Path
              d="M12 4.6c-.4 2.2-2.9 3.8-4.2 5.2-1 1-1.5 2-1.5 3 0 1.6 1.2 2.9 2.8 2.9.9 0 1.7-.5 2.2-1.1-.1 1.3-.7 2.4-1.5 3.1h4.4c-.9-.7-1.4-1.8-1.5-3.1.5.7 1.3 1.1 2.2 1.1 1.6 0 2.8-1.2 2.8-2.9 0-1-.5-2-1.5-3-1.3-1.4-3.8-3-4.2-5.2z"
              fill={COLORS.goldLight}
            />
          </Svg>
        </View>
      </View>
    </LinearGradient>
  );
}

// ------------------------------------------------------------
// وجه الورقة
// ------------------------------------------------------------
function CardFace({ card, w, h }: { card: Card; w: number; h: number }) {
  const color = SUIT_COLORS[card.suit];
  const isFace = !!FACE_RANKS[card.rank];
  const rankSize = h * 0.215;
  const cornerSuit = h * 0.115;
  const pad = Math.max(2.5, w * 0.075);

  return (
    <LinearGradient colors={GRADIENTS.cardFace} start={{ x: 0.2, y: 0 }} end={{ x: 0.9, y: 1 }} style={styles.fill}>
      {/* الزاوية العليا */}
      <View style={[styles.corner, { top: pad, left: pad }]}>
        <Text style={[styles.rank, { color, fontSize: rankSize, lineHeight: rankSize * 1.05 }]}>
          {card.rank}
        </Text>
        <SuitIcon suit={card.suit} size={cornerSuit} color={color} />
      </View>

      {/* المركز */}
      <View style={styles.center} pointerEvents="none">
        {isFace ? (
          <View style={[styles.faceBadge, { borderColor: color, width: w * 0.5, height: h * 0.44 }]}>
            <Text style={[styles.faceLetter, { color, fontSize: h * 0.24 }]}>{card.rank}</Text>
            <SuitIcon suit={card.suit} size={h * 0.13} color={color} />
          </View>
        ) : (
          <SuitIcon suit={card.suit} size={Math.min(w, h) * 0.46} color={color} />
        )}
      </View>

      {/* الزاوية السفلى (مقلوبة) */}
      <View style={[styles.corner, styles.cornerFlip, { bottom: pad, right: pad }]}>
        <Text style={[styles.rank, { color, fontSize: rankSize, lineHeight: rankSize * 1.05 }]}>
          {card.rank}
        </Text>
        <SuitIcon suit={card.suit} size={cornerSuit} color={color} />
      </View>
    </LinearGradient>
  );
}

// ------------------------------------------------------------
export default function PlayingCard({
  card,
  faceDown = false,
  width = SIZES.cardWidth,
  height = SIZES.cardHeight,
  animate = false,
  delay = 0,
  dimmed = false,
}: PlayingCardProps) {
  const progress = useRef(new Animated.Value(animate ? 0 : 1)).current;
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!animate) return;
    progress.setValue(0);
    // إتاحة: بلا حركة عند تقليل الحركة — البطاقة تظهر فورًا
    if (reduced) {
      progress.setValue(1);
      return;
    }
    Animated.timing(progress, {
      toValue: 1,
      duration: 340,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [animate, delay, reduced]);

  const animStyle = animate
    ? {
        opacity: progress,
        transform: [
          { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [-26, 0] }) },
          { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.86, 1] }) },
          {
            rotate: progress.interpolate({
              inputRange: [0, 1],
              outputRange: ['-8deg', '0deg'],
            }),
          },
        ],
      }
    : null;

  const showBack = faceDown || !card;

  return (
    <Animated.View
      style={[
        styles.card,
        { width, height, borderRadius: Math.max(RADIUS.xs, width * 0.11) },
        SHADOWS.e2,
        dimmed && styles.dimmed,
        animStyle,
      ]}
    >
      {showBack ? <CardBack w={width} h={height} /> : <CardFace card={card!} w={width} h={height} />}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    backgroundColor: '#FFFDF6',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.25)',
  },
  dimmed: {
    opacity: 0.45,
  },
  fill: {
    flex: 1,
  },
  backFrame: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(227,201,138,0.45)',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backEmblem: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  corner: {
    position: 'absolute',
    alignItems: 'center',
  },
  cornerFlip: {
    transform: [{ rotate: '180deg' }],
  },
  rank: {
    fontFamily: FONTS.num.bold,
    includeFontPadding: false,
    letterSpacing: -0.5,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faceBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.2,
    borderRadius: 4,
    gap: 2,
    opacity: 0.9,
  },
  faceLetter: {
    fontFamily: FONTS.num.black,
    includeFontPadding: false,
  },
});
