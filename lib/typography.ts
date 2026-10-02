/**
 * PRESCOPE legacy type styles — NOW RE-POINTED AT THE ORANGE SYSTEM'S FONTS.
 *
 * ⚠️ NEW CODE SHOULD IMPORT `Font`, `Type` and `typeStyle` FROM `lib/theme.ts`.
 *
 * PLAIN ENGLISH: older screens ask for `fontFamily.display` or
 * `typography.h1`. Those names still work, but they now resolve to the new
 * fonts — Fraunces (a warm serif) for titles and Inter for everything else —
 * with the generous line heights that fix the cramped feeling.
 *
 * The font files are loaded in app/_layout.tsx. If one fails to load, React
 * Native falls back to the system font instead of showing a blank screen.
 */

import { Font, Type } from "@/lib/theme";

export const fontFamily = {
  /** Screen titles and section headings — now the Fraunces serif. */
  display: Font.serif,
  displaySemi: Font.serif,
  /** Oversized hero numbers (risk score, days-until-check). */
  heroStat: Font.bold,
  body: Font.regular,
  bodyMedium: Font.medium,
  bodySemi: Font.semibold,
  /**
   * Lab / medical names. DM Mono is no longer loaded by the redesign, so this
   * maps onto Inter Medium — still scannable, and consistent with the system.
   */
  medical: Font.medium,

  // ——— Direct passthroughs to the new names ———
  serif: Font.serif,
  bold: Font.bold,
  semibold: Font.semibold,
  medium: Font.medium,
  regular: Font.regular,
} as const;

export const typography = {
  display: {
    fontFamily: fontFamily.display,
    fontSize: Type.title.size,
    lineHeight: Type.title.lineHeight,
    letterSpacing: Type.title.spacing,
    color: undefined as string | undefined,
  },
  /** Big calm numbers for milestone strips and stat cards. */
  heroStat: {
    fontFamily: fontFamily.heroStat,
    fontSize: Type.dataBig.size,
    lineHeight: Type.dataBig.lineHeight,
    letterSpacing: -0.5,
  },
  h1: {
    fontFamily: fontFamily.display,
    fontSize: Type.hero.size,
    lineHeight: Type.hero.lineHeight,
    letterSpacing: Type.hero.spacing,
  },
  h2: {
    fontFamily: fontFamily.display,
    fontSize: Type.title.size,
    lineHeight: Type.title.lineHeight,
    letterSpacing: Type.title.spacing,
  },
  h3: {
    fontFamily: fontFamily.bodySemi,
    fontSize: Type.cardTitle.size,
    lineHeight: Type.cardTitle.lineHeight,
  },
  /** 16/28 — the 1.75 ratio that stops text feeling cramped. */
  body: {
    fontFamily: fontFamily.body,
    fontSize: Type.body.size,
    lineHeight: Type.body.lineHeight,
  },
  bodySm: {
    fontFamily: fontFamily.body,
    fontSize: Type.secondary.size,
    lineHeight: Type.secondary.lineHeight,
  },
  label: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: Type.label.size,
    lineHeight: Type.label.lineHeight,
  },
  medical: {
    fontFamily: fontFamily.medical,
    fontSize: Type.secondary.size,
    lineHeight: Type.secondary.lineHeight,
  },
  micro: {
    fontFamily: fontFamily.body,
    fontSize: Type.caption.size,
    lineHeight: Type.caption.lineHeight,
  },
} as const;
