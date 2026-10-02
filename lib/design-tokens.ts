/**
 * PRESCOPE legacy design tokens — NOW RE-POINTED AT THE ORANGE SYSTEM.
 *
 * ⚠️ NEW CODE SHOULD IMPORT FROM `lib/theme.ts` INSTEAD.
 *
 * PLAIN ENGLISH: ~80 screens still import `colors`, `spacing`, `radius` and
 * `shadows` from this file. Rather than editing all of them at once, every
 * name here now maps onto the new orange + warm-white values in
 * `lib/theme.ts`. So an old screen that asks for "primaryBlue" gets orange,
 * and an old screen that asks for "iceBlue" gets the warm background.
 *
 * Nothing was deleted — every symbol that existed before still exists, so the
 * app keeps compiling while screens are restyled one group at a time.
 */

import { Colors, Gradients, Radius, Shadow, Size, Space } from "@/lib/theme";

export const colors = {
  /** Brand primary — buttons, links, active states. Now orange. */
  primaryBlue: Colors.orange,
  /** Primary text — warm near-black. */
  deepNavy: Colors.ink,
  /** Softer accent — now the soft orange. */
  skyBlue: Colors.orangeSoft,
  /** Default screen atmosphere — warm off-white. */
  iceBlue: Colors.background,

  /**
   * "Glass" fills. The premium redesign is flat, so these are now solid
   * white / warm surfaces rather than translucent frosted layers.
   */
  glassFill: Colors.white,
  glassFillDark: "rgba(31,27,24,0.45)",
  glassChrome: Colors.background,
  glassBorder: Colors.line,

  /** Risk semantics — warm green / amber / red from the new palette. */
  riskLow: Colors.green,
  riskLowLight: Colors.greenTint,
  riskModerate: Colors.amber,
  riskModerateLight: Colors.amberTint,
  riskHigh: Colors.red,
  riskHighLight: Colors.redTint,

  white: Colors.white,
  /** Headline / primary text. */
  charcoal: Colors.ink,
  /** Secondary text. */
  slate: Colors.muted,
  /** Tertiary text / inactive elements / placeholders. */
  mist: Colors.faint,
  /** Borders and dividers. */
  border: Colors.line,
  /** Warm, barely-there shadow colour. */
  shadow: "rgba(200,75,17,0.10)",

  // ——— Legacy aliases (old teal/cream system → orange system) ———
  deepTeal: Colors.orangeDeep,
  midTeal: Colors.orange,
  lightTeal: Colors.orangeTint,
  sage: Colors.green,
  sageLight: Colors.greenTint,
  coral: Colors.red,
  coralLight: Colors.redTint,
  amber: Colors.amber,
  amberLight: Colors.amberTint,
  cream: Colors.cloud,
  teal: Colors.orange,
  /** Highlight accent — kept as a name, but mapped onto deep orange (no purple). */
  purple: Colors.orangeDeep,

  // ——— Direct passthroughs to the new names, for gradual migration ———
  background: Colors.background,
  cloud: Colors.cloud,
  ink: Colors.ink,
  body: Colors.body,
  muted: Colors.muted,
  faint: Colors.faint,
  line: Colors.line,
  orange: Colors.orange,
  orangeDeep: Colors.orangeDeep,
  orangeSoft: Colors.orangeSoft,
  orangeTint: Colors.orangeTint,
  orangeTintDeep: Colors.orangeTintDeep,
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

/** Background wash for Screen — flat warm off-white (#FDFAF8). */
export const gradients = {
  screen: [Colors.background, Colors.background, Colors.background] as const,
  screenLocations: [0, 0.6, 1] as const,
  /** Soft warm hero wash — orange tint fading into the background. */
  hero: Gradients.heroWarm,
  /** Orange button / accent gradient. */
  orange: Gradients.orange,
} as const;

/**
 * Spacing. Widened toward the new generous scale — `base` is now 18 and
 * `screenX` is now 24, so legacy screens immediately breathe more.
 */
export const spacing = {
  micro: Space.xs,
  sm: Space.sm,
  mdSm: Space.sm,
  base: Space.md,
  md: Space.lg,
  lg: Space.xl,
  xl: Space.xxl,
  xxl: Space.xxxl,
  /** Horizontal screen padding — 24px everywhere now. */
  screenX: Space.screenH,
} as const;

/** Corner radii — widened to the soft premium shapes. */
export const radius = {
  input: Radius.input,
  button: Radius.button,
  alert: Radius.input,
  card: Radius.card,
  radioCard: 20,
  chip: Radius.chip,
  sheet: Radius.sheet,
  glass: Radius.card,
} as const;

/** Shadows — warm, orange-tinted and very soft. */
export const shadows = {
  card: Shadow.soft,
  button: Shadow.button,
  modal: Shadow.lift,
  focusGlow: {
    shadowColor: Colors.orange,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 2,
  },
} as const;

export const tapTarget = Size.tap;
export const inputHeight = Size.input;
export const primaryButtonHeight = Size.primaryButton;
export const secondaryButtonHeight = Size.secondaryButton;

/**
 * Kept so GlassCard still compiles. The redesign is flat, so the blur
 * intensity is effectively unused — see components/ui/GlassCard.tsx.
 */
export const glassBlurIntensity = 0;
