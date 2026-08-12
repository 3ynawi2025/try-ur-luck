// ============================================================
// جرب حظك — Theme Constants
// Based on UI_DESIGN.md palette & typography
// ============================================================

export const COLORS = {
  // خلفيات
  bgPrimary: '#0A0A1A',
  bgSurface: '#1A0A2E',
  bgSurfaceLight: '#2A1040',

  // ألوان ذهبية
  primary: '#00D4FF',
  primaryLight: '#7B2CBF',
  primaryDark: '#00B4D8',

  // نيون
  neonBlue: '#00D4FF',
  neonPurple: '#7B2CBF',
  neonPink: '#FF0055',
  neonCyan: '#00F5FF',

  // الطاولة
  tableGreen: '#0F0F2A',
  tableGreenLight: '#1A1A3E',
  tableGreenDark: '#050510',

  // إجراءات
  danger: '#FF0055',
  success: '#00F5FF',
  info: '#7B2CBF',

  // نصوص
  textPrimary: '#FFFFFF',
  textMuted: '#B0BEC5',
  textDark: '#0A0A1A',

  // حدود
  border: 'rgba(0, 212, 255, 0.3)',

  // شفافيات
  overlay: 'rgba(10, 10, 26, 0.9)',
} as const;

export const GRADIENTS = {
  gold: ['#00D4FF', '#7B2CBF', '#00B4D8'] as readonly string[],
  surface: ['#1A0A2E', '#0A0A1A'] as readonly string[],
  table: ['#1A1A3E', '#0F0F2A', '#050510'] as readonly string[],
};

export const FONTS = {
  arabic: {
    bold: 'Cairo-Bold',
    regular: 'Cairo-Regular',
    medium: 'Cairo-Medium',
    light: 'Cairo-Light',
  },
  english: {
    bold: 'Inter-Bold',
    semibold: 'Inter-SemiBold',
    regular: 'Inter-Regular',
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
    shadowColor: '#00D4FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 8,
  },
  card: {
    shadowColor: '#00D4FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  neon: {
    shadowColor: '#00D4FF',
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
