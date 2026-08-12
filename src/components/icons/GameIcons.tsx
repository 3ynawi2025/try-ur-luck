// ============================================================
// جرب حظك — Icon Set
// أيقونات SVG بدل الإيموجي (خط 1.6 موحّد، viewBox 24)
// ============================================================

import React from 'react';
import Svg, { Path, Circle, Rect, G, Ellipse, Line } from 'react-native-svg';
import { COLORS } from '../../constants/theme';

export interface IconProps {
  size?: number;
  color?: string;
  /** يملأ الشكل بدل التفريغ — للحالة النشطة */
  filled?: boolean;
}

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
});

// ------------------------------------------------------------
// التنقّل السفلي
// ------------------------------------------------------------

export const HomeIcon = ({ size = 24, color = COLORS.textDim, filled }: IconProps) => (
  <Svg {...base(size)}>
    <Path
      d="M3.5 10.2 12 3.5l8.5 6.7V20a.9.9 0 0 1-.9.9h-4.4v-6.2H8.8v6.2H4.4a.9.9 0 0 1-.9-.9z"
      fill={filled ? color : 'none'}
      fillOpacity={filled ? 0.18 : 0}
      stroke={color}
      strokeWidth={1.6}
      strokeLinejoin="round"
    />
  </Svg>
);

export const CardsIcon = ({ size = 24, color = COLORS.textDim, filled }: IconProps) => (
  <Svg {...base(size)}>
    <G stroke={color} strokeWidth={1.6} strokeLinejoin="round">
      <Rect
        x={3.2}
        y={6.4}
        width={10}
        height={13.4}
        rx={2}
        fill={filled ? color : 'none'}
        fillOpacity={filled ? 0.16 : 0}
        transform="rotate(-11 8.2 13.1)"
      />
      <Rect
        x={11}
        y={4.4}
        width={10}
        height={13.4}
        rx={2}
        fill={filled ? color : 'none'}
        fillOpacity={filled ? 0.3 : 0}
        transform="rotate(9 16 11.1)"
      />
    </G>
  </Svg>
);

export const TrophyIcon = ({ size = 24, color = COLORS.textDim, filled }: IconProps) => (
  <Svg {...base(size)}>
    <G stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" fill="none">
      <Path
        d="M7 4h10v5.2a5 5 0 0 1-10 0z"
        fill={filled ? color : 'none'}
        fillOpacity={filled ? 0.22 : 0}
      />
      <Path d="M7 5.4H4.6v1.4A3.2 3.2 0 0 0 7.3 10M17 5.4h2.4v1.4A3.2 3.2 0 0 1 16.7 10" />
      <Path d="M12 14.2V17M8.6 20.4h6.8M9.6 20.4c0-1.9.9-3.4 2.4-3.4s2.4 1.5 2.4 3.4" />
    </G>
  </Svg>
);

export const UserIcon = ({ size = 24, color = COLORS.textDim, filled }: IconProps) => (
  <Svg {...base(size)}>
    <G stroke={color} strokeWidth={1.6} strokeLinecap="round">
      <Circle
        cx={12}
        cy={8.2}
        r={3.7}
        fill={filled ? color : 'none'}
        fillOpacity={filled ? 0.22 : 0}
      />
      <Path
        d="M4.8 20.2c0-3.6 3.2-6 7.2-6s7.2 2.4 7.2 6"
        fill={filled ? color : 'none'}
        fillOpacity={filled ? 0.16 : 0}
      />
    </G>
  </Svg>
);

// ------------------------------------------------------------
// الألعاب
// ------------------------------------------------------------

/** تكساس هولدم — ورقتان مائلتان مع رمزي بستوني وكوبة */
export const TexasIcon = ({ size = 44, color = COLORS.gold }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 48 48">
    <G>
      <Rect
        x={7}
        y={12}
        width={19}
        height={26}
        rx={3}
        fill="rgba(255,255,255,0.04)"
        stroke={color}
        strokeWidth={1.8}
        transform="rotate(-13 16.5 25)"
      />
      <Rect
        x={22}
        y={10}
        width={19}
        height={26}
        rx={3}
        fill="rgba(255,255,255,0.07)"
        stroke={color}
        strokeWidth={1.8}
        transform="rotate(11 31.5 23)"
      />
      <Path
        d="M31.4 18.6c2.9 2.4 4.6 3.7 4.6 5.5a2.3 2.3 0 0 1-4.6.3 2.3 2.3 0 0 1-4.6-.3c0-1.8 1.7-3.1 4.6-5.5z"
        fill={color}
        transform="rotate(11 31.5 23)"
      />
      <Path
        d="M15.4 20.4c2.5 2.6 3.9 3.8 3.9 5.4a2 2 0 0 1-2.9 1.8l.7 2.3h-3.4l.7-2.3a2 2 0 0 1-2.9-1.8c0-1.6 1.4-2.8 3.9-5.4z"
        fill={color}
        fillOpacity={0.75}
        transform="rotate(-13 16.5 25)"
      />
    </G>
  </Svg>
);

/** بلاك جاك — ورقة + دائرة "21" */
export const BlackjackIcon = ({ size = 44, color = COLORS.gold }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 48 48">
    <G>
      <Rect
        x={6}
        y={11}
        width={20}
        height={27}
        rx={3}
        fill="rgba(255,255,255,0.05)"
        stroke={color}
        strokeWidth={1.8}
      />
      <Path
        d="M16 17.5c3 3.1 4.7 4.6 4.7 6.5a2.4 2.4 0 0 1-3.5 2.2l.9 2.8h-4.2l.9-2.8a2.4 2.4 0 0 1-3.5-2.2c0-1.9 1.7-3.4 4.7-6.5z"
        fill={color}
      />
      <Circle cx={33} cy={26} r={11} fill="rgba(0,0,0,0.35)" stroke={color} strokeWidth={1.8} />
      <Circle cx={33} cy={26} r={7.6} stroke={color} strokeWidth={1} strokeDasharray="3 3" fill="none" />
      <Path
        d="M29.4 22.6h1.5v7M34.1 22.6h2.4v2.9h-2.4v3.1h2.6"
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </G>
  </Svg>
);

// ------------------------------------------------------------
// واجهة
// ------------------------------------------------------------

export const ChipIcon = ({ size = 24, color = COLORS.gold }: IconProps) => (
  <Svg {...base(size)}>
    <Circle cx={12} cy={12} r={8.6} fill="none" stroke={color} strokeWidth={1.6} />
    <Circle cx={12} cy={12} r={4.4} fill="none" stroke={color} strokeWidth={1.2} strokeDasharray="2.4 2.2" />
    <G stroke={color} strokeWidth={1.9} strokeLinecap="round">
      <Line x1={12} y1={3.4} x2={12} y2={6.1} />
      <Line x1={12} y1={17.9} x2={12} y2={20.6} />
      <Line x1={3.4} y1={12} x2={6.1} y2={12} />
      <Line x1={17.9} y1={12} x2={20.6} y2={12} />
    </G>
  </Svg>
);

export const UsersIcon = ({ size = 24, color = COLORS.textDim }: IconProps) => (
  <Svg {...base(size)}>
    <G stroke={color} strokeWidth={1.6} strokeLinecap="round" fill="none">
      <Circle cx={9.2} cy={9} r={3.2} />
      <Path d="M3.6 19.4c0-3 2.5-5 5.6-5s5.6 2 5.6 5" />
      <Path d="M15.8 6.4a3.2 3.2 0 0 1 0 6M17 14.9c2.2.5 3.6 2.2 3.6 4.5" />
    </G>
  </Svg>
);

export const LockIcon = ({ size = 24, color = COLORS.textDim }: IconProps) => (
  <Svg {...base(size)}>
    <G stroke={color} strokeWidth={1.6} strokeLinejoin="round" fill="none">
      <Rect x={4.8} y={10.4} width={14.4} height={9.6} rx={2.4} fill={color} fillOpacity={0.12} />
      <Path d="M8.2 10.4V7.8a3.8 3.8 0 0 1 7.6 0v2.6" />
      <Circle cx={12} cy={15.2} r={1.5} fill={color} stroke="none" />
    </G>
  </Svg>
);

export const MicIcon = ({ size = 24, color = COLORS.text }: IconProps) => (
  <Svg {...base(size)}>
    <G stroke={color} strokeWidth={1.6} strokeLinecap="round" fill="none">
      <Rect x={9} y={3} width={6} height={11} rx={3} fill={color} fillOpacity={0.16} />
      <Path d="M5.6 11.4a6.4 6.4 0 0 0 12.8 0M12 17.8V21" />
    </G>
  </Svg>
);

export const MicOffIcon = ({ size = 24, color = COLORS.textDim }: IconProps) => (
  <Svg {...base(size)}>
    <G stroke={color} strokeWidth={1.6} strokeLinecap="round" fill="none">
      <Rect x={9} y={3} width={6} height={11} rx={3} />
      <Path d="M5.6 11.4a6.4 6.4 0 0 0 12.8 0M12 17.8V21" />
      <Line x1={4} y1={3.6} x2={20} y2={20.4} stroke={COLORS.crimson} strokeWidth={1.9} />
    </G>
  </Svg>
);

export const BackIcon = ({ size = 24, color = COLORS.text }: IconProps) => (
  <Svg {...base(size)}>
    <Path
      d="M9 5.5 15.6 12 9 18.5"
      fill="none"
      stroke={color}
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const ChevronIcon = ({ size = 24, color = COLORS.textFaint }: IconProps) => (
  <Svg {...base(size)}>
    <Path
      d="M14.4 5.8 8.2 12l6.2 6.2"
      fill="none"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const PlusIcon = ({ size = 24, color = COLORS.onGold }: IconProps) => (
  <Svg {...base(size)}>
    <Path
      d="M12 5.4v13.2M5.4 12h13.2"
      stroke={color}
      strokeWidth={2.1}
      strokeLinecap="round"
      fill="none"
    />
  </Svg>
);

export const CrownIcon = ({ size = 24, color = COLORS.gold }: IconProps) => (
  <Svg {...base(size)}>
    <Path
      d="M3.6 17.4 5 7.2l4 3.6L12 5l3 5.8 4-3.6-1.4 10.2z"
      fill={color}
      fillOpacity={0.24}
      stroke={color}
      strokeWidth={1.6}
      strokeLinejoin="round"
    />
    <Path d="M4.6 20.2h14.8" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
  </Svg>
);

export const ClockIcon = ({ size = 24, color = COLORS.textDim }: IconProps) => (
  <Svg {...base(size)}>
    <Circle cx={12} cy={12} r={8.4} fill="none" stroke={color} strokeWidth={1.6} />
    <Path d="M12 7.4V12l3.2 2" stroke={color} strokeWidth={1.7} strokeLinecap="round" fill="none" />
  </Svg>
);

export const SettingsIcon = ({ size = 24, color = COLORS.textDim }: IconProps) => (
  <Svg {...base(size)}>
    <G stroke={color} strokeWidth={1.6} fill="none">
      <Circle cx={12} cy={12} r={3.1} />
      <Path d="M12 2.8v2.4M12 18.8v2.4M21.2 12h-2.4M5.2 12H2.8M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7M18.5 18.5l-1.7-1.7M7.2 7.2 5.5 5.5" strokeLinecap="round" />
    </G>
  </Svg>
);

/** زر التعليمات — دائرة بداخلها حرف i (معلومات) */
export const InfoIcon = ({ size = 24, color = COLORS.textDim }: IconProps) => (
  <Svg {...base(size)}>
    <Circle cx={12} cy={12} r={9.2} stroke={color} strokeWidth={1.7} fill="none" />
    <Circle cx={12} cy={8.4} r={1.7} fill={color} />
    <Path d="M12 11.6v5" stroke={color} strokeWidth={1.9} strokeLinecap="round" />
  </Svg>
);

export const EditIcon = ({ size = 24, color = COLORS.textDim }: IconProps) => (
  <Svg {...base(size)}>
    <G stroke={color} strokeWidth={1.6} strokeLinejoin="round" fill="none">
      <Path d="M4 20h4.2L19.4 8.8a2.1 2.1 0 0 0 0-3l-1.2-1.2a2.1 2.1 0 0 0-3 0L4 15.8z" />
      <Path d="M14.6 6.2l3.2 3.2" />
    </G>
  </Svg>
);

export const LogoutIcon = ({ size = 24, color = COLORS.crimson }: IconProps) => (
  <Svg {...base(size)}>
    <G stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" fill="none">
      <Path d="M14.6 4.4H6.8A1.8 1.8 0 0 0 5 6.2v11.6a1.8 1.8 0 0 0 1.8 1.8h7.8" />
      <Path d="M15.4 8.4 19 12l-3.6 3.6M19 12h-8.6" />
    </G>
  </Svg>
);

export const TrendIcon = ({ size = 24, color = COLORS.emerald }: IconProps) => (
  <Svg {...base(size)}>
    <Path
      d="M3.6 16.4 9 10.8l3.4 3.4L20.4 6"
      fill="none"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path d="M15.6 6h4.8v4.8" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

/** شعار التطبيق — بستوني داخل درع ذهبي */
export const LogoMark = ({ size = 72, color = COLORS.gold }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 72 72">
    <Circle cx={36} cy={36} r={33} fill="rgba(212,175,55,0.07)" stroke={color} strokeWidth={1.4} />
    <Circle cx={36} cy={36} r={27.5} fill="none" stroke={color} strokeWidth={0.9} strokeDasharray="2 5" />
    <Path
      d="M36 15c9.8 8.6 15.6 12.9 15.6 19.4A7.6 7.6 0 0 1 38.4 40l2.8 9.4h-10.4L33.6 40a7.6 7.6 0 0 1-13.2-5.6C20.4 27.9 26.2 23.6 36 15z"
      fill={color}
    />
  </Svg>
);

/** ميدالية المركز — للوحة الصدارة */
export const MedalIcon = ({
  size = 32,
  rank = 1,
}: {
  size?: number;
  rank?: number;
}) => {
  const tint =
    rank === 1 ? ['#FFE9A3', '#D4AF37', '#8C6D1F'] :
    rank === 2 ? ['#F0F2F5', '#B9C0CA', '#77808C'] :
    ['#F0C6A0', '#C4804A', '#7C4A24'];
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Circle cx={16} cy={19} r={10.4} fill={tint[1]} />
      <Circle cx={16} cy={19} r={10.4} fill="none" stroke={tint[2]} strokeWidth={1.4} />
      <Circle cx={16} cy={19} r={7} fill={tint[0]} fillOpacity={0.55} />
      <Path d="M9.4 3h4.4l3.2 6.2-4.6 1.4z" fill={tint[2]} fillOpacity={0.8} />
      <Path d="M22.6 3h-4.4l-3.2 6.2 4.6 1.4z" fill={tint[2]} fillOpacity={0.55} />
    </Svg>
  );
};
