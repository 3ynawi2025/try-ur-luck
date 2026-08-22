// ============================================================
// جرب حظك — Suit Icons
// رموز الأوراق الأربعة (مسارات نظيفة داخل 24×24)
// ============================================================

import React from 'react';
import Svg, { Path } from 'react-native-svg';
// ألوان الرموز موحّدة في theme (لا hex محلي)
import { SUIT_COLORS } from '../../constants/theme';

export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';

interface SuitProps {
  suit: Suit;
  size?: number;
  color?: string;
}

const PATHS: Record<Suit, string> = {
  spades:
    'M12 2c-.6 3.2-4.3 5.6-6.2 7.6C4.3 11.1 3.6 12.5 3.6 14c0 2.4 1.8 4.2 4.1 4.2 1.4 0 2.6-.7 3.3-1.7-.2 2-1 3.5-2.3 4.6h6.6c-1.3-1.1-2.1-2.6-2.3-4.6.7 1 1.9 1.7 3.3 1.7 2.3 0 4.1-1.8 4.1-4.2 0-1.5-.7-2.9-2.2-4.4C16.3 7.6 12.6 5.2 12 2z',
  hearts:
    'M12 21c-.4 0-.8-.2-1.1-.4C6.4 16.8 3 14 3 10.3 3 7.4 5.2 5.2 8 5.2c1.6 0 3.1.8 4 2 .9-1.2 2.4-2 4-2 2.8 0 5 2.2 5 5.1 0 3.7-3.4 6.5-7.9 10.3-.3.2-.7.4-1.1.4z',
  diamonds: 'M12 2.2 20.4 12 12 21.8 3.6 12z',
  clubs:
    'M12 2.6a4.1 4.1 0 0 0-3.3 6.6 4.1 4.1 0 1 0-1.5 7.7c1.2 0 2.3-.5 3-1.4-.2 2-1 3.6-2.3 4.7h8.2c-1.3-1.1-2.1-2.7-2.3-4.7.7.9 1.8 1.4 3 1.4a4.1 4.1 0 1 0-1.5-7.7A4.1 4.1 0 0 0 12 2.6z',
};

// ألوان الرموز موحّدة في theme (لا hex محلي)
export { SUIT_COLORS };

export default function SuitIcon({ suit, size = 24, color }: SuitProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d={PATHS[suit]} fill={color || SUIT_COLORS[suit]} />
    </Svg>
  );
}
