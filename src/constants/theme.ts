// ============================================================
// جرب حظك — Theme Constants
// Based on UI/UX Pro Max — Cyberpunk UI design system
// ============================================================

export const COLORS = {
  // خلفيات
  bgPrimary: '#0F172A',
  bgSurface: '#1F1829',
  bgSurfaceLight: '#2A2340',

  // نيون
  primary: '#DC2626',
  primaryLight: '#EF4444',
  primaryDark: '#991B1B',

  secondary: '#2563EB',
  secondaryLight: '#3B82F6',

  accent: '#22C55E',
  accentLight: '#4ADE80',

  neonBlue: '#2563EB',
  neonRed: '#DC2626',
  neonGreen: '#22C55E',
  neonCyan: '#00D4FF',

  // الطاولة
  tableGreen: '#0F172A',
  tableGreenLight: '#1F1829',
  tableGreenDark: '#0A0F1A',

  // إجراءات
  danger: '#DC2626',
  success: '#22C55E',
  info: '#2563EB',

  // نصوص
  textPrimary: '#FFFFFF',
  textMuted: '#94A3B8',
  textDark: '#0F172A',

  // حدود
  border: 'rgba(255, 255, 255, 0.08)',

  // شفافيات
  overlay: 'rgba(15, 23, 42, 0.9)',
} as const;

export const GRADIENTS = {
  gold: ['#DC2626', '#991B1B', '#DC2626'] as readonly string[],
  surface: ['#1F1829', '#0F172A'] as readonly string[],
  table: ['#1F1829', '#0F172A', '#0A0F1A'] as readonly string[],
};

export const FONTS = {
  arabic: {
    bold: 'Orbitron-Bold',
    regular: 'Orbitron-Regular',
    medium: 'Orbitron-Medium',
    light: 'Orbitron-Light',
  },
  english: {
    bold: 'JetBrainsMono-Bold',
    semibold: 'JetBrainsMono-SemiBold',
    regular: 'JetBrainsMono-Regular',
  },
} as const;

export const FONT_SIZES = {
  hero: 40,
  h1: 32,
  h2: 24,
  h3: 18,
  body: 16,
  small: 14,
  caption: 12,
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const RADIUS = {
  sm: 8,
  md: 16,
  lg: 24,
  full: 999,
  card: 8,
} as const;

export const SIZES = {
  avatarSm: 32,
  avatarMd: 48,
  avatarLg: 64,
  buttonHeight: 56,
  inputHeight: 56,
  chipDiameter: 40,
  cardWidth: 60,
  cardHeight: 84,
  cardInHandWidth: 48,
  cardInHandHeight: 67,
  tabBarHeight: 64,
} as const;

export const SHADOWS = {
  gold: {
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 8,
  },
  card: {
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  neon: {
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 10,
  },
};

export const ANIMATION = {
  fast: 100,
  normal: 250,
  medium: 400,
  slow: 600,
} as const;

// ============================================================
// ثوابت التطبيق
// ============================================================

export const WEEKLY_REFILL_AMOUNT = 10_000;
export const REFILL_TIMEZONE = 'Asia/Riyadh';
export const REFILL_DAY = 5; // Friday
export const REFILL_HOUR = 12;
