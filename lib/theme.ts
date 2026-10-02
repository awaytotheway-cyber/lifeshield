/**
 * PRESCOPE theme — the single source of truth for the orange + warm-white
 * visual system described in `.cursorrules-redesign` (Sections 2–5).
 *
 * PLAIN ENGLISH: this file holds every colour, every gap size, every font size
 * and every corner radius the app uses. If you want the app to look different,
 * change a number here and it changes everywhere. You never need to hunt
 * through screens for hex codes.
 *
 * NEW CODE SHOULD IMPORT FROM HERE. `lib/design-tokens.ts` and
 * `lib/typography.ts` still exist for the older screens — they are thin
 * wrappers that now point at these same values, so nothing looks blue anymore.
 */

import type { TextStyle } from "react-native";

/* ───────────────────────────────────────────────────────────────
 * 1. COLOURS
 * The app breathes in warm whites. Orange is the signature accent and is
 * used with restraint — one key accent per screen. No blue, teal or purple.
 * ─────────────────────────────────────────────────────────────── */
export const Colors = {
  // Signature orange
  /** Primary — buttons, highlights, active states, important numbers. */
  orange: "#E8650A",
  /** Pressed states and deep accents. */
  orangeDeep: "#C84B11",
  /** Gradient partner and soft highlights. */
  orangeSoft: "#FF8C42",
  /** Selected backgrounds and soft icon fills. */
  orangeTint: "#FFF3EC",
  /** Pressed tint states. */
  orangeTintDeep: "#FFE4D1",

  // Whites & warm neutrals
  /** Cards. */
  white: "#FFFFFF",
  /** App background — warm off-white, never grey, never pure white. */
  background: "#FDFAF8",
  /** Secondary surfaces and inset areas. */
  cloud: "#F7F1EC",

  // Text
  /** Headings — warm near-black. */
  ink: "#1F1B18",
  /** Body text — warm dark grey. */
  body: "#4A4440",
  /** Secondary text and captions. */
  muted: "#9B938D",
  /** Placeholders and disabled text. */
  faint: "#C4BBB4",

  // Lines
  /** Hairlines, dividers, input borders. */
  line: "#F0E8E2",

  // Status
  green: "#2DB87A",
  greenTint: "#E8F8F1",
  amber: "#F5A623",
  amberTint: "#FFF6E8",
  red: "#E6513B",
  /** Pressed state for a destructive button, mirroring orangeDeep. */
  redDeep: "#C8402C",
  redTint: "#FDEEEB",
} as const;

/** Two-stop gradients. Pass as `colors={[...Gradients.orange]}` to LinearGradient. */
export const Gradients = {
  /** Buttons and hero accents. */
  orange: ["#E8650A", "#FF8C42"] as const,
  /** Soft background washes behind hero sections. */
  heroWarm: ["#FFF3EC", "#FDFAF8"] as const,
} as const;

/* ───────────────────────────────────────────────────────────────
 * 2. SPACING — deliberately generous. When in doubt, add MORE space.
 * This is the single biggest fix for the old "cramped" feeling.
 * ─────────────────────────────────────────────────────────────── */
export const Space = {
  xs: 6,
  sm: 12,
  md: 18,
  lg: 24,
  xl: 32,
  xxl: 44,
  xxxl: 56,
  giant: 72,

  /** Horizontal screen padding — 24px on both sides, every screen. */
  screenH: 24,
  /** Internal card padding — roomy, never less than 20. */
  cardPad: 24,
} as const;

/**
 * Named layout gaps so screens stop guessing. These encode the mandatory
 * spacing rules from Section 3 of the brief.
 */
export const Gap = {
  /** Between two stacked cards — 16px minimum. */
  cards: 16,
  /** Between two distinct sections — they must feel clearly separate. */
  sections: 40,
  /** Between a screen title / header and its first content. */
  afterTitle: 32,
  /** Clearance above a sticky footer button. */
  beforeFooter: 40,
  /** Between a form label and its input. */
  labelToField: 10,
  /** Vertical padding inside a list row. */
  rowY: 18,
  /** Bottom padding at the end of a scrolling screen. */
  screenBottom: 72,
} as const;

/* ───────────────────────────────────────────────────────────────
 * 3. TYPOGRAPHY
 * Fraunces (a warm serif) for titles; Inter for everything else.
 * The font files are loaded in app/_layout.tsx. If a font fails to load,
 * React Native quietly falls back to the system font — never a blank screen.
 * ─────────────────────────────────────────────────────────────── */
export const Font = {
  /** Screen titles and hero moments — warm, premium, editorial. */
  serif: "Fraunces_600SemiBold",
  bold: "Inter_700Bold",
  semibold: "Inter_600SemiBold",
  medium: "Inter_500Medium",
  regular: "Inter_400Regular",
} as const;

export type FontToken = keyof typeof Font;

/**
 * The type scale. `font` names a key of `Font`; `spacing` is letter spacing.
 * Use `typeStyle('body')` to turn one of these into a React Native style.
 */
export const Type = {
  hero: { size: 34, font: "serif", lineHeight: 42, spacing: -0.5 },
  title: { size: 28, font: "serif", lineHeight: 36, spacing: -0.4 },
  section: { size: 20, font: "semibold", lineHeight: 26, spacing: -0.2 },
  cardTitle: { size: 17, font: "semibold", lineHeight: 24 },
  /** Body text — 16/28 gives the 1.75 line-height ratio that fixes cramping. */
  body: { size: 16, font: "regular", lineHeight: 28 },
  secondary: { size: 14, font: "regular", lineHeight: 22 },
  label: { size: 13, font: "medium", lineHeight: 18 },
  caption: { size: 12, font: "regular", lineHeight: 16 },
  /** Key numbers — big and orange. */
  dataBig: { size: 30, font: "bold", lineHeight: 34 },
} as const satisfies Record<
  string,
  { size: number; font: FontToken; lineHeight: number; spacing?: number }
>;

export type TypeToken = keyof typeof Type;

/**
 * Turn a `Type` entry into a React Native text style.
 *
 * PLAIN ENGLISH: `typeStyle('title')` gives you the right font file, size,
 * line height and letter spacing in one go, so you never have to remember
 * which font name goes with which size.
 *
 * ```tsx
 * <Text style={[typeStyle('title'), { color: Colors.ink }]}>Your journey</Text>
 * <Text style={typeStyle('body', Colors.body)}>Some supporting copy.</Text>
 * ```
 */
export function typeStyle(name: TypeToken, color?: string): TextStyle {
  const token = Type[name];
  const style: TextStyle = {
    fontFamily: Font[token.font],
    fontSize: token.size,
    lineHeight: token.lineHeight,
  };
  if ("spacing" in token && typeof token.spacing === "number") {
    style.letterSpacing = token.spacing;
  }
  if (color) {
    style.color = color;
  }
  return style;
}

/* ───────────────────────────────────────────────────────────────
 * 4. SHAPE & DEPTH
 * Big soft corners plus warm, barely-there shadows. Cards float gently.
 * ─────────────────────────────────────────────────────────────── */
export const Radius = {
  card: 24,
  button: 18,
  input: 16,
  /** Fully round (chips, pills, avatars). */
  chip: 100,
  sheet: 32,
  hero: 32,
} as const;

export const Shadow = {
  /** Default card lift. */
  soft: {
    shadowColor: "#C84B11",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 3,
  },
  /** Floating feature cards and drawers. */
  lift: {
    shadowColor: "#C84B11",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 32,
    elevation: 6,
  },
  /** Primary buttons only — the orange glow. */
  button: {
    shadowColor: "#E8650A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 20,
    elevation: 8,
  },
} as const;

/* ───────────────────────────────────────────────────────────────
 * 5. SIZES — fixed component heights used across the kit.
 * ─────────────────────────────────────────────────────────────── */
export const Size = {
  /** PrimaryButton height — tall, easy to hit, premium. */
  primaryButton: 60,
  secondaryButton: 56,
  /** Minimum ChoiceCard height. */
  choiceCard: 60,
  /** Text input / select field height. */
  input: 56,
  /** Circular back / menu buttons. */
  circleButton: 48,
  /** Orange-tint rounded icon square used in rows and action cards. */
  iconSquare: 44,
  /** Minimum accessible tap target. */
  tap: 44,
} as const;

/* ───────────────────────────────────────────────────────────────
 * 6. MOTION — durations in milliseconds. Always gate on useReducedMotion().
 * ─────────────────────────────────────────────────────────────── */
export const Motion = {
  /** Screen push / pop. */
  screen: 300,
  /** Menu drawer slide in / out. */
  drawer: 280,
  /** Button press scale. */
  pressButton: 0.97,
  /** Card tap scale. */
  pressCard: 0.98,
} as const;
