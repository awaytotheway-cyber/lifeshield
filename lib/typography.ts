/**
 * Type styles for LifeShield. Font names match the files loaded in app/_layout.tsx.
 * If fonts are still loading, React Native falls back to the system font.
 */

export const fontFamily = {
  display: "DMSerifDisplay_400Regular",
  body: "Inter_400Regular",
  bodyMedium: "Inter_500Medium",
  bodySemi: "Inter_600SemiBold",
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
  h1: {
    fontFamily: fontFamily.display,
    fontSize: 26,
    lineHeight: 31,
    letterSpacing: -0.5,
  },
  h2: {
    fontFamily: fontFamily.bodySemi,
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
