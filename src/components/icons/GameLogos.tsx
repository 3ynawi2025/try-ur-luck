// ============================================================
// جرب حظك — شعارات الألعاب
// شعارات SVG مرسومة لكل لعبة بهوية الطاولة (ذهبي فاخر على داكن)
// viewBox موحّد 64×64 — تناسب الزخرفة الدائرية وبطاقات الطاولات
// ============================================================

import React from 'react';
import Svg, { Path, Circle, Rect, G, Text as SvgText } from 'react-native-svg';
import { COLORS } from '../../constants/theme';

export type GameLogoKind = 'holdem' | 'blackjack' | 'roulette' | 'three_card' | 'russian' | 'vip';

interface LogoProps {
  size?: number;
}

const GOLD = COLORS.gold; // #C9A961
const GOLD_LIGHT = COLORS.goldLight; // #E3C98A
const CARD_DARK = '#14110C';
const CARD_DEEPER = '#0D0B08';
const POCKET_RED = '#B23A3A';
const POCKET_GREEN = '#0E4635';
const POCKET_BLACK = '#171310';
const IVORY = '#F2EFE9';

const base = (size: number) => ({ width: size, height: size, viewBox: '0 0 64 64' });

/** ورقة بستوني (♠) — مركزها (0,0) وتمتد تقريبًا 12×18 */
function Spade({ x, y, s, fill, stroke }: { x: number; y: number; s: number; fill: string; stroke: string }) {
  return (
    <G transform={`translate(${x} ${y}) scale(${s})`}>
      <Path
        d="M 0 -8 C 3.2 -8 5.6 -5.4 5.6 -2.2 C 5.6 1.4 2.6 3.5 0 6 C -2.6 3.5 -5.6 1.4 -5.6 -2.2 C -5.6 -5.4 -3.2 -8 0 -8 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth={1.1}
        strokeLinejoin="round"
      />
      <Path
        d="M 0 5.2 C -0.4 7 -1.4 8.4 -2.6 9.4 C -1 8.9 0.9 8.9 2.6 9.4 C 1.4 8.4 0.4 7 0 5.2 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth={1.1}
        strokeLinejoin="round"
      />
    </G>
  );
}

/** ديناري (♦) صغير */
function Diamond({ x, y, s, fill }: { x: number; y: number; s: number; fill: string }) {
  return (
    <Path
      d={`M ${x} ${y - 6 * s} L ${x + 4.2 * s} ${y} L ${x} ${y + 6 * s} L ${x - 4.2 * s} ${y} Z`}
      fill={fill}
    />
  );
}

/** قلب (♥) صغير */
function Heart({ x, y, s, fill }: { x: number; y: number; s: number; fill: string }) {
  return (
    <Path
      d={`M ${x} ${y + 4.2 * s} C ${x - 4.2 * s} ${y - 0.2 * s} ${x - 8.4 * s} ${y - 1.6 * s} ${x - 8.4 * s} ${y - 5.4 * s} C ${x - 8.4 * s} ${y - 8.6 * s} ${x - 5.8 * s} ${y - 10 * s} ${x - 3.2 * s} ${y - 10 * s} C ${x - 1 * s} ${y - 10 * s} ${x} ${y - 9.2 * s} ${x} ${y - 7.6 * s} C ${x} ${y - 9.2 * s} ${x + 1 * s} ${y - 10 * s} ${x + 3.2 * s} ${y - 10 * s} C ${x + 5.8 * s} ${y - 10 * s} ${x + 8.4 * s} ${y - 8.6 * s} ${x + 8.4 * s} ${y - 5.4 * s} C ${x + 8.4 * s} ${y - 1.6 * s} ${x + 4.2 * s} ${y - 0.2 * s} ${x} ${y + 4.2 * s} Z`}
      fill={fill}
    />
  );
}

/** نجمة خماسية (شعار البوكر الروسي) — مركزها (0,0) بنصف قطر 10 */
function Star({ x, y, s, fill, stroke }: { x: number; y: number; s: number; fill: string; stroke?: string }) {
  return (
    <Path
      d="M 0 -10 L 2.47 -3.4 L 9.51 -3.09 L 3.99 1.3 L 5.88 8.09 L 0 4.2 L -5.88 8.09 L -3.99 1.3 L -9.51 -3.09 L -2.47 -3.4 Z"
      fill={fill}
      stroke={stroke}
      strokeWidth={stroke ? 1 : 0}
      strokeLinejoin="round"
      transform={`translate(${x} ${y}) scale(${s})`}
    />
  );
}

// ------------------------------------------------------------
// تكساس هولدم — ورقتان مقلوبتان (جيوب) مع بستوني
// ------------------------------------------------------------
export const HoldemLogo = ({ size = 52 }: LogoProps) => (
  <Svg {...base(size)}>
    {/* الورقة اليسرى */}
    <G transform="translate(24 36) rotate(-10)">
      <Rect x={-10} y={-14} width={20} height={28} rx={2.5} fill={CARD_DEEPER} stroke={GOLD} strokeWidth={1.6} />
    </G>
    {/* الورقة اليمنى */}
    <G transform="translate(40 36) rotate(10)">
      <Rect x={-10} y={-14} width={20} height={28} rx={2.5} fill={CARD_DARK} stroke={GOLD_LIGHT} strokeWidth={1.6} />
    </G>
    <Spade x={23} y={31} s={0.55} fill={GOLD} stroke={GOLD_LIGHT} />
    <Spade x={41} y={31} s={0.55} fill={GOLD} stroke={GOLD_LIGHT} />
  </Svg>
);

// ------------------------------------------------------------
// بلاك جاك — ورقة آس مع بستوني كبير ورقم 21
// ------------------------------------------------------------
export const BlackjackLogo = ({ size = 52 }: LogoProps) => (
  <Svg {...base(size)}>
    <Rect x={20} y={17} width={24} height={34} rx={3} fill={CARD_DEEPER} stroke={GOLD_LIGHT} strokeWidth={1.8} />
    <SvgText
      x={23.5}
      y={24.5}
      fontSize={7}
      fontWeight="bold"
      fill={GOLD_LIGHT}
      textAnchor="middle"
    >
      A
    </SvgText>
    <Spade x={32} y={33} s={0.75} fill={GOLD} stroke={GOLD_LIGHT} />
    <SvgText
      x={32}
      y={46}
      fontSize={11}
      fontWeight="bold"
      fill={IVORY}
      textAnchor="middle"
    >
      21
    </SvgText>
  </Svg>
);

// ------------------------------------------------------------
// الروليت — عجلة بجيوب حمراء/سوداء وجيب أخضر وكرة
// ------------------------------------------------------------
export const RouletteLogo = ({ size = 52 }: LogoProps) => (
  <Svg {...base(size)}>
    {/* الهالة الخارجية */}
    <Circle cx={32} cy={32} r={28.5} fill="none" stroke={GOLD_LIGHT} strokeWidth={1.2} opacity={0.55} />
    {/* القرص */}
    <Circle cx={32} cy={32} r={26} fill={CARD_DEEPER} stroke={GOLD} strokeWidth={2} />
    {/* الجيوب: 0 أخضر ثم أحمر/أسود بالتناوب */}
    <Path d="M 32.0 27.5 L 32.0 7.5 A 24.5 24.5 0 0 1 46.4 12.2 L 34.6 28.4 A 4.5 4.5 0 0 0 32.0 27.5 Z" fill={POCKET_GREEN} />
    <Path d="M 34.6 28.4 L 46.4 12.2 A 24.5 24.5 0 0 1 55.3 24.4 L 36.3 30.6 A 4.5 4.5 0 0 0 34.6 28.4 Z" fill={POCKET_RED} />
    <Path d="M 36.3 30.6 L 55.3 24.4 A 24.5 24.5 0 0 1 55.3 39.6 L 36.3 33.4 A 4.5 4.5 0 0 0 36.3 30.6 Z" fill={POCKET_BLACK} />
    <Path d="M 36.3 33.4 L 55.3 39.6 A 24.5 24.5 0 0 1 46.4 51.8 L 34.6 35.6 A 4.5 4.5 0 0 0 36.3 33.4 Z" fill={POCKET_RED} />
    <Path d="M 34.6 35.6 L 46.4 51.8 A 24.5 24.5 0 0 1 32.0 56.5 L 32.0 36.5 A 4.5 4.5 0 0 0 34.6 35.6 Z" fill={POCKET_BLACK} />
    <Path d="M 32.0 36.5 L 32.0 56.5 A 24.5 24.5 0 0 1 17.6 51.8 L 29.4 35.6 A 4.5 4.5 0 0 0 32.0 36.5 Z" fill={POCKET_RED} />
    <Path d="M 29.4 35.6 L 17.6 51.8 A 24.5 24.5 0 0 1 8.7 39.6 L 27.7 33.4 A 4.5 4.5 0 0 0 29.4 35.6 Z" fill={POCKET_BLACK} />
    <Path d="M 27.7 33.4 L 8.7 39.6 A 24.5 24.5 0 0 1 8.7 24.4 L 27.7 30.6 A 4.5 4.5 0 0 0 27.7 33.4 Z" fill={POCKET_RED} />
    <Path d="M 27.7 30.6 L 8.7 24.4 A 24.5 24.5 0 0 1 17.6 12.2 L 29.4 28.4 A 4.5 4.5 0 0 0 27.7 30.6 Z" fill={POCKET_BLACK} />
    <Path d="M 29.4 28.4 L 17.6 12.2 A 24.5 24.5 0 0 1 32.0 7.5 L 32.0 27.5 A 4.5 4.5 0 0 0 29.4 28.4 Z" fill={POCKET_RED} />
    {/* المحور */}
    <Circle cx={32} cy={32} r={5} fill={CARD_DARK} stroke={GOLD_LIGHT} strokeWidth={1.6} />
    <Circle cx={32} cy={32} r={2} fill={GOLD} />
    {/* الكرة */}
    <Circle cx={40.2} cy={6.8} r={2.4} fill={IVORY} stroke={GOLD} strokeWidth={1} />
  </Svg>
);

// ------------------------------------------------------------
// ثلاث أوراق بوكر — ثلاث ورقات متباعدة (مروحة)
// ------------------------------------------------------------
export const ThreeCardLogo = ({ size = 52 }: LogoProps) => (
  <Svg {...base(size)}>
    {/* الورقة اليسرى */}
    <G transform="translate(22 40) rotate(-18)">
      <Rect x={-9} y={-13} width={18} height={26} rx={2.2} fill={CARD_DEEPER} stroke={GOLD} strokeWidth={1.4} />
    </G>
    {/* الورقة اليمنى */}
    <G transform="translate(42 40) rotate(18)">
      <Rect x={-9} y={-13} width={18} height={26} rx={2.2} fill={CARD_DEEPER} stroke={GOLD} strokeWidth={1.4} />
    </G>
    {/* الورقة الوسطى */}
    <G transform="translate(32 36)">
      <Rect x={-9} y={-13} width={18} height={26} rx={2.2} fill={CARD_DARK} stroke={GOLD_LIGHT} strokeWidth={1.6} />
    </G>
    {/* الرموز */}
    <Heart x={20.5} y={41} s={0.9} fill={POCKET_RED} />
    <Diamond x={32} y={36} s={0.9} fill={GOLD_LIGHT} />
    <Spade x={43.5} y={41} s={0.45} fill={GOLD} stroke={GOLD_LIGHT} />
  </Svg>
);

// ------------------------------------------------------------
// البوكر الروسي — ورقة بنجمة حمراء خماسية
// ------------------------------------------------------------
export const RussianLogo = ({ size = 52 }: LogoProps) => (
  <Svg {...base(size)}>
    <Rect x={20} y={17} width={24} height={34} rx={3} fill={CARD_DEEPER} stroke={GOLD_LIGHT} strokeWidth={1.8} />
    <Star x={32} y={35} s={0.95} fill={POCKET_RED} stroke="#7E2727" />
    <Star x={24} y={22.5} s={0.3} fill={POCKET_RED} stroke="#7E2727" />
    <Star x={40} y={46.5} s={0.22} fill={GOLD} />
  </Svg>
);

// ------------------------------------------------------------
// الاشتراك الذهبي — تاج ذهبي
// ------------------------------------------------------------
export const VipLogo = ({ size = 52 }: LogoProps) => (
  <Svg {...base(size)}>
    <Path
      d="M 16 44 L 20 20 L 28.5 28 L 32 18.5 L 35.5 28 L 44 20 L 48 44 Z"
      fill={GOLD}
      fillOpacity={0.28}
      stroke={GOLD_LIGHT}
      strokeWidth={2.2}
      strokeLinejoin="round"
    />
    <Path d="M 18.5 49.5 H 45.5" stroke={GOLD_LIGHT} strokeWidth={2.4} strokeLinecap="round" />
    <Circle cx={32} cy={31} r={2.6} fill={GOLD_LIGHT} />
  </Svg>
);

// ------------------------------------------------------------
// الموزّع الموحّد
// ------------------------------------------------------------
export function GameLogo({ kind, size = 52 }: { kind: GameLogoKind; size?: number }) {
  switch (kind) {
    case 'holdem':
      return <HoldemLogo size={size} />;
    case 'blackjack':
      return <BlackjackLogo size={size} />;
    case 'roulette':
      return <RouletteLogo size={size} />;
    case 'three_card':
      return <ThreeCardLogo size={size} />;
    case 'russian':
      return <RussianLogo size={size} />;
    case 'vip':
      return <VipLogo size={size} />;
    default:
      return null;
  }
}
