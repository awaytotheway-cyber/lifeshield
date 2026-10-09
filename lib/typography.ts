/**
 * Type styles for PRESCOPE.
 *
 * Primary families:
 *   Body / headings   → Instrument Sans (workhorse)
 *   Micro-copy        → JetBrains Mono (uppercase, +2% letter-spacing)
 *   Display numerals  → VT323 (LCD / pixel look — only at 60px+)
 *
 * `grotesk*` aliases are preserved so existing screens keep rendering; they
 * now resolve to Instrument Sans. Legacy aliases (display, displaySemi,
 * heroStat, body, bodyMedium, bodySemi, medical) likewise map onto the new
 * primary family.
 */

export const fontFamily = {
  // ---------- Primary (Instrument Sans) ----------
  sans: "InstrumentSans_400Regular",
  sansMedium: "InstrumentSans_500Medium",
  sansSemi: "InstrumentSans_600SemiBold",
  sansBold: "InstrumentSans_700Bold",
  sansItalic: "InstrumentSans_400Regular_Italic",
  sansMediumItalic: "InstrumentSans_500Medium_Italic",

  // ---------- Grotesk aliases (now Instrument Sans) ----------
  grotesk: "InstrumentSans_400Regular",
  groteskMedium: "InstrumentSans_500Medium",
  groteskBold: "InstrumentSans_700Bold",

  /** Uppercase micro-copy — labels, nav, stamped tokens. */
  mono: "JetBrainsMono_400Regular",
  /** Giant LCD / 7-segment numerals. Never below 60px. */
  pixel: "VT323_400Regular",

  // ---------- Legacy aliases ----------
  display: "InstrumentSans_700Bold",
  displaySemi: "InstrumentSans_500Medium",
  heroStat: "VT323_400Regular",
  body: "InstrumentSans_400Regular",
  bodyMedium: "InstrumentSans_500Medium",
  bodySemi: "InstrumentSans_700Bold",
  medical: "JetBrainsMono_400Regular",
} as const;

/**
 * Type scale (unchanged — Instrument Sans slots cleanly into the SwimClub
 * sizes).
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
    fontFamily: fontFamily.sansBold,
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
    fontFamily: fontFamily.sansBold,
    fontSize: 37,
    lineHeight: 41,
    letterSpacing: -0.25,
  },
  h2: {
    fontFamily: fontFamily.sansBold,
    fontSize: 31,
    lineHeight: 34,
  },
  h3: {
    fontFamily: fontFamily.sansSemi,
    fontSize: 21,
    lineHeight: 27,
  },
  body: {
    fontFamily: fontFamily.sans,
    fontSize: 15,
    lineHeight: 26,
  },
  bodySm: {
    fontFamily: fontFamily.sans,
    fontSize: 13,
    lineHeight: 20,
  },
  /** Uppercase label — mono, tight tracking. */
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
