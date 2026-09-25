/**
 * PRESCOPE design tokens — SwimClub-style clinical-dossier system.
 *
 * Palette: near-monochrome (white / cool gray / black) with ONE saturated
 * orange (#ff9e00) used only as full-bleed panel wash — never for buttons,
 * icons, or borders. Deep capsule navy (#020507) is the second full-bleed
 * accent for hero and product bands.
 *
 * Shape: 0px radius everywhere. Sharp edges are the identity.
 * Elevation: shadowless — hierarchy comes from surface contrast and
 * hairline 1px borders, never from drop shadows.
 *
 * Legacy aliases (primaryBlue, riskLow, skyBlue…) are preserved so screens
 * that haven't been converted yet still compile; they resolve to the
 * closest SwimClub equivalent (ink black for primary, orange for warning
 * accents, etc.) so the visual language stays coherent during the
 * conversion.
 */

export const colors = {
  // ---------- SwimClub canonical ----------
  /** Single saturated brand accent — ONLY as full-bleed panel background. */
  tabloidOrange: "#FF9E00",
  /** Primary text, hairline borders, button outline on light surfaces. */
  inkBlack: "#000000",
  /** Page background / card surfaces. */
  paperWhite: "#FFFFFF",
  /** Section wash between white bands — cool clinical blue-gray. */
  coolGray: "#D2DCE1",
  /** Secondary body text. */
  ironGray: "#666666",
  /** Tertiary borders, disabled outlines. */
  ash: "#B3B3B3",
  /** Dividers, dashed-border accent. */
  smoke: "#CCCCCC",
  /** Hero + product-photograph dark stage. Near-black, blue undertone. */
  capsuleBlack: "#020507",

  // ---------- Legacy aliases mapped onto SwimClub ----------
  primaryBlue: "#000000",
  deepNavy: "#000000",
  skyBlue: "#666666",
  iceBlue: "#FFFFFF",
  glassFill: "#FFFFFF",
  glassFillDark: "#020507",
  glassChrome: "#FFFFFF",
  glassBorder: "#000000",
  riskLow: "#000000",
  riskLowLight: "#F5F5F5",
  riskModerate: "#FF9E00",
  riskModerateLight: "#FFF6E6",
  riskHigh: "#000000",
  riskHighLight: "#F5F5F5",
  white: "#FFFFFF",
  charcoal: "#000000",
  slate: "#666666",
  mist: "#B3B3B3",
  border: "#000000",
  shadow: "rgba(0,0,0,0)",
  deepTeal: "#000000",
  midTeal: "#666666",
  lightTeal: "#D2DCE1",
  sage: "#000000",
  sageLight: "#F5F5F5",
  coral: "#FF9E00",
  coralLight: "#FFF6E6",
  amber: "#FF9E00",
  amberLight: "#FFF6E6",
  cream: "#FFFFFF",
  teal: "#000000",
} as const;

export const semantic = {
  actionPrimary: colors.inkBlack,
  actionSecondary: colors.inkBlack,
  success: colors.inkBlack,
  warning: colors.tabloidOrange,
  danger: colors.tabloidOrange,
  information: colors.coolGray,
  disabledBg: colors.smoke,
  disabledText: colors.ash,
} as const;

/**
 * Screen atmosphere kept as a data shape for backwards-compat with old
 * `Screen` gradient usage, but the SwimClub system renders flat white —
 * every stop resolves to paperWhite so gradient rendering is a no-op.
 */
export const gradients = {
  screen: ["#FFFFFF", "#FFFFFF", "#FFFFFF"] as const,
  screenLocations: [0, 0.55, 1] as const,
} as const;

/**
 * 4px base grid, matching the SwimClub spacing scale. Legacy names
 * (micro, sm, base, md…) preserved so screens compile.
 */
export const spacing = {
  micro: 4,
  sm: 8,
  mdSm: 12,
  base: 16,
  md: 24,
  lg: 32,
  xl: 40,
  xxl: 64,
  section: 120,
  screenX: 20,
} as const;

/**
 * All corners are square. Every previously distinct radius resolves to 0
 * so the sharp-edge identity holds across old and new components.
 */
export const radius = {
  input: 0,
  button: 0,
  alert: 0,
  card: 0,
  radioCard: 0,
  chip: 0,
  sheet: 0,
  glass: 0,
} as const;

/**
 * Shadowless system: every previously defined shadow is an empty style
 * so `...shadows.card` on legacy screens becomes a no-op.
 */
const NO_SHADOW = {
  shadowColor: "transparent",
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0,
  shadowRadius: 0,
  elevation: 0,
} as const;

export const shadows = {
  card: NO_SHADOW,
  button: NO_SHADOW,
  modal: NO_SHADOW,
  focusGlow: NO_SHADOW,
} as const;

export const tapTarget = 44;
export const inputHeight = 48;
export const primaryButtonHeight = 44;
export const secondaryButtonHeight = 44;

/** Hairline stays for the odd RN 1px case; SwimClub uses 1 explicitly. */
export const hairline = 1;

/** BlurView intensity used by GlassCard: 0 = flat (no blur). */
export const glassBlurIntensity = 0;
