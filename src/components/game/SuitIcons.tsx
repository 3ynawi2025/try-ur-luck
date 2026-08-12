import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface SuitProps {
  suit: 'spades' | 'hearts' | 'diamonds' | 'clubs';
  size?: number;
  color?: string;
}

const Spade = ({ size = 24, color = '#212121' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M12 2.5C9.5 6 4.5 9 4.5 13.5 4.5 16.5 6.5 18.5 9 18.5c1.6 0 3-.8 3.9-2V21c0 .6-.4 1-1 1h-1c-.6 0-1 .4-1 1s.4 1 1 1h5c.6 0 1-.4 1-1s-.4-1-1-1h-1c-.6 0-1-.4-1-1v-4.5c.9 1.2 2.3 2 3.9 2 2.5 0 4.5-2 4.5-5C19.5 9 14.5 6 12 2.5z"
      fill={color}
    />
  </Svg>
);

const Heart = ({ size = 24, color = '#D32F2F' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
      fill={color}
    />
  </Svg>
);

const Diamond = ({ size = 24, color = '#D32F2F' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M12 2L22 12L12 22L2 12L12 2Z" fill={color} />
  </Svg>
);

const Club = ({ size = 24, color = '#212121' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M16.5 9c-1.2 0-2.3.5-3.1 1.3.4-.8.6-1.7.6-2.6 0-2.8-2.2-5-5-5s-5 2.2-5 5c0 .9.2 1.8.6 2.6-.8-.8-1.9-1.3-3.1-1.3-2.5 0-4.5 2-4.5 4.5S3.5 18 6 18c1.6 0 3-.8 3.9-2-.3.8-.4 1.7-.4 2.5 0 2.8 2.2 5 5 5s5-2.2 5-5c0-.8-.1-1.7-.4-2.5.9 1.2 2.3 2 3.9 2 2.5 0 4.5-2 4.5-4.5S19 9 16.5 9z"
      fill={color}
    />
  </Svg>
);

export default function SuitIcon({ suit, size = 24, color }: SuitProps) {
  const defaultColor = suit === 'hearts' || suit === 'diamonds' ? '#C62828' : '#212121';
  const c = color || defaultColor;

  switch (suit) {
    case 'spades': return <Spade size={size} color={c} />;
    case 'hearts': return <Heart size={size} color={c} />;
    case 'diamonds': return <Diamond size={size} color={c} />;
    case 'clubs': return <Club size={size} color={c} />;
  }
}

export const SUIT_COLORS = {
  spades: '#212121',
  hearts: '#C62828',
  diamonds: '#C62828',
  clubs: '#212121',
} as const;
