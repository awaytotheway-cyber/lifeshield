/**
 * Type styles for PRESCOPE v2.
 * Headings: Inter (display / heading / semibold / medium).
 * Body: Inter.
 * Numbers and clinical data values: JetBrains Mono (via DataValue).
 * Legacy aliases keep older screens working while they adopt the new names.
 */

export const fontFamily = {
  // v2 names
  display: "Inter_800ExtraBold",
  heading: "Inter_700Bold",
  semibold: "Inter_600SemiBold",
  medium: "Inter_500Medium",
  regular: "Inter_400Regular",
  mono: "JetBrainsMono_400Regular",
  monoBold: "JetBrainsMono_700Bold",

  // Legacy names (map to the v2 families so existing screens keep rendering)
  displaySemi: "Inter_700Bold",
  heroStat: "Inter_800ExtraBold",
  body: "Inter_400Regular",
  bodyMedium: "Inter_500Medium",
  bodySemi: "Inter_600SemiBold",
  /** Lab / medical names — JetBrains Mono for clinical credibility. */
  medical: "JetBrainsMono_400Regular",
} as const;

export const typography = {
  display: {
    fontFamily: fontFamily.display,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.5,
    color: undefined as string | undefined,
  },
  heroStat: {
    fontFamily: fontFamily.monoBold,
    fontSize: 48,
    lineHeight: 52,
    letterSpacing: -1,
  },
  h1: {
    fontFamily: fontFamily.heading,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.5,
  },
  h2: {
    fontFamily: fontFamily.semibold,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.3,
  },
  h3: {
    fontFamily: fontFamily.semibold,
    fontSize: 18,
    lineHeight: 24,
  },
  body: {
    fontFamily: fontFamily.regular,
    fontSize: 15,
    lineHeight: 26,
  },
  bodySm: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    lineHeight: 20,
  },
  label: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.2,
  },
  medical: {
    fontFamily: fontFamily.mono,
    fontSize: 13,
    lineHeight: 18,
  },
  micro: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    lineHeight: 14,
  },
} as const;
