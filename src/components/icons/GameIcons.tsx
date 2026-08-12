import React from 'react';
import Svg, { Path, Circle, Rect, G } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
}

export const TexasIcon = ({ size = 48, color = '#D4AF37' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 48 48">
    <G fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Rect x="8" y="12" width="32" height="24" rx="3" />
      <Path d="M14 18h8M14 24h20M14 30h14" strokeWidth="1.5" />
      <Circle cx="34" cy="30" r="3" fill={color} fillOpacity="0.2" />
    </G>
  </Svg>
);

export const BlackjackIcon = ({ size = 48, color = '#D4AF37' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 48 48">
    <G fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Rect x="10" y="8" width="14" height="22" rx="2" fill={color} fillOpacity="0.12" />
      <Rect x="24" y="18" width="14" height="22" rx="2" />
      <Path d="M15 14h4M28 24h6M28 30h6" strokeWidth="1.5" />
    </G>
  </Svg>
);
