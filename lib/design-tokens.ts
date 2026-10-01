/**
 * PRESCOPE design tokens.
 * Change a value here (and in tailwind.config.js + global.css if it is a colour)
 * instead of hunting through screens for hex codes.
 *
 * Legacy aliases (deepTeal, cream, sage…) keep older screens working while
 * they gradually adopt the new names.
 */

export const colors = {
  /** Brand primary — buttons, links, active tabs. */
  primaryBlue: "#007AFF",
  /** Primary text — pure black per the design system. */
  deepNavy: "#000000",
  /** Softer accent blue — info highlights, secondary chrome. */
  skyBlue: "#5AC8FA",
  /** Default screen atmosphere — iOS Light Gray. */
  iceBlue: "#F2F2F7",

  /** Glass fills — light cards / dark chrome overlays. */
  glassFill: "rgba(255,255,255,0.72)",
  glassFillDark: "rgba(0,0,0,0.40)",
  glassChrome: "rgba(255,255,255,0.60)",
  glassBorder: "rgba(0,0,0,0.06)",

  /** Risk semantics — mapped to the system Green/Yellow/Red. */
  riskLow: "#34C759",
  riskLowLight: "#E8F8ED",
  riskModerate: "#FFCC00",
  riskModerateLight: "#FFF8DB",
  riskHigh: "#FF3B30",
  riskHighLight: "#FFE5E3",

  white: "#FFFFFF",
  /** Headline / primary text. */
  charcoal: "#000000",
  /** Secondary text — Dark Gray. */
  slate: "#8E8E93",
  /** Tertiary text / inactive elements. */
  mist: "#C7C7CC",
  /** Borders and dividers — Medium Gray. */
  border: "#E5E5EA",
  /** Neutral shadow. */
  shadow: "rgba(0,0,0,0.15)",

  // ——— Legacy aliases (map old teal/cream system → iOS palette) ———
  deepTeal: "#007AFF",
  midTeal: "#5AC8FA",
  lightTeal: "#E5F2FF",
  sage: "#34C759",
  sageLight: "#E8F8ED",
  coral: "#FF3B30",
  coralLight: "#FFE5E3",
  amber: "#FFCC00",
  amberLight: "#FFF8DB",
  cream: "#F2F2F7",
  teal: "#007AFF",
  /** Highlight accent — Purple, per spec (premium / highlights). */
  purple: "#AF52DE",
} as const;

/** Everyday names so screens do not guess which blue to use. */
export const semantic = {
  actionPrimary: colors.primaryBlue,
  actionSecondary: colors.skyBlue,
  success: colors.riskLow,
  warning: colors.riskModerate,
  danger: colors.riskHigh,
  information: colors.lightTeal,
  disabledBg: colors.border,
  disabledText: colors.mist,
} as const;

/** Soft background wash for Screen — near-flat light gray per the design system. */
export const gradients = {
  screen: ["#FFFFFF", "#F2F2F7", "#F2F2F7"] as const,
  screenLocations: [0, 0.6, 1] as const,
} as const;

/** 8-point grid (4px for tiny tweaks). */
export const spacing = {
  micro: 4,
  sm: 8,
  mdSm: 12,
  base: 16,
  md: 24,
  lg: 32,
  xl: 40,
  xxl: 48,
  screenX: 20,
} as const;

export const radius = {
  input: 12,
  button: 12,
  alert: 12,
  card: 16,
  radioCard: 14,
  chip: 20,
  sheet: 20,
  glass: 16,
} as const;

export const shadows = {
  card: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  button: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  modal: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 8,
  },
  focusGlow: {
    shadowColor: colors.primaryBlue,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
} as const;

export const tapTarget = 44;
export const inputHeight = 56;
export const primaryButtonHeight = 50;
export const secondaryButtonHeight = 50;

/** BlurView intensity used by GlassCard (native glass look). */
export const glassBlurIntensity = 32;
