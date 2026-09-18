/**
 * LifeShield design tokens — dark orange/purple glassmorphism system.
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
  /** Dark text / chrome tint base (near-black, used for heavy chrome overlays). */
  deepNavy: "#0E0E0E",
  /** Secondary accent for highlights and secondary actions. */
  skyBlue: "#9C90E8",
  /** Default screen atmosphere (never plain white behind glass — now the dark canvas). */
  iceBlue: "#141414",

  /** Glass fills — frosted panels over the dark canvas / heavier chrome overlays. */
  glassFill: "rgba(255,255,255,0.045)",
  glassFillDark: "rgba(0,0,0,0.4)",
  glassChrome: "rgba(255,255,255,0.06)",
  glassBorder: "rgba(255,255,255,0.09)",

  /** Risk semantics ONLY — never decorative orange/purple. */
  riskLow: "#34D399",
  riskLowLight: "rgba(52,211,153,0.16)",
  riskModerate: "#FFC24B",
  riskModerateLight: "rgba(255,194,75,0.16)",
  riskHigh: "#F2545D",
  riskHighLight: "rgba(242,84,93,0.16)",

  white: "#FFFFFF",
  charcoal: "#F5F3F0",
  slate: "#B7B3AE",
  mist: "#8C8781",
  border: "rgba(255,255,255,0.1)",
  shadow: "rgba(255,96,0,0.25)",

  /**
   * Text/icons/dividers for content drawn on a literal white surface (form
   * inputs, bottom sheets, question cards) — these stay white by design for
   * data-entry legibility, so their ink needs to stay dark regardless of the
   * dark theme around them.
   */
  inkOnLight: "#1A1A1A",
  inkOnLightMuted: "#6B6560",
  borderOnLight: "rgba(14,14,14,0.12)",

  // ——— Legacy aliases (map old teal/cream system → orange/purple glass) ———
  deepTeal: "#FF6000",
  midTeal: "#9C90E8",
  /** Soft selected/highlight wash — opaque pale peach, stays light on a white card or a dark screen. */
  lightTeal: "#FFDCC0",
  sage: "#34D399",
  sageLight: "rgba(52,211,153,0.16)",
  coral: "#F2545D",
  coralLight: "rgba(242,84,93,0.16)",
  amber: "#FFC24B",
  amberLight: "rgba(255,194,75,0.16)",
  cream: "#141414",
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
  screen: ["#141414", "#1B1B1B", "#141414"] as const,
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
    shadowOpacity: 0.28,
    shadowRadius: 24,
    elevation: 4,
  },
  button: {
    shadowColor: colors.primaryBlue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 4,
  },
  modal: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 32,
    elevation: 8,
  },
  focusGlow: {
    shadowColor: colors.skyBlue,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.28,
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
