/**
 * PRESCOPE design tokens — the Moss design language.
 *
 * Change a value here (and in tailwind.config.js + global.css if it is a
 * colour) instead of hunting through screens for hex codes.
 *
 * Moss is flat and quiet: paper ground, white cards, one black button per
 * screen. There are no borders on cards, no shadows, no elevation, no blur,
 * and no gradient other than `heroGradient` — so this file deliberately
 * exports none of those. The blue glassmorphism aliases are gone; nothing
 * here remaps an old name to a new colour.
 */

export const colors = {
  /** Primary text and the single black button. */
  ink: "#0C0C0A",
  /** Secondary text — supporting copy, captions that still must read. */
  inkSoft: "#4F4F49",
  /** Grey headline words. As a headline colour, 24px and up only. */
  inkFaint: "#8A8A84",

  /** Screen ground. White is for cards, never for the screen. */
  paper: "#F1F1EF",
  /** Cards. */
  white: "#FFFFFF",

  /** Text-safe green (5.7:1 on white) — links, active state, moss labels. */
  mossDeep: "#5F6D17",
  /** Gradient body and progress fill. */
  mossMid: "#7D9022",
  /** Gradient top and solid fills — never text. */
  mossBright: "#A3B82E",
  /** Chips, soft fills, selected rows. */
  mossTint: "#EFF2E2",

  /** The only divider: 1px, used sparingly. Never a card border. */
  hairline: "#E4E4E0",
} as const;

/** The three clinical statuses a result may carry. */
export type StatusKind = "withinRange" | "worthWatching" | "worthDiscussing";

/** A status chip's two colours and the word it must always display. */
export type StatusTone = {
  fill: string;
  text: string;
  label: string;
};

/**
 * Clinical status is lightness, not hue — green → amber → clay, never
 * green → red, so the three stay distinct in greyscale and for colour-blind
 * readers. Every chip carries its word: colour is never the only signal.
 */
export const status: Record<StatusKind, StatusTone> = {
  withinRange: { fill: "#EFF2E2", text: "#4A5612", label: "Within range" },
  worthWatching: { fill: "#F0E6D2", text: "#7A5610", label: "Worth watching" },
  worthDiscussing: { fill: "#F3DED4", text: "#9C3E16", label: "Worth discussing" },
};

/**
 * Three radii, and no others anywhere in the codebase:
 * `surface` for anything you look at, `control` for anything you press,
 * `pill` for round things.
 */
export const radius = {
  surface: 20,
  control: 4,
  pill: 999,
} as const;

/**
 * The only gradient in the app. Reserved for hero bands and the assessment
 * intro — one per screen, and never behind body copy.
 *
 * CSS equivalent: `linear-gradient(155deg, #A3B82E 0%, #7D9022 42%, #4C5812 100%)`.
 */
export const heroGradient = {
  colors: ["#A3B82E", "#7D9022", "#4C5812"],
  locations: [0, 0.42, 1],
  angle: 155,
} as const satisfies {
  colors: readonly string[];
  locations: readonly number[];
  angle: 155;
};

/** 8-point grid (4px for tiny tweaks). `screenX` is the 24px screen gutter. */
export const spacing = {
  micro: 4,
  sm: 8,
  mdSm: 12,
  base: 16,
  md: 24,
  lg: 32,
  xl: 40,
  xxl: 48,
  screenX: 24,
} as const;

/** Nothing interactive may be smaller than this in either dimension. */
export const tapTarget = 44;

/** Every control — button, input, select — is this tall. */
export const controlHeight = 56;
