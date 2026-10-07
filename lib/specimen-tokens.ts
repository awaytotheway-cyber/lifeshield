/**
 * PRESCOPE — SPECIMEN design language.
 *
 * The app as a personal herbarium: health recorded the way a 19th-century
 * naturalist recorded a specimen — pressed, labelled, catalogued.
 *
 * Rules of the system:
 *  · Surfaces are PAPER, never pure white. Ink is never pure black.
 *  · Structure comes from hairline RULES, not shadows and rounded cards.
 *  · One accent only: specimen-tag red. Sage and ochre are semantic, not decorative.
 *  · Every measurement, date and clinical value is set in mono — lab notation.
 *  · Corners are near-square. This is paper, not a glass panel.
 */

export const Paper = {
  /** Default screen stock — warm laboratory paper. */
  sheet: "#F5F2EB",
  /** Aged edge, insets, pressed areas. */
  sheetDeep: "#EAE5D8",
  /** A fresh mounted sheet — the "card" surface. */
  mount: "#FCFBF7",
  /** Deep plate stock used behind archival imagery. */
  plate: "#E3DDCE",
} as const;

export const Ink = {
  /** Printing ink. Never #000000. */
  full: "#1B1A17",
  /** Body copy. */
  soft: "#56524A",
  /** Captions, annotations, secondary labels. */
  faint: "#8C8678",
  /** Disabled / ghost. */
  ghost: "#B4AE9F",
  /** Hairline rules — the primary structural device. */
  rule: "#D8D2C4",
  /** Heavier rule for section breaks. */
  ruleStrong: "#BDB5A2",
  /** Ink under a press — the pressed state of a dark control. */
  pressed: "#36332D",
  /** Behind a modal or drawer: ink, thinned. Never pure black. */
  scrim: "rgba(27,26,23,0.38)",
} as const;

export const Accent = {
  /** Specimen-tag red — archival stamp. The ONLY brand accent. */
  tag: "#A4341F",
  tagWash: "#F3E4E0",
  /** Dried-herb green — "in range", healthy, complete. */
  sage: "#5F6B4C",
  sageWash: "#E7EADE",
  /** Annotation ochre — attention, worth watching. */
  ochre: "#9A6B28",
  ochreWash: "#F4EBDA",
  /** Borders for the wash surfaces, a shade down from each wash. */
  tagEdge: "#E3C8C1",
  sageEdge: "#CFD6C2",
  ochreEdge: "#E2D2B4",
  /** The tag under a press. */
  tagPressed: "#8C2C1A",
} as const;

/**
 * TWO FACES ONLY.
 *
 *   DM Serif Display — the editorial voice. Titles and specimen names.
 *   JetBrains Mono    — everything else.
 *
 * Mono carries the body and the labels, not just the numbers. That is
 * not a compromise: a real herbarium label is typewritten, so mono IS
 * the authentic label face here. JetBrains Mono was drawn for long
 * reading with a tall x-height, and body copy in this app runs to two
 * or three lines, never essays.
 */
export const SpecimenType = {
  /** Plate titles and specimen names — editorial authority. */
  serif: "DMSerifDisplay_400Regular",
  /** Everything that is not a title. Labels, body, data, UI. */
  mono: "JetBrainsMono_400Regular",
  monoBold: "JetBrainsMono_700Bold",

  /** Aliases so call sites can still read semantically. */
  sans: "JetBrainsMono_400Regular",
  sansMedium: "JetBrainsMono_400Regular",
  sansSemi: "JetBrainsMono_700Bold",

  /** Legacy family names used across older screens. Without these the
   *  call sites resolved to `undefined` and silently fell back to the
   *  platform system face, which is how half the app escaped the two-face
   *  rule. They are aliases, not a third and fourth voice. */
  regular: "JetBrainsMono_400Regular",
  medium: "JetBrainsMono_400Regular",
  semibold: "JetBrainsMono_700Bold",
  heading: "DMSerifDisplay_400Regular",

  /** Scale — editorial contrast on a 4pt rhythm, set one notch up from
   *  the original cut so the smallest labels stay legible to a reader
   *  who is not twenty-five. Nothing in the UI is below 12. */
  plateTitle: 36,
  specimenName: 27,
  sectionRule: 14,
  body: 17,
  label: 14,
  annotation: 14,
  catalogue: 12,

  /** Mono scale. */
  readingLarge: 34,
  reading: 20,
  readingSmall: 15,

  /** Legacy size names. Same scale, older vocabulary. */
  screenTitle: 28,
  sectionTitle: 20,
  bodyLarge: 17,
  secondary: 15,
  micro: 12,
  dataHero: 34,
  dataCard: 22,
  dataInline: 17,
  dataSmall: 15,
} as const;

/** Letterspacing for the small-caps label style used on every rule. */
export const TRACK = {
  /** Section rules and field labels are tracked out, like a printed form. */
  label: 1.4,
  catalogue: 0.9,
  title: -0.4,
} as const;

/** Paper does not have 24px radii. Near-square only. */
export const Edge = {
  none: 0,
  hair: 2,
  mount: 3,
  /** Thumbnails and inline chips, a touch tighter than a mounted sheet. */
  mountSmall: 2,
  tag: 2,
  /** The one exception: circular registration marks and avatars. */
  round: 1000,
} as const;

/** 4pt rhythm. Generous vertical space is the luxury signal. */
export const Measure = {
  hair: 4,
  tight: 8,
  snug: 12,
  base: 16,
  wide: 20,
  loose: 24,
  section: 36,
  page: 44,
  plate: 56,
  /** Screen gutter. Wider than a typical app — this is a page. */
  gutter: 22,
} as const;

/** Hairline weights. */
export const Rule = {
  hair: 1,
  medium: 1.5,
  heavy: 2,
} as const;

/**
 * Archival plates — public-domain source imagery (Europeana /
 * Rijksmuseum herbarium, NYPL). The original archival titles are not
 * carried into the UI: they are in Dutch and Latin and describe the
 * source object, not anything the reader is looking at here.
 */
export const PLATES = {
  herbariumFlowers: {
    uri: "https://images.unsplash.com/photo-1720714411061-ea361e343bfc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  },
  herbariumFerns: {
    uri: "https://images.unsplash.com/photo-1720714411283-4fddb1c74ea9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  },
  herbariumAllium: {
    uri: "https://images.unsplash.com/photo-1720714411092-8ea3468777fa?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  },
  herbariumThalictrum: {
    uri: "https://images.unsplash.com/photo-1720714412195-5ea918a09210?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  },
  anatomyNutrition: {
    uri: "https://images.unsplash.com/photo-1715529134960-b49e99668dcc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  },
} as const;

export type PlateKey = keyof typeof PLATES;

/**
 * Composed text styles, for the few places that spread a whole style
 * rather than setting family and size separately.
 */
export const TypeStyle = {
  plateTitle: {
    fontFamily: SpecimenType.serif,
    fontSize: SpecimenType.plateTitle,
    lineHeight: 42,
    letterSpacing: TRACK.title,
  },
  specimenName: {
    fontFamily: SpecimenType.serif,
    fontSize: SpecimenType.specimenName,
    lineHeight: 33,
    letterSpacing: TRACK.title,
  },
  readingLarge: {
    fontFamily: SpecimenType.monoBold,
    fontSize: SpecimenType.readingLarge,
    lineHeight: 38,
    letterSpacing: -0.6,
  },
} as const;

/**
 * Interaction sizing. Not a palette, but part of the same system: a
 * 44pt minimum target is an accessibility floor, not a style choice.
 */
export const tapTarget = 44;
export const inputHeight = 52;
export const primaryButtonHeight = 52;
export const secondaryButtonHeight = 48;
