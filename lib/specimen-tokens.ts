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

  /** Scale — editorial contrast, set against a 4pt rhythm.
   *  Mono runs optically larger than a sans at the same size, so the
   *  body sizes here sit one notch below where a sans would. */
  plateTitle: 34,
  specimenName: 25,
  sectionRule: 12,
  body: 15,
  label: 12,
  annotation: 11,
  catalogue: 10,

  /** Mono scale. */
  readingLarge: 30,
  reading: 18,
  readingSmall: 13,
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
  loose: 24,
  section: 36,
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
 * Archival plates — public-domain source imagery.
 * Europeana (Rijksmuseum herbarium, 1860–1890) and NYPL (Vesalius, 1545).
 * Credit is rendered in-app on the plate caption.
 */
export const PLATES = {
  herbariumFlowers: {
    uri: "https://images.unsplash.com/photo-1720714411061-ea361e343bfc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
    caption: "Collage van bloemen van de berg Rigi",
    credit: "Rijksmuseum · c.1860–1890 · Public Domain",
  },
  herbariumFerns: {
    uri: "https://images.unsplash.com/photo-1720714411283-4fddb1c74ea9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
    caption: "Collage van varens, vermoedelijk uit de Alpen",
    credit: "Rijksmuseum · c.1860–1890 · Public Domain",
  },
  herbariumAllium: {
    uri: "https://images.unsplash.com/photo-1720714411092-8ea3468777fa?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
    caption: "Allium ursinum L.",
    credit: "Rippl-Rónai Museum · 1984 · Public Domain",
  },
  herbariumThalictrum: {
    uri: "https://images.unsplash.com/photo-1720714412195-5ea918a09210?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
    caption: "Thalictrum minus L.",
    credit: "Rippl-Rónai Museum · 1991 · Public Domain",
  },
  anatomyNutrition: {
    uri: "https://images.unsplash.com/photo-1715529134960-b49e99668dcc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
    caption: "Anatomie der Ernährungsorgane",
    credit: "Heidelberg University Library · 1832 · Public Domain",
  },
} as const;

export type PlateKey = keyof typeof PLATES;
