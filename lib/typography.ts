/**
 * Type styles for PRESCOPE. Font names match the files loaded in app/_layout.tsx.
 *
 * Headings / display : Manrope
 * Body / UI labels   : Plus Jakarta Sans
 * Data values        : DM Mono (numbers, scores, percentages, lab names only)
 * Editorial accent   : DM Serif Display (sparingly — max one moment per screen)
 *
 * Inter is deliberately NOT used any more: it is the fallback tier only, so the
 * system font takes over if a face fails to load rather than a fourth family
 * sneaking onto a screen.
 *
 * Never mix more than two families on one screen. The usual pairing is
 * Manrope for headings + Plus Jakarta Sans for everything else.
 */

export const fontFamily = {
  /** Screen titles and section headings. */
  display: "Manrope_700Bold",
  displaySemi: "Manrope_600SemiBold",
  /** Oversized hero headings. */
  displayHero: "Manrope_800ExtraBold",
  /** Body copy, descriptions, UI labels. */
  body: "PlusJakartaSans_400Regular",
  bodyMedium: "PlusJakartaSans_500Medium",
  bodySemi: "PlusJakartaSans_600SemiBold",
  bodyBold: "PlusJakartaSans_700Bold",
  /** Big numbers — risk scores, percentages, countdowns. */
  heroStat: "DMMono_500Medium",
  data: "DMMono_500Medium",
  /** Lab / medical names — keep mono for scanability. */
  medical: "DMMono_400Regular",
  /** Editorial accent — pull quotes, a single wellness-tip header. */
  serif: "DMSerifDisplay_400Regular",
} as const;

export const typography = {
  /** Largest screen title. Manrope 800, line-height 1.15. */
  display: {
    fontFamily: fontFamily.displayHero,
    fontSize: 32,
    lineHeight: 37,
    letterSpacing: -0.5,
    color: undefined as string | undefined,
  },
  /** Big calm numbers for milestone strips and risk scores. */
  heroStat: {
    fontFamily: fontFamily.heroStat,
    fontSize: 40,
    lineHeight: 44,
    letterSpacing: -1,
  },
  /** Standard screen title. */
  h1: {
    fontFamily: fontFamily.displayHero,
    fontSize: 28,
    lineHeight: 32,
    letterSpacing: -0.5,
  },
  /** Section heading. */
  h2: {
    fontFamily: fontFamily.display,
    fontSize: 21,
    lineHeight: 26,
    letterSpacing: -0.3,
  },
  /** Card title. */
  h3: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  body: {
    fontFamily: fontFamily.body,
    fontSize: 15,
    lineHeight: 23,
  },
  /** Body copy that needs weight without becoming a heading. */
  bodyEmphasis: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 15,
    lineHeight: 23,
  },
  bodySm: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    lineHeight: 20,
  },
  /** Caption / field label. */
  label: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 12,
    lineHeight: 17,
    letterSpacing: 0.2,
  },
  /** Prominent data value. */
  data: {
    fontFamily: fontFamily.data,
    fontSize: 28,
    lineHeight: 31,
    letterSpacing: -0.5,
  },
  /** Lab names and small data values. */
  medical: {
    fontFamily: fontFamily.medical,
    fontSize: 14,
    lineHeight: 18,
  },
  /** Status chip / tag text. */
  chip: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 12,
    lineHeight: 14,
    letterSpacing: 0.5,
  },
  micro: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 11,
    lineHeight: 14,
  },
  /** Editorial accent. One per screen, at most. */
  serifAccent: {
    fontFamily: fontFamily.serif,
    fontSize: 22,
    lineHeight: 29,
  },
} as const;
