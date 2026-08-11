// ============================================================
// جرب حظك — PlayingCard
// بطاقة لعب بتصميم كلاسيكي
// ============================================================

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { RADIUS, SHADOWS, FONTS, COLORS } from '../../constants/theme';

export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';
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
  animate?: boolean;
  delay?: number;
}

const SUIT_SYMBOLS: Record<Suit, string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
};

const SUIT_COLORS: Record<Suit, string> = {
  spades: '#212121',
  hearts: '#D32F2F',
  diamonds: '#D32F2F',
  clubs: '#212121',
};

export default function PlayingCard({
  card,
  faceDown = false,
  width = 60,
  height = 84,
  animate = false,
  delay = 0,
}: PlayingCardProps) {
  const opacity = useRef(new Animated.Value(animate ? 0 : 1)).current;
  const translateY = useRef(new Animated.Value(animate ? -20 : 0)).current;

  useEffect(() => {
    if (animate) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          delay,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          delay,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [animate]);

  if (faceDown || !card) {
    return (
      <Animated.View
        style={[
          styles.card,
          {
            width,
            height,
            opacity: animate ? opacity : 1,
            transform: [{ translateY: animate ? translateY : 0 }],
          },
          styles.faceDown,
        ]}
      >
        <View style={styles.pattern}>
          <Text style={styles.patternText}>🃏</Text>
        </View>
      </Animated.View>
    );
  }

  const { suit, rank } = card;
  const color = SUIT_COLORS[suit];
  const symbol = SUIT_SYMBOLS[suit];

  return (
    <Animated.View
      style={[
        styles.card,
        {
          width,
          height,
          opacity: animate ? opacity : 1,
          transform: [{ translateY: animate ? translateY : 0 }],
        },
      ]}
    >
      {/* Top left */}
      <View style={styles.corner}>
        <Text style={[styles.rank, { color }]}>{rank}</Text>
        <Text style={[styles.suitCorner, { color }]}>{symbol}</Text>
      </View>

      {/* Center */}
      <View style={styles.center}>
        <Text style={[styles.centerSuit, { color, fontSize: height * 0.4 }]}>{symbol}</Text>
      </View>

      {/* Bottom right (rotated) */}
      <View style={[styles.corner, styles.cornerBottom]}>
        <Text style={[styles.rank, { color }]}>{rank}</Text>
        <Text style={[styles.suitCorner, { color }]}>{symbol}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.card,
    ...SHADOWS.card,
    overflow: 'hidden',
  },
  faceDown: {
    backgroundColor: '#1A237E',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  pattern: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  patternText: {
    fontSize: 24,
  },
  corner: {
    position: 'absolute',
    top: 4,
    left: 4,
    alignItems: 'center',
  },
  cornerBottom: {
    top: undefined,
    left: undefined,
    bottom: 4,
    right: 4,
    transform: [{ rotate: '180deg' }],
  },
  rank: {
    fontSize: 12,
    fontFamily: FONTS.english.bold,
    lineHeight: 14,
  },
  suitCorner: {
    fontSize: 10,
    lineHeight: 12,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerSuit: {
    opacity: 0.3,
  },
});
