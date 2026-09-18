/**
 * LifeShield design tokens — white/orange glassmorphism system.
 * Change a value here (and in tailwind.config.js + global.css if it is a colour)
 * instead of hunting through screens for hex codes.
 *
 * Legacy aliases (deepTeal, cream, sage…) keep older screens working while
 * they gradually adopt the new names (primaryBlue, iceBlue, riskLow…) — the
 * *names* are historical, the *values* below are the current LifeShield brand.
 */

export const colors = {
  /** Brand primary — buttons, active tabs, key accents. */
  primaryBlue: "#FF6000",
  /** Dark text / navy glass tint base. */
  deepNavy: "#242424",
  /** Secondary accent for highlights and secondary actions. */
  skyBlue: "#6C5BD4",
  /** Default screen atmosphere (never plain white behind glass). */
  iceBlue: "#FFFFFF",

  /** Glass fills — light cards / dark chrome overlays. */
  glassFill: "rgba(255,255,255,0.6)",
  glassFillDark: "rgba(36,28,21,0.45)",
  glassChrome: "rgba(255,255,255,0.7)",
  glassBorder: "rgba(36,28,21,0.1)",

  /** Risk semantics ONLY — never decorative orange. */
  riskLow: "#1F9D74",
  riskLowLight: "#E3F7EF",
  riskModerate: "#E08A00",
  riskModerateLight: "#FFF1DC",
  riskHigh: "#E1445A",
  riskHighLight: "#FDE8EB",

  white: "#FFFFFF",
  charcoal: "#241C14",
  slate: "#6B6560",
  mist: "#A39C94",
  border: "rgba(36,28,21,0.12)",
  shadow: "rgba(255,96,0,0.16)",

  /**
   * Text/icons/dividers for content drawn on a literal white surface (form
   * inputs, bottom sheets, question cards). The whole app is light now, so
   * these match charcoal/slate/border — kept as separate names because
   * several components already reference them explicitly.
   */
  inkOnLight: "#241C14",
  inkOnLightMuted: "#6B6560",
  borderOnLight: "rgba(36,28,21,0.12)",

  // ——— Legacy aliases (map old teal/cream system → white/orange glass) ———
  deepTeal: "#FF6000",
  midTeal: "#6C5BD4",
  /** Soft selected/highlight wash — pale peach, reads on any light surface. */
  lightTeal: "#FFE4D1",
  sage: "#1F9D74",
  sageLight: "#E3F7EF",
  coral: "#E1445A",
  coralLight: "#FDE8EB",
  amber: "#E08A00",
  amberLight: "#FFF1DC",
  cream: "#FFFFFF",
  teal: "#FF6000",
} as const;

/** Everyday names so screens do not guess which accent to use. */
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
  screen: ["#FFFFFF", "#FFF3EA", "#FFFFFF"] as const,
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
  input: 14,
  button: 18,
  alert: 18,
  card: 28,
  radioCard: 22,
  chip: 22,
  sheet: 30,
  /** Tailwind rounded-2xl ≈ 16; glass cards use a slightly fuller corner. */
  glass: 18,
} as const;

export const shadows = {
  card: {
    shadowColor: colors.primaryBlue,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 3,
  },
  button: {
    shadowColor: colors.primaryBlue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 4,
  },
  modal: {
    shadowColor: colors.charcoal,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
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
