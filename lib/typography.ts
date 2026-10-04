/**
 * PRESCOPE type — SPECIMEN.
 *
 * TWO FACES ONLY: DM Serif Display for titles, JetBrains Mono for
 * everything else. Every legacy alias below resolves to one of those
 * two, so screens written against the old names convert automatically.
 */
import { SpecimenType } from "@/lib/specimen-tokens";

export const fontFamily = {
  // ——— The system ———
  /** Titles, specimen names, plate headings. */
  serif: SpecimenType.serif,
  /** Everything else. */
  mono: SpecimenType.mono,
  monoBold: SpecimenType.monoBold,

  // ——— Legacy aliases → the two faces ———
  /** Old display face → serif. */
  display: SpecimenType.serif,
  displaySemi: SpecimenType.serif,
  heading: SpecimenType.serif,
  heroStat: SpecimenType.monoBold,

  /** Old body/UI faces → mono. */
  regular: SpecimenType.mono,
  body: SpecimenType.mono,
  medium: SpecimenType.mono,
  bodyMedium: SpecimenType.mono,
  semibold: SpecimenType.monoBold,
  bodySemi: SpecimenType.monoBold,

  /** Lab / medical names were already mono. */
  medical: SpecimenType.mono,
} as const;

export const typography = {
  display: {
    fontFamily: fontFamily.serif,
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: -0.4,
    color: undefined as string | undefined,
  },
  heroStat: {
    fontFamily: fontFamily.monoBold,
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: -0.6,
  },
  h1: {
    fontFamily: fontFamily.serif,
    fontSize: 30,
    lineHeight: 34,
    letterSpacing: -0.4,
  },
  h2: {
    fontFamily: fontFamily.serif,
    fontSize: 23,
    lineHeight: 28,
    letterSpacing: -0.3,
  },
  h3: {
    fontFamily: fontFamily.serif,
    fontSize: 19,
    lineHeight: 24,
  },
  body: {
    fontFamily: fontFamily.mono,
    fontSize: 15,
    lineHeight: 25,
  },
  bodySm: {
    fontFamily: fontFamily.mono,
    fontSize: 13,
    lineHeight: 21,
  },
  label: {
    fontFamily: fontFamily.mono,
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 1.2,
  },
  medical: {
    fontFamily: fontFamily.mono,
    fontSize: 13,
    lineHeight: 18,
  },
  micro: {
    fontFamily: fontFamily.mono,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 0.8,
  },
} as const;
