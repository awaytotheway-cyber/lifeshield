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
  primaryBlue: "#2B5FE0",
  /** Primary text and headlines. */
  deepNavy: "#0B1E4D",
  /** Softer accent blue — info highlights, progress, secondary chrome. */
  skyBlue: "#6FA8F5",
  /** Default screen atmosphere — Blue Glass ice. */
  iceBlue: "#EAF1FF",

  /** Glass fills — light cards / dark chrome overlays. */
  glassFill: "rgba(255,255,255,0.72)",
  glassFillDark: "rgba(11,30,77,0.40)",
  glassChrome: "rgba(255,255,255,0.60)",
  glassBorder: "rgba(43,95,224,0.10)",

  /**
   * Risk semantics — deliberately kept on the iOS system Green/Yellow/Red.
   * These read as medical-standard, so they stay even though the rest of the
   * palette moved to Blue Glass.
   */
  riskLow: "#34C759",
  riskLowLight: "#E8F8ED",
  riskModerate: "#FFCC00",
  riskModerateLight: "#FFF8DB",
  riskHigh: "#FF3B30",
  riskHighLight: "#FFE5E3",

  white: "#FFFFFF",
  /** Headline / primary text (same as deepNavy — never pure black). */
  charcoal: "#0B1E4D",
  /** Secondary text — descriptions, timestamps. */
  slate: "#4A5568",
  /** Placeholder, disabled, tertiary info. */
  mist: "#9AA5B4",
  /** Borders and dividers. */
  border: "#D4E0F5",
  /** Blue-tinted shadow — never plain black. */
  shadow: "rgba(43,95,224,0.08)",

  // ——— Legacy aliases (older screens still reference these names) ———
  deepTeal: "#2B5FE0",
  midTeal: "#6FA8F5",
  /** Hover / pressed states, subtle highlights. */
  lightTeal: "#D6E4FF",
  sage: "#34C759",
  sageLight: "#E8F8ED",
  coral: "#FF3B30",
  coralLight: "#FFE5E3",
  amber: "#FFCC00",
  amberLight: "#FFF8DB",
  cream: "#EAF1FF",
  teal: "#2B5FE0",
  /** Highlight accent — premium / highlights. */
  purple: "#AF52DE",

  // ——— Pressed states ———
  /** Primary CTA while held — the design system's "active: deepNavy". */
  primaryBluePressed: "#0B1E4D",
  /** Destructive CTA while held. */
  riskHighPressed: "#D93228",
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
  screen: ["#FFFFFF", "#EAF1FF", "#EAF1FF"] as const,
  screenLocations: [0, 0.6, 1] as const,
  /** Primary brand gradient — hero cards, prominent score surfaces. */
  brand: ["#2B5FE0", "#0B1E4D"] as const,
  /** Lighter brand gradient — secondary emphasis. */
  brandLight: ["#6FA8F5", "#2B5FE0"] as const,
  /** Scrim placed under text that sits on a photo. */
  imageScrim: ["transparent", "rgba(11,30,77,0.7)"] as const,
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
  /** Buttons and inputs. */
  input: 12,
  button: 12,
  alert: 12,
  /** Cards — the standard surface corner. */
  card: 16,
  /** Selectable option cards share the card corner for consistency. */
  radioCard: 16,
  /** Chips, tags and avatars are always fully rounded. */
  chip: 999,
  /** Bottom sheets — rounded-t-3xl. */
  sheet: 24,
  glass: 16,
} as const;

export const shadows = {
  card: {
    shadowColor: "#2B5FE0",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  button: {
    shadowColor: "#2B5FE0",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  modal: {
    shadowColor: "#0B1E4D",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
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

/** Minimum touch target. The design system floor is 48px. */
export const tapTarget = 48;
export const inputHeight = 56;
export const primaryButtonHeight = 50;
export const secondaryButtonHeight = 50;

/** BlurView intensity used by GlassCard (native glass look). */
export const glassBlurIntensity = 32;
