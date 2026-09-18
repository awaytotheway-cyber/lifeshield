/**
 * Type styles for LifeShield. Font names match the files loaded in app/_layout.tsx.
 * Brand system is Clash Display (headings) + Manrope (body). Clash Display isn't
 * available as an installable Google Font, so headings use Manrope ExtraBold/Bold
 * as the closest geometric substitute — body/labels use lighter Manrope weights.
 * Hero stats: oversized Manrope display. If fonts are still loading, React Native
 * falls back to the system font.
 */

export const fontFamily = {
  /** Screen titles and section headings. */
  display: "Manrope_800ExtraBold",
  displaySemi: "Manrope_700Bold",
  /** Oversized hero numbers (risk score, days-until-check). */
  heroStat: "Manrope_800ExtraBold",
  body: "Manrope_400Regular",
  bodyMedium: "Manrope_500Medium",
  bodySemi: "Manrope_600SemiBold",
  /** Lab / medical names — keep mono for scanability. */
  medical: "DMMono_400Regular",
} as const;

export const typography = {
  display: {
    fontFamily: fontFamily.display,
    fontSize: 32,
    lineHeight: 38,
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
  h1: {
    fontFamily: fontFamily.display,
    fontSize: 26,
    lineHeight: 31,
    letterSpacing: -0.5,
  },
  h2: {
    fontFamily: fontFamily.displaySemi,
    fontSize: 20,
    lineHeight: 26,
  },
  h3: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 17,
    lineHeight: 22,
  },
  body: {
    fontFamily: fontFamily.body,
    fontSize: 15,
    lineHeight: 24,
  },
  bodySm: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    lineHeight: 20,
  },
  label: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.2,
  },
  medical: {
    fontFamily: fontFamily.medical,
    fontSize: 13,
    lineHeight: 18,
  },
  micro: {
    fontFamily: fontFamily.body,
    fontSize: 11,
    lineHeight: 14,
  },
} as const;
