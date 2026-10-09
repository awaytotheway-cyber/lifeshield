/**
 * PRESCOPE design tokens — blue-primary glassmorphism system.
 * Change a value here (and in tailwind.config.js + global.css if it is a colour)
 * instead of hunting through screens for hex codes.
 *
 * Legacy aliases (deepTeal, cream, sage…) keep older screens working while
 * they gradually adopt the new names (primaryBlue, iceBlue, riskLow…).
 */

export const colors = {
  /** Brand primary — buttons, active tabs, key accents. */
  primaryBlue: "#2B5FE0",
  /** Dark text / navy glass tint base. */
  deepNavy: "#0B1E4D",
  /** Softer blue for secondary actions and highlights. */
  skyBlue: "#6FA8F5",
  /** Default screen atmosphere (never plain white behind glass). */
  iceBlue: "#EAF1FF",

  /** Glass fills — light cards / dark chrome overlays. */
  glassFill: "rgba(255,255,255,0.55)",
  glassFillDark: "rgba(11,30,77,0.45)",
  glassChrome: "rgba(255,255,255,0.42)",
  glassBorder: "rgba(255,255,255,0.3)",

  /** Risk semantics ONLY — never decorative coral. */
  riskLow: "#2FB8A6",
  riskLowLight: "#E6F8F5",
  riskModerate: "#F5A623",
  riskModerateLight: "#FEF4E3",
  riskHigh: "#F26D6D",
  riskHighLight: "#FDECEC",

  white: "#FFFFFF",
  charcoal: "#0B1E4D",
  slate: "#4A5568",
  mist: "#9AA5B4",
  border: "#D4E0F5",
  shadow: "rgba(43,95,224,0.12)",

  // ——— Legacy aliases (map old teal/cream system → blue glass) ———
  deepTeal: "#2B5FE0",
  midTeal: "#6FA8F5",
  lightTeal: "#D6E4FF",
  sage: "#2FB8A6",
  sageLight: "#E6F8F5",
  coral: "#F26D6D",
  coralLight: "#FDECEC",
  amber: "#F5A623",
  amberLight: "#FEF4E3",
  cream: "#EAF1FF",
  teal: "#2B5FE0",
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

/** Soft gradient stops for Screen backgrounds. */
export const gradients = {
  screen: ["#EAF1FF", "#D6E4FF", "#C8DBFF"] as const,
  screenLocations: [0, 0.55, 1] as const,
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
  button: 16,
  alert: 16,
  card: 24,
  radioCard: 20,
  chip: 20,
  sheet: 28,
  /** Tailwind rounded-2xl ≈ 16; glass cards use a slightly fuller corner. */
  glass: 16,
} as const;

export const shadows = {
  card: {
    shadowColor: colors.primaryBlue,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 4,
  },
  button: {
    shadowColor: colors.primaryBlue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 4,
  },
  modal: {
    shadowColor: colors.deepNavy,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 32,
    elevation: 8,
  },
  focusGlow: {
    shadowColor: colors.skyBlue,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 2,
  },
} as const;

export const tapTarget = 44;
export const inputHeight = 56;
export const primaryButtonHeight = 56;
export const secondaryButtonHeight = 52;

/** BlurView intensity used by GlassCard (native glass look). */
export const glassBlurIntensity = 40;
