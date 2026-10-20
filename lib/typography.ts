/**
 * Type styles for PRESCOPE — the Moss design language.
 *
 * One face everywhere: Schibsted Grotesk, in exactly four weights.
 *   400 Regular    — body copy, the grey words inside a headline
 *   500 Medium     — labels, inactive tabs, lab / medical names
 *   600 SemiBold   — titles, buttons, active tabs, micro eyebrows
 *   700 Bold       — display headlines only
 *
 * The spec quotes tracking as a percentage of the type size. React Native
 * takes `letterSpacing` in points, so every value below is converted at its
 * own size (46 x -0.035 = -1.6) rather than shared across the scale.
 *
 * Font names match the weights loaded in app/_layout.tsx. While fonts are
 * still loading, React Native falls back to the system font.
 */

export const fontFamily = {
  /** Display headlines — the only place 700 is used. */
  display: "SchibstedGrotesk_700Bold",
  /** Titles, buttons, active tabs. */
  displaySemi: "SchibstedGrotesk_600SemiBold",
  /** Oversized hero numbers (risk score, days-until-check). */
  heroStat: "SchibstedGrotesk_700Bold",
  body: "SchibstedGrotesk_400Regular",
  bodyMedium: "SchibstedGrotesk_500Medium",
  bodySemi: "SchibstedGrotesk_600SemiBold",
  /** Lab / medical names — same face, one step up in weight. */
  medical: "SchibstedGrotesk_500Medium",
} as const;

export const typography = {
  /** 46 / 0.92 / -3.5% / 700 — the one headline per screen. */
  displayXL: {
    fontFamily: fontFamily.display,
    fontSize: 46,
    // 46 x 0.92 = 42.3
    lineHeight: 42,
    // 46 x -0.035 = -1.61
    letterSpacing: -1.6,
  },
  /** 34 / 1.0 / -3% / 700 — section openers and hero numbers. */
  displayL: {
    fontFamily: fontFamily.display,
    fontSize: 34,
    // 34 x 1.0
    lineHeight: 34,
    // 34 x -0.03 = -1.02
    letterSpacing: -1,
  },
  /** 20 / 1.2 / -1% / 600 — card and screen titles. */
  title: {
    fontFamily: fontFamily.displaySemi,
    fontSize: 20,
    // 20 x 1.2 = 24
    lineHeight: 24,
    // 20 x -0.01 = -0.2
    letterSpacing: -0.2,
  },
  /** 15 / 1.55 / 400 — body copy, no tracking. */
  body: {
    fontFamily: fontFamily.body,
    fontSize: 15,
    // 15 x 1.55 = 23.25
    lineHeight: 23,
  },
  /** 13 / 1.4 / 500 — field labels and secondary lines. */
  label: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 13,
    // 13 x 1.4 = 18.2
    lineHeight: 18,
  },
  /** 11 / 1.4 / 600 / +14% uppercase — eyebrows and meta. */
  micro: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 11,
    // 11 x 1.4 = 15.4
    lineHeight: 15,
    // 11 x 0.14 = 1.54
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },

  // ---------------------------------------------------------------------
  // Legacy aliases. Screens still spreading the old scale keep rendering on
  // the Moss scale until their own migration task rewrites them; delete each
  // alias as its last consumer goes.
  // ---------------------------------------------------------------------
  /** @deprecated use `displayL`. */
  display: {
    fontFamily: fontFamily.display,
    fontSize: 34,
    lineHeight: 34,
    letterSpacing: -1,
  },
  /** @deprecated use `displayL`. */
  h1: {
    fontFamily: fontFamily.display,
    fontSize: 34,
    lineHeight: 34,
    letterSpacing: -1,
  },
  /**
   * Holds the pre-Moss metrics (40 / 44 / -1) on purpose: MilestoneStatStrip
   * renders three of these side by side in a `flex: 1` row, so inheriting
   * displayXL's 46 would grow them 15% and risk clipping on narrow screens.
   * Only the face and weight are remapped — Moss has no 800.
   * @deprecated pick `displayXL` or `displayL` deliberately when the strip is
   * redesigned, rather than inheriting this hold.
   */
  heroStat: {
    fontFamily: fontFamily.heroStat,
    fontSize: 40,
    lineHeight: 44,
    letterSpacing: -1,
  },
} as const;
