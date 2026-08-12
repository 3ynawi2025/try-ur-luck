// ============================================================
// جرب حظك — Theme Constants
// Based on UI_DESIGN.md palette & typography
// ============================================================

export const COLORS = {
  // خلفيات
  bgPrimary: '#0A0F14',
  bgSurface: '#132E35',
  bgSurfaceLight: '#1B3A42',

  // ألوان ذهبية
  primary: '#D4AF37',
  primaryLight: '#F4D03F',
  primaryDark: '#B5902A',

  // الطاولة
  tableGreen: '#1B5E20',
  tableGreenLight: '#2E7D32',
  tableGreenDark: '#0D3B10',

  // إجراءات
  danger: '#C62828',
  success: '#43A047',
  info: '#1565C0',

  // نصوص
  textPrimary: '#FFFFFF',
  textMuted: '#B0BEC5',
  textDark: '#0A0F14',

  // حدود
  border: 'rgba(212, 175, 55, 0.3)',

  // شفافيات
  overlay: 'rgba(10, 15, 20, 0.85)',
} as const;

export const GRADIENTS = {
  gold: ['#D4AF37', '#F4D03F', '#B5902A'] as readonly string[],
  surface: ['#132E35', '#0A0F14'] as readonly string[],
  table: ['#2E7D32', '#1B5E20', '#0D3B10'] as readonly string[],
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
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
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
