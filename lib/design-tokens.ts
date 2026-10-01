/**
 * PRESCOPE design tokens — v2.0 White + Dark Orange + Glassmorphism.
 *
 * Change a value here (and in tailwind.config.js + global.css if it is a
 * colour) instead of hunting through screens for hex codes.
 *
 * Legacy aliases (deepTeal, primaryBlue, cream, sage, …) remap to the
 * new orange palette so older screens shift without per-file edits.
 */

export const Colors = {
  // Core brand — orange gradient stops
  orangeDark: "#C84B11",
  orangeBright: "#E8650A",
  orangeLight: "#FF8C42",

  // Backgrounds
  softWhite: "#FDF9F7",
  pureWhite: "#FFFFFF",
  orangeTint: "#FFF3EC",
  orangeTintDeep: "#FFE8D6",

  // Text
  charcoal: "#1A1A1A",
  darkText: "#2D2D2D",
  bodyText: "#5C5C5C",
  mutedText: "#9B9B9B",
  placeholderText: "#C0B8B3",

  // Borders
  borderLight: "#F0E8E3",
  borderMedium: "#E0D5CE",
  borderGlass: "rgba(255,255,255,0.30)",
  borderOrangeGlass: "rgba(200,75,17,0.12)",

  // Status
  successGreen: "#2DB87A",
  successTint: "#E8F8F1",
  warningAmber: "#F5A623",
  warningTint: "#FFF8EC",
  dangerRed: "#E63B3B",
  dangerTint: "#FFF0F0",

  // Glass surfaces
  glassWhiteStrong: "rgba(255,255,255,0.85)",
  glassWhiteMid: "rgba(255,255,255,0.55)",
  glassWhiteLight: "rgba(255,255,255,0.18)",
  glassOrangeTint: "rgba(200,75,17,0.06)",
  glassDark: "rgba(0,0,0,0.20)",

  // Gradients
  gradientOrange: ["#C84B11", "#E8650A", "#FF8C42"] as const,
  gradientOrangeAngled: ["#C84B11", "#FF8C42"] as const,
  gradientCardOverlay: ["rgba(0,0,0,0)", "rgba(0,0,0,0.32)"] as const,
} as const;

/**
 * Backwards-compatible `colors` export so every existing screen keeps
 * compiling without a per-file rename. The semantics shift to the new
 * orange glass palette.
 */
export const colors = {
  // New names
  orangeDark: Colors.orangeDark,
  orangeBright: Colors.orangeBright,
  orangeLight: Colors.orangeLight,
  softWhite: Colors.softWhite,
  pureWhite: Colors.pureWhite,
  orangeTint: Colors.orangeTint,
  orangeTintDeep: Colors.orangeTintDeep,
  charcoal: Colors.charcoal,
  darkText: Colors.darkText,
  bodyText: Colors.bodyText,
  mutedText: Colors.mutedText,
  placeholderText: Colors.placeholderText,
  borderLight: Colors.borderLight,
  borderMedium: Colors.borderMedium,
  glassWhiteStrong: Colors.glassWhiteStrong,
  glassWhiteMid: Colors.glassWhiteMid,
  glassWhiteLight: Colors.glassWhiteLight,
  glassOrangeTint: Colors.glassOrangeTint,

  // Status
  successGreen: Colors.successGreen,
  warningAmber: Colors.warningAmber,
  dangerRed: Colors.dangerRed,

  // ——— Legacy aliases (old blue / teal / risk vocabulary → orange glass) ———
  // Any screen that still reads `colors.primaryBlue` or `colors.coral` keeps
  // working but renders in the new palette.
  primaryBlue: Colors.orangeDark,
  deepNavy: Colors.charcoal,
  skyBlue: Colors.orangeLight,
  iceBlue: Colors.softWhite,
  deepTeal: Colors.orangeDark,
  midTeal: Colors.orangeLight,
  lightTeal: Colors.orangeTint,
  teal: Colors.orangeDark,
  sage: Colors.successGreen,
  sageLight: Colors.successTint,
  coral: Colors.dangerRed,
  coralLight: Colors.dangerTint,
  amber: Colors.warningAmber,
  amberLight: Colors.warningTint,
  cream: Colors.softWhite,
  white: Colors.pureWhite,
  slate: Colors.bodyText,
  mist: Colors.mutedText,
  border: Colors.borderLight,

  // Risk semantics (used by result cards and plan)
  riskLow: Colors.successGreen,
  riskLowLight: Colors.successTint,
  riskModerate: Colors.warningAmber,
  riskModerateLight: Colors.warningTint,
  riskHigh: Colors.dangerRed,
  riskHighLight: Colors.dangerTint,

  // Glass + shadow
  shadow: "rgba(200,75,17,0.14)",
  glassFill: Colors.glassWhiteStrong,
  glassFillDark: Colors.glassDark,
  glassChrome: Colors.glassWhiteMid,
  glassBorder: Colors.borderGlass,

  // Highlight / premium accent kept for places that still use it
  purple: "#AF52DE",
} as const;

export const Shadows = {
  // Every brand shadow is orange-tinted.
  card: {
    shadowColor: Colors.orangeDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 4,
  },
  button: {
    shadowColor: Colors.orangeDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 8,
  },
  cardSubtle: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  hero: {
    shadowColor: Colors.orangeDark,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 48,
    elevation: 12,
  },
  floatingCard: {
    shadowColor: Colors.orangeDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 32,
    elevation: 6,
  },
} as const;

export const shadows = {
  card: Shadows.card,
  button: Shadows.button,
  modal: Shadows.hero,
  focusGlow: {
    shadowColor: Colors.orangeBright,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
} as const;

export const Radii = {
  hero: 28,
  card: 20,
  cardLarge: 24,
  cardSmall: 16,
  button: 16,
  input: 14,
  chip: 100,
  icon: 12,
  iconLarge: 16,
  avatar: 1000,
} as const;

/** Legacy name kept for existing screens. */
export const radius = {
  input: Radii.input,
  button: Radii.button,
  alert: Radii.cardSmall,
  card: Radii.card,
  radioCard: Radii.card,
  chip: Radii.chip,
  sheet: Radii.cardLarge,
  glass: Radii.card,
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  huge: 48,
  screenH: 20,
  card: 20,
} as const;

export const spacing = {
  micro: Spacing.xs,
  sm: Spacing.sm,
  mdSm: Spacing.md,
  base: Spacing.base,
  md: Spacing.xl,
  lg: Spacing.xxl,
  xl: Spacing.xxxl,
  xxl: Spacing.huge,
  screenX: Spacing.screenH,
} as const;

export const Typography = {
  display: "Inter_800ExtraBold",
  heading: "Inter_700Bold",
  semibold: "Inter_600SemiBold",
  medium: "Inter_500Medium",
  regular: "Inter_400Regular",
  mono: "JetBrainsMono_400Regular",
  monoBold: "JetBrainsMono_700Bold",

  heroDisplay: 48,
  screenTitle: 32,
  sectionTitle: 22,
  cardTitle: 18,
  bodyLarge: 17,
  body: 15,
  secondary: 13,
  label: 12,
  micro: 11,

  dataHero: 28,
  dataCard: 20,
  dataInline: 15,
  dataSmall: 13,
} as const;

/** Soft gradient for the Screen component — now a warm cream. */
export const gradients = {
  screen: ["#FDF9F7", "#FFF3EC", "#FFF3EC"] as const,
  screenLocations: [0, 0.6, 1] as const,
} as const;

export const tapTarget = 44;
export const inputHeight = 56;
export const primaryButtonHeight = 58;
export const secondaryButtonHeight = 52;

export const glassBlurIntensity = 40;
