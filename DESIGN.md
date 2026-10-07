# PRESCOPE — SPECIMEN

The one design language in this repository. There is no second system,
no legacy palette, and no compatibility layer. If you are adding UI,
everything you need is in `lib/specimen-tokens.ts`.

> Any earlier PRESCOPE/LifeShield design notes — teal and coral, glass
> cards, gradient heroes, drop shadows, Feather icons — describe a system
> that has been removed. Do not reintroduce them.

## The idea

The app as a personal herbarium: health recorded the way a 19th-century
naturalist recorded a specimen — pressed, labelled, catalogued. The
reader is not a patient looking at a dashboard; they are a collector
keeping their own record.

## Rules

1. **Surfaces are paper, never pure white. Ink is never pure black.**
   `Paper.sheet` is the page; `Paper.mount` is a card; `Ink.full` is
   type. `#FFFFFF` and `#000000` do not appear anywhere.
2. **Structure comes from hairline rules, not shadows.** There are no
   shadows, no elevation, no blur, no glass. A card is paper with a
   1px border. If you want to separate two things, rule between them.
3. **One accent.** `Accent.tag`, specimen-tag red. `sage` means in
   range or complete, `ochre` means worth watching — those are
   semantic, never decorative. Nothing else is coloured.
4. **No gradients.** A page opens on flat paper under the
   heavy-over-hair double rule (`PageHead`).
5. **Corners are near-square.** `Edge.mount` is 3px. The only circle is
   a registration mark or an avatar.
6. **Two faces, no more.** DM Serif Display for titles and specimen
   names; JetBrains Mono for everything else, body copy included — a
   real herbarium label is typewritten, so mono is the authentic label
   face here, not a compromise.
7. **Nothing below 14pt.** People manage their own health in this app,
   many of them older. The scale in `SpecimenType` is already set one
   notch up from a typical mobile cut; do not set type smaller than it.
8. **Icons are drawn in-house.** `SpecimenIcon` holds every glyph.
   There is no vendor icon set and no fallback — an unknown name is a
   compile error, which is deliberate. Draw the glyph.
9. **Imagery is a mounted plate.** `Plate` renders public-domain
   archival imagery inside a hairline frame. It carries no caption: the
   originals' Dutch and Latin titles describe the source object, not
   anything the reader is looking at.
10. **Generous vertical space is the luxury signal.** Spacing runs on a
    4pt rhythm (`Measure`), with a wider-than-typical screen gutter
    because this is a page, not a panel.

## Where things live

| Thing | Module |
|---|---|
| Colour, type, spacing, rules, plates | `lib/specimen-tokens.ts` |
| Card surface | `components/specimen/Sheet.tsx` |
| Page header with the double rule | `components/specimen/PageHead.tsx` |
| Catalogue head | `components/specimen/Masthead.tsx` |
| Rules, labels, readings, tags, titles | `components/specimen/Primitives.tsx` |
| Archival imagery | `components/specimen/Plate.tsx` |
| Glyphs | `components/specimen/SpecimenIcon.tsx` |
| Semantic icon lookup | `components/specimen/Icon.tsx` |

`tailwind.config.js` and `global.css` carry the same palette for the
handful of `className` call sites. Keep all three in sync.

## Psychology this has to carry

The person using PRESCOPE is thinking about their own health risk, and
may be anxious about it. Calm over clinical, warm over sterile,
empowered over scared. Progress is always visible. Never lead with
fear. One question, one action at a time — never a wall of fields.

The herbarium framing is doing real work here: it makes a health record
feel like something kept rather than something diagnosed.
