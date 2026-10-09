/**
 * Type styles for PRESCOPE — SwimClub-style clinical-dossier system.
 *
 * Three families:
 *   Body / headings   → Space Grotesk (substitute for Px Grotesk)
 *   Micro-copy        → JetBrains Mono (substitute for Apercu Mono Pro,
 *                       set uppercase with +2% letter-spacing)
 *   Display numerals  → VT323 (substitute for the Swimclub pixel face —
 *                       LCD/bitmap look, ONLY at 60px+)
 *
 * Legacy aliases (display, displaySemi, heroStat, body, bodyMedium,
 * bodySemi, medical) keep older screens working while they gradually
 * adopt the new names (grotesk, groteskBold, mono, pixel).
 */

export const fontFamily = {
  // ---------- SwimClub canonical ----------
  grotesk: "SpaceGrotesk_400Regular",
  groteskMedium: "SpaceGrotesk_500Medium",
  groteskBold: "SpaceGrotesk_700Bold",
  /** Uppercase micro-copy — labels, nav, stamped tokens. */
  mono: "JetBrainsMono_400Regular",
  /** Giant LCD / 7-segment numerals. Never below 60px. */
  pixel: "VT323_400Regular",

  // ---------- Legacy aliases (map old system → SwimClub) ----------
  display: "SpaceGrotesk_700Bold",
  displaySemi: "SpaceGrotesk_500Medium",
  heroStat: "VT323_400Regular",
  body: "SpaceGrotesk_400Regular",
  bodyMedium: "SpaceGrotesk_500Medium",
  bodySemi: "SpaceGrotesk_700Bold",
  medical: "JetBrainsMono_400Regular",
} as const;

/**
 * SwimClub type scale. Sizes match the reference:
 *   caption   12  · line 1.3
 *   body-sm   15  · line 1.7
 *   sub       21  · line 1.3
 *   h3        31  · line 1.1
 *   h2        37  · line 1.1
 *   h1        52  · line 1.05
 *   display   74  · line 1.05
 *   stat     105  · line 1.0  (pixel face)
 */
export const typography = {
  display: {
    fontFamily: fontFamily.groteskBold,
    fontSize: 52,
    lineHeight: 55,
    letterSpacing: -0.5,
    color: undefined as string | undefined,
  },
  heroStat: {
    fontFamily: fontFamily.pixel,
    fontSize: 96,
    lineHeight: 96,
    letterSpacing: 0,
  },
  h1: {
    fontFamily: fontFamily.groteskBold,
    fontSize: 37,
    lineHeight: 41,
    letterSpacing: -0.25,
  },
  h2: {
    fontFamily: fontFamily.groteskBold,
    fontSize: 31,
    lineHeight: 34,
  },
  h3: {
    fontFamily: fontFamily.groteskBold,
    fontSize: 21,
    lineHeight: 27,
  },
  body: {
    fontFamily: fontFamily.grotesk,
    fontSize: 15,
    lineHeight: 26,
  },
  bodySm: {
    fontFamily: fontFamily.grotesk,
    fontSize: 13,
    lineHeight: 20,
  },
  /** SwimClub uppercase label — mono, tight tracking, small caps feel. */
  label: {
    fontFamily: fontFamily.mono,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.24,
    textTransform: "uppercase" as const,
  },
  medical: {
    fontFamily: fontFamily.mono,
    fontSize: 13,
    lineHeight: 18,
  },
  micro: {
    fontFamily: fontFamily.mono,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.22,
  },
} as const;
