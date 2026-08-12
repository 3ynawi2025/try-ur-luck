// ============================================================
// جرب حظك — PlayingCard v3 (Neon Edition)
// ============================================================

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { RADIUS, FONTS, COLORS } from '../../constants/theme';
import SuitIcon, { SUIT_COLORS } from './SuitIcons';

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
        Animated.timing(opacity, { toValue: 1, duration: 300, delay, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 300, delay, useNativeDriver: true }),
      ]).start();
    }
  }, [animate]);

  if (faceDown || !card) {
    return (
      <Animated.View
        style={[
          styles.card,
          { width, height, opacity: animate ? opacity : 1, transform: [{ translateY: animate ? translateY : 0 }] },
          styles.faceDown,
        ]}
      >
        <View style={styles.faceDownPattern}>
          <View style={styles.faceDownInner} />
        </View>
      </Animated.View>
    );
  }

  const { suit, rank } = card;
  const color = SUIT_COLORS[suit];
  const symbolSize = Math.min(width, height) * 0.28;

  return (
    <Animated.View
      style={[
        styles.card,
        { width, height, opacity: animate ? opacity : 1, transform: [{ translateY: animate ? translateY : 0 }] },
        styles.faceUp,
      ]}
    >
      <View style={[styles.corner, { top: 4, left: 5 }]}>
        <Text style={[styles.rank, { color, fontSize: height * 0.17 }]}>{rank}</Text>
        <View style={{ marginTop: -2 }}>
          <SuitIcon suit={suit} size={symbolSize * 0.65} color={color} />
        </View>
      </View>

      <View style={styles.center}>
        <SuitIcon suit={suit} size={symbolSize * 1.4} color={color} />
      </View>

      <View style={[styles.corner, styles.cornerBottom, { bottom: 4, right: 5 }]}>
        <Text style={[styles.rank, { color, fontSize: height * 0.17 }]}>{rank}</Text>
        <View style={{ marginTop: -2 }}>
          <SuitIcon suit={suit} size={symbolSize * 0.65} color={color} />
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.card,
    overflow: 'hidden',
    borderWidth: 1,
  },
  faceDown: {
    backgroundColor: '#0F172A',
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  faceUp: {
    backgroundColor: 'rgba(15,23,42,0.95)',
    borderColor: 'rgba(37,99,235,0.4)',
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  faceDownPattern: {
    width: '86%',
    height: '90%',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,212,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  faceDownInner: {
    width: '70%',
    height: '70%',
    borderRadius: 4,
    backgroundColor: 'rgba(0,212,255,0.08)',
  },
  corner: {
    position: 'absolute',
    alignItems: 'center',
  },
  cornerBottom: {
    transform: [{ rotate: '180deg' }],
  },
  rank: {
    fontFamily: FONTS.english.bold,
    lineHeight: 18,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.35,
  },
});
