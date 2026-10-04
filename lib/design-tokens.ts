/**
 * PRESCOPE design tokens — SPECIMEN.
 *
 * This file is now a compatibility layer over lib/specimen-tokens.ts.
 * Every legacy name (primaryBlue, orangeDark, cream, coral, glass…)
 * resolves to the paper-and-ink palette, so the ~60 screens written
 * against the old vocabulary convert without per-file edits.
 *
 * New code should import from lib/specimen-tokens.ts directly.
 */
import {
  Accent,
  Edge,
  Ink,
  Measure,
  Paper,
  Rule,
} from "@/lib/specimen-tokens";

export { Accent, Edge, Ink, Measure, Paper, Rule };

/** Re-exported under the v2 names some screens already import. */
export const Colors = {
  // Paper
  softWhite: Paper.sheet,
  pureWhite: Paper.mount,
  orangeTint: Accent.tagWash,
  orangeTintDeep: Paper.sheetDeep,

  // Ink
  charcoal: Ink.full,
  darkText: Ink.full,
  bodyText: Ink.soft,
  mutedText: Ink.faint,
  placeholderText: Ink.ghost,
  borderLight: Ink.rule,
  borderMedium: Ink.ruleStrong,

  // Accent — the single brand mark
  orangeDark: Accent.tag,
  orangeBright: Accent.tag,
  orangeLight: Accent.tag,

  // Semantic
  successGreen: Accent.sage,
  successTint: Accent.sageWash,
  warningAmber: Accent.ochre,
  warningTint: Accent.ochreWash,
  dangerRed: Accent.tag,
  dangerTint: Accent.tagWash,

  // Glass is gone. These resolve to paper so any straggler reads flat.
  glassWhiteStrong: Paper.mount,
  glassWhiteMid: Paper.mount,
  glassWhiteLight: Paper.sheetDeep,
  glassOrangeTint: Accent.tagWash,
  glassDark: "rgba(27,26,23,0.72)",
  borderGlass: Ink.rule,
  borderOrangeGlass: Ink.rule,

  /** Gradients flattened to a single ink — no gradient exists in SPECIMEN. */
  gradientOrange: [Ink.full, Ink.full, Ink.full] as const,
  gradientOrangeAngled: [Ink.full, Ink.full] as const,
  gradientCardOverlay: ["rgba(0,0,0,0)", "rgba(27,26,23,0.30)"] as const,
} as const;

/** The long-standing lowercase export every older screen imports. */
export const colors = {
  // Paper surfaces
  softWhite: Paper.sheet,
  pureWhite: Paper.mount,
  white: Paper.mount,
  cream: Paper.sheet,
  iceBlue: Paper.sheet,
  orangeTint: Accent.tagWash,
  orangeTintDeep: Paper.sheetDeep,

  // Ink
  charcoal: Ink.full,
  darkText: Ink.full,
  deepNavy: Ink.full,
  bodyText: Ink.soft,
  slate: Ink.soft,
  mutedText: Ink.faint,
  mist: Ink.faint,
  placeholderText: Ink.ghost,
  border: Ink.rule,
  borderLight: Ink.rule,
  borderMedium: Ink.ruleStrong,

  // Accent — specimen-tag red is the ONLY brand colour
  orangeDark: Accent.tag,
  orangeBright: Accent.tag,
  orangeLight: Accent.tag,
  primaryBlue: Accent.tag,
  deepTeal: Accent.tag,
  teal: Accent.tag,
  skyBlue: Accent.tag,
  midTeal: Accent.tag,
  lightTeal: Accent.tagWash,
  purple: Accent.tag,

  // Semantic
  successGreen: Accent.sage,
  warningAmber: Accent.ochre,
  dangerRed: Accent.tag,
  sage: Accent.sage,
  sageLight: Accent.sageWash,
  amber: Accent.ochre,
  amberLight: Accent.ochreWash,
  coral: Accent.tag,
  coralLight: Accent.tagWash,
  riskLow: Accent.sage,
  riskLowLight: Accent.sageWash,
  riskModerate: Accent.ochre,
  riskModerateLight: Accent.ochreWash,
  riskHigh: Accent.tag,
  riskHighLight: Accent.tagWash,

  // Glass → paper
  glassFill: Paper.mount,
  glassFillDark: "rgba(27,26,23,0.72)",
  glassChrome: Paper.sheet,
  glassBorder: Ink.rule,

  /** No shadows in SPECIMEN. Kept so spreads do not break. */
  shadow: "transparent",
} as const;

/**
 * Shadows are REMOVED. Structure comes from hairline rules.
 * These resolve to no-ops so legacy spreads stay harmless.
 */
const NO_SHADOW = {
  shadowColor: "transparent",
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0,
  shadowRadius: 0,
  elevation: 0,
} as const;

export const Shadows = {
  card: NO_SHADOW,
  button: NO_SHADOW,
  cardSubtle: NO_SHADOW,
  hero: NO_SHADOW,
  floatingCard: NO_SHADOW,
} as const;

export const shadows = {
  card: NO_SHADOW,
  button: NO_SHADOW,
  modal: NO_SHADOW,
  focusGlow: NO_SHADOW,
} as const;

/** Near-square. This is paper. */
export const Radii = {
  hero: Edge.none,
  card: Edge.mount,
  cardLarge: Edge.mount,
  cardSmall: Edge.hair,
  button: Edge.none,
  input: Edge.none,
  chip: Edge.tag,
  icon: Edge.hair,
  iconLarge: Edge.hair,
  avatar: Edge.round,
} as const;

export const radius = {
  input: Edge.none,
  button: Edge.none,
  alert: Edge.hair,
  card: Edge.mount,
  radioCard: Edge.mount,
  chip: Edge.tag,
  sheet: Edge.mount,
  glass: Edge.mount,
} as const;

export const Spacing = {
  xs: Measure.hair,
  sm: Measure.tight,
  md: Measure.snug,
  base: Measure.base,
  lg: 20,
  xl: Measure.loose,
  xxl: Measure.section,
  xxxl: 44,
  huge: Measure.plate,
  screenH: Measure.gutter,
  card: Measure.base,
} as const;

export const spacing = {
  micro: Measure.hair,
  sm: Measure.tight,
  mdSm: Measure.snug,
  base: Measure.base,
  md: Measure.loose,
  lg: Measure.section,
  xl: 44,
  xxl: Measure.plate,
  screenX: Measure.gutter,
} as const;

/** The screen is flat paper. No gradient. */
export const gradients = {
  screen: [Paper.sheet, Paper.sheet, Paper.sheet] as const,
  screenLocations: [0, 0.5, 1] as const,
} as const;

export const tapTarget = 44;
export const inputHeight = 52;
export const primaryButtonHeight = 52;
export const secondaryButtonHeight = 48;

/** No blur in SPECIMEN. */
export const glassBlurIntensity = 0;

export { SpecimenType as Typography } from "@/lib/specimen-tokens";
