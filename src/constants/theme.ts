// ============================================================
// جرب حظك — Design System "Velvet & Gold"
// كازينو حي: أوبسيديان + جوخ زمردي + ذهب معدني
// ============================================================

export const COLORS = {
  // --- الخلفيات (أوبسيديان بميلان أخضر خفيف) ---
  bg: '#060A08',
  bgSoft: '#0B120E',
  surface: '#111A15',
  surfaceRaised: '#18241D',
  surfaceSunken: '#080D0A',

  // --- الذهب ---
  gold: '#D4AF37',
  goldLight: '#F7E7A6',
  goldDeep: '#8C6D1F',
  goldGlow: 'rgba(212,175,55,0.35)',
  onGold: '#1A1206',

  // --- الجوخ (سطح الطاولة) ---
  felt: '#0C5B41',
  feltLight: '#127954',
  feltDark: '#053125',
  feltEdge: '#04211A',

  // --- الحافة الجلدية ---
  rail: '#2A1A11',
  railLight: '#432A19',
  railDark: '#160D07',

  // --- الأكسنت ---
  emerald: '#1FBF75',
  crimson: '#E23D4D',
  azure: '#3F8CFF',
  violet: '#8B5CF6',
  amber: '#F5A524',

  // --- دلالات ---
  success: '#1FBF75',
  danger: '#E23D4D',
  info: '#3F8CFF',
  warning: '#F5A524',

  // --- النصوص ---
  text: '#F6F2E8',
  textDim: '#A9A395',
  textFaint: '#6C675C',
  textOnDark: '#F6F2E8',

  // --- الحدود ---
  border: 'rgba(255,255,255,0.07)',
  borderStrong: 'rgba(255,255,255,0.13)',
  hairlineGold: 'rgba(212,175,55,0.22)',

  // --- طبقات ---
  scrim: 'rgba(4,8,6,0.72)',
  overlay: 'rgba(6,10,8,0.92)',

  // --- توافق خلفي (لا تستخدمها في كود جديد) ---
  bgPrimary: '#060A08',
  bgSurface: '#111A15',
  bgSurfaceLight: '#18241D',
  primary: '#D4AF37',
  primaryLight: '#F7E7A6',
  primaryDark: '#8C6D1F',
  secondary: '#3F8CFF',
  accent: '#1FBF75',
  textPrimary: '#F6F2E8',
  textMuted: '#A9A395',
  textDark: '#1A1206',
  tableGreen: '#0C5B41',
} as const;

export const GRADIENTS = {
  /** ذهب معدني حقيقي — 4 محطات تعطي انعكاس */
  goldMetal: ['#F7E7A6', '#DCBB55', '#A97F22', '#E3C877'] as const,
  goldSoft: ['rgba(247,231,166,0.22)', 'rgba(169,127,34,0.10)'] as const,
  /** خلفية الشاشة */
  screen: ['#0A120E', '#060A08', '#040706'] as const,
  /** جوخ الطاولة (من المركز للخارج) */
  felt: ['#127954', '#0C5B41', '#053125'] as const,
  /** حافة الطاولة الجلدية */
  rail: ['#4A2F1C', '#2A1A11', '#160D07'] as const,
  /** سطح البطاقات */
  surface: ['rgba(255,255,255,0.055)', 'rgba(255,255,255,0.015)'] as const,
  surfaceGold: ['rgba(212,175,55,0.14)', 'rgba(212,175,55,0.02)'] as const,
  /** أزرار الأكشن */
  danger: ['#F05262', '#B22334'] as const,
  success: ['#2FD98A', '#0E8B52'] as const,
  info: ['#5AA0FF', '#1F5FD0'] as const,
  /** وجه البطاقة */
  cardFace: ['#FFFDF6', '#EDE6D4'] as const,
  cardBack: ['#8E1F2E', '#5A1220'] as const,
} as const;

export const FONTS = {
  /** Cairo — يدعم العربية بالكامل */
  ar: {
    regular: 'Cairo-Regular',
    medium: 'Cairo-Medium',
    semibold: 'Cairo-SemiBold',
    bold: 'Cairo-Bold',
    black: 'Cairo-Black',
  },
  /** Inter — للأرقام واللاتيني */
  num: {
    medium: 'Inter-Medium',
    semibold: 'Inter-SemiBold',
    bold: 'Inter-Bold',
    black: 'Inter-Black',
  },

  // --- توافق خلفي ---
  arabic: {
    light: 'Cairo-Regular',
    regular: 'Cairo-Regular',
    medium: 'Cairo-Medium',
    bold: 'Cairo-Bold',
  },
  english: {
    regular: 'Inter-Medium',
    semibold: 'Inter-SemiBold',
    bold: 'Inter-Bold',
  },
} as const;

/** مقياس طباعي متناسق (1.25) */
export const TYPE = {
  display: { fontSize: 34, lineHeight: 46 },
  h1: { fontSize: 26, lineHeight: 38 },
  h2: { fontSize: 21, lineHeight: 32 },
  h3: { fontSize: 17, lineHeight: 27 },
  body: { fontSize: 15, lineHeight: 25 },
  small: { fontSize: 13, lineHeight: 21 },
  caption: { fontSize: 11, lineHeight: 17 },
  micro: { fontSize: 10, lineHeight: 14 },
} as const;

export const FONT_SIZES = {
  hero: 34,
  h1: 26,
  h2: 21,
  h3: 17,
  body: 15,
  small: 13,
  caption: 11,
} as const;

/** مسافات بمقياس 4pt */
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const RADIUS = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  card: 8,
  full: 999,
} as const;

export const SIZES = {
  avatarXs: 28,
  avatarSm: 36,
  avatarMd: 48,
  avatarLg: 64,
  avatarXl: 92,
  buttonHeight: 54,
  buttonHeightSm: 42,
  inputHeight: 54,
  chipDiameter: 40,
  cardWidth: 60,
  cardHeight: 84,
  cardInHandWidth: 48,
  cardInHandHeight: 67,
  tabBarHeight: 68,
  screenPadding: 20,
} as const;

/** ظلال متدرجة — الارتفاع يحدد العمق */
export const SHADOWS = {
  e1: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 3,
  },
  e2: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 8,
  },
  e3: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.55,
    shadowRadius: 28,
    elevation: 16,
  },
  /** توهج ذهبي — للعناصر الأساسية */
  gold: {
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 10,
  },
  goldSoft: {
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  felt: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.7,
    shadowRadius: 32,
    elevation: 20,
  },
  // توافق خلفي
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 8,
  },
  neon: {
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 18,
    elevation: 12,
  },
};

export const ANIMATION = {
  fast: 140,
  normal: 240,
  medium: 380,
  slow: 620,
  /** منحنى نابض للأزرار */
  spring: { damping: 15, stiffness: 220, mass: 0.6 },
  springSoft: { damping: 18, stiffness: 140, mass: 0.9 },
} as const;

// ============================================================
// ثوابت التطبيق
// ============================================================

export const WEEKLY_REFILL_AMOUNT = 10_000;
export const REFILL_TIMEZONE = 'Asia/Riyadh';
export const REFILL_DAY = 5; // الجمعة
export const REFILL_HOUR = 12;

/** تنسيق الأرقام بفواصل لاتينية (أوضح داخل الطاولة) */
export function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

/** اختصار المبالغ الكبيرة: 12500 -> 12.5K */
export function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1)}K`;
  return String(n);
}
