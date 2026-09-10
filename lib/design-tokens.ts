/**
 * LifeShield design tokens — every colour, gap, corner, and shadow.
 * Change a value here (and in tailwind.config.js + global.css if it is a colour)
 * instead of hunting through screens for hex codes.
 *
 * These match .cursorrules-design Sections 2 and 4.
 */

export const colors = {
  deepTeal: "#0D4A5C",
  midTeal: "#1A7A9A",
  lightTeal: "#D6EEF5",
  sage: "#6B9E7A",
  sageLight: "#E8F3EB",
  coral: "#E8634A",
  coralLight: "#FDECEA",
  amber: "#D4873A",
  amberLight: "#FDF3E4",
  cream: "#FAF8F5",
  white: "#FFFFFF",
  charcoal: "#1C2329",
  slate: "#4A5568",
  mist: "#9AA5B4",
  border: "#E2E8F0",
  shadow: "rgba(13,74,92,0.08)",
} as const;

/** Everyday names so screens do not guess which teal to use. */
export const semantic = {
  actionPrimary: colors.deepTeal,
  actionSecondary: colors.midTeal,
  success: colors.sage,
  warning: colors.amber,
  danger: colors.coral,
  information: colors.lightTeal,
  disabledBg: colors.border,
  disabledText: colors.mist,
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
  input: 10,
  button: 12,
  alert: 12,
  card: 16,
  radioCard: 14,
  chip: 20,
  sheet: 24,
} as const;

export const shadows = {
  card: {
    shadowColor: colors.deepTeal,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  button: {
    shadowColor: colors.deepTeal,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 4,
  },
  modal: {
    shadowColor: colors.deepTeal,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 32,
    elevation: 8,
  },
  focusGlow: {
    shadowColor: colors.midTeal,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
} as const;

export const tapTarget = 44;
export const inputHeight = 56;
export const primaryButtonHeight = 56;
export const secondaryButtonHeight = 52;
