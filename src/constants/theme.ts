// ============================================================
// جرب حظك — Design System «Dark Luxe»
// فخامة من التقيّد لا الإسراف:
// خلفيات ليلية عميقة (3 طبقات) + شامبين واحد مقيّد (~5% من السطح)
// + حدود شعرية + ظلان فقط. مراجع: Ferrari (أكسنت مقيّد) وBugatti (تقشّف).
// ============================================================

export const COLORS = {
  // --- الخلفيات (ليلي عميق متدرج) ---
  bg: '#0A0D12',
  bgSoft: '#10151E',
  surface: '#151B26',
  surfaceRaised: '#1B2230',
  surfaceSunken: '#070A0F',
  surfaceHighest: '#232C3C',
  surfaceLow: '#0E131B',

  // --- الشامبين (الذهب الوحيد — يُستخدم بندرة) ---
  gold: '#C9A961',
  goldLight: '#E3C98A',
  goldDeep: '#8C6D2F',
  goldGlow: 'rgba(201,169,97,0.22)',
  onGold: '#14100A',
  onSecondaryFixed: '#14100A',

  // --- الجوخ (سطح الطاولة — زمردي ليلي عميق) ---
  felt: '#0A3D2E',
  feltLight: '#0E4635',
  feltDark: '#02150F',
  feltEdge: '#010D09',

  // --- الحافة الخشبية (ماهوغاني داكن) ---
  rail: '#2A1E12',
  railLight: '#3A2A19',
  railDark: '#171007',

  // --- الأكسنت (هادئ) ---
  emerald: '#8FCBB4', // primary (ميرمية زمردية)
  emeraldContainer: '#0A3D2E',
  crimson: '#E8A9A0', // tertiary / error
  crimsonContainer: '#5C0F16',
  azure: '#6E9DFF',
  violet: '#9A7BFF',
  amber: '#C9A961',

  // --- دلالات ---
  success: '#8FCBB4',
  danger: '#E8A9A0',
  info: '#6E9DFF',
  warning: '#C9A961',

  // --- النصوص (عاجي هادئ) ---
  text: '#F2EFE9',
  textDim: '#B5B7B2',
  textFaint: '#7C807A',
  textOnDark: '#F2EFE9',

  // --- الحدود (شعرية) ---
  border: 'rgba(242,239,233,0.08)',
  borderStrong: 'rgba(242,239,233,0.14)',
  hairlineGold: 'rgba(201,169,97,0.28)',
  goldRim: 'rgba(201,169,97,0.35)',
  outline: 'rgba(124,128,122,0.5)',

  // --- طبقات (زجاجية) ---
  scrim: 'rgba(4,6,10,0.72)',
  overlay: 'rgba(4,6,10,0.92)',
  glass: 'rgba(21,27,38,0.55)',

  // --- توافق خلفي (لا تستخدمها في كود جديد) ---
  bgPrimary: '#0A0D12',
} as const;

export const GRADIENTS = {
  /** شامبين معدني — 4 محطات تعطي انعكاسًا حقيقيًا */
  goldMetal: ['#E3C98A', '#C9A961', '#8C6D2F', '#C9A961'] as const,
  goldSoft: ['rgba(201,169,97,0.12)', 'rgba(201,169,97,0.02)'] as const,
  /** خلفية الشاشة (ليلي عميق) */
  screen: ['#10151E', '#0A0D12', '#070A0F'] as const,
  /** جوخ الطاولة (من المركز للخارج) */
  felt: ['#0E4635', '#0A3D2E', '#02150F'] as const,
  /** حافة الطاولة الخشبية */
  rail: ['#3A2A19', '#2A1E12', '#171007'] as const,
  /** سطح البطاقات (زجاجي) */
  surface: ['rgba(242,239,233,0.05)', 'rgba(242,239,233,0.012)'] as const,
  surfaceGold: ['rgba(201,169,97,0.10)', 'rgba(201,169,97,0.015)'] as const,
  /** أزرار الأكشن */
  danger: ['#7A1F2B', '#5C0F16'] as const,
  success: ['#8FCBB4', '#0A3D2E'] as const,
  info: ['#6E9DFF', '#2C4E9E'] as const,
  /** وجه البطاقة (عاجي كتاني) */
  cardFace: ['#FBFAF6', '#EFEAE0'] as const,
  cardBack: ['#1B2230', '#151B26'] as const,
  /** زر فخم بإطار شعري (مركز فحمي داكن) */
  goldRim: ['#151B26', '#0A0D12'] as const,
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
} as const;

/** مقياس طباعي متناسق (مكبّر للهوية الفاخرة) */
export const TYPE = {
  display: { fontSize: 40, lineHeight: 54 },
  h1: { fontSize: 30, lineHeight: 42 },
  h2: { fontSize: 24, lineHeight: 34 },
  h3: { fontSize: 19, lineHeight: 29 },
  body: { fontSize: 16, lineHeight: 26 },
  small: { fontSize: 14, lineHeight: 22 },
  caption: { fontSize: 12, lineHeight: 18 },
  micro: { fontSize: 11, lineHeight: 15 },
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

/** انحناءات موحدة: 4/8/12/20/28 */
export const RADIUS = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 20,
  xl: 28,
  card: 12,
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
  cardWidth: 64,
  cardHeight: 90,
  cardInHandWidth: 50,
  cardInHandHeight: 70,
  tabBarHeight: 68,
  screenPadding: 20,
} as const;

/** ظلان أساسيان فقط + توهج شامبين للعناصر الأساسية (الفخامة من التقيّد) */
export const SHADOWS = {
  e1: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
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
  /** توهج شامبين — للعناصر الأساسية فقط */
  gold: {
    shadowColor: '#C9A961',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  goldSoft: {
    shadowColor: '#C9A961',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 5,
  },
  /** زر بإطار معدني */
  goldRim: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 6,
  },
  felt: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.65,
    shadowRadius: 32,
    elevation: 20,
  },
  /** ظل بطاقة: إسقاط حاد واحد */
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  neon: {
    shadowColor: '#C9A961',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 18,
    elevation: 12,
  },
};

/** موشن: سريع للتفاعلات المتكررة، ناعم للانتقالات، متتابع للتوزيع */
export const ANIMATION = {
  fast: 140,
  normal: 240,
  medium: 380,
  slow: 620,
  /** تتابع توزيع الأوراق/عناصر القوائم */
  deal: 120,
  /** دخول العناصر عند فتح الشاشة */
  enter: 200,
  /** منحنى نابض للأزرار (خفيف) */
  spring: { damping: 16, stiffness: 190, mass: 0.8 },
  springSoft: { damping: 20, stiffness: 120, mass: 1 },
} as const;

// ============================================================
// لوحات ألوان المجال (Domain palettes) — أي لون حرفي في التطبيق يمر من هنا
// ============================================================

/** أزواج تدرّج الصور الرمزية — هادئة ومتناغمة مع الذهب */
export const AVATAR_PALETTES: [string, string][] = [
  ['#1E5E48', '#0B3227'],
  ['#4A2E6B', '#241338'],
  ['#7A3B22', '#3A1A0E'],
  ['#1D4E7A', '#0C2740'],
  ['#6B2B3C', '#33121C'],
  ['#2C5C2E', '#123014'],
  ['#5A4A1E', '#2B220B'],
  ['#28525C', '#0F2B31'],
];

/** تراكبات حالة الصورة الرمزية (كتم / يتحدث) */
export const AVATAR_OVERLAYS = {
  muted: 'rgba(30,16,18,0.95)',
  speaking: 'rgba(10,32,22,0.95)',
} as const;

/** رقاقات الكازينو حسب القيمة: أبيض < أحمر < أخضر < أسود/شامبين < بنفسجي */
export const CHIP_SKINS = {
  white: { face: '#E8E4DA', faceDark: '#B3ADA0', edge: '#3A3630', ink: '#26231E' },
  red: { face: '#8E2430', faceDark: '#4A1018', edge: '#F6E3E5', ink: '#FFFFFF' },
  green: { face: '#0A3D2E', faceDark: '#062A20', edge: '#DFF2EA', ink: '#FFFFFF' },
  black: { face: '#15161A', faceDark: '#050506', edge: '#C9A961', ink: '#E3C98A' },
  violet: { face: '#5B3FA8', faceDark: '#2E1F5E', edge: '#E8E2F5', ink: '#FFFFFF' },
} as const;

/** ألوان رموز الأوراق: أحمر دافئ للكوبة/الديناري، فحمي للبستوني/السباتي */
export const SUIT_COLORS = {
  spades: '#16161A',
  hearts: '#C1272D',
  diamonds: '#C1272D',
  clubs: '#16161A',
} as const;

/** ألوان حالات حضور الأصدقاء */
export const PRESENCE_COLORS = {
  online: '#8FCBB4',
  in_game: '#C9A961',
  offline: '#89938D',
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
  if (!Number.isFinite(n)) return '0';
  return n.toLocaleString('en-US');
}

/** اختصار المبالغ الكبيرة: 12500 -> 12.5K */
export function formatCompact(n: number): string {
  if (!Number.isFinite(n)) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1)}K`;
  return String(n);
}
