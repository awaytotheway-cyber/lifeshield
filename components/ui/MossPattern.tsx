import { useId } from "react";
import Svg, { Defs, Path, Pattern, Rect } from "react-native-svg";

import { colors } from "@/lib/design-tokens";

type MossPatternProps = {
  /** Band height in points. Width always fills the parent. */
  height?: number;
  tone?: "tint" | "deep";
};

/** One tile of the lattice, in points. */
const TILE = 36;
/** Half the diagonal of a lozenge — so each one is 20 across, 20 tall. */
const ARM = 10;

/**
 * A lozenge centred on (cx, cy). Corner tiles draw theirs half outside the
 * tile on purpose: the pattern clips each tile, and the four tiles meeting at
 * a lattice point each contribute one quarter, so the lozenge reassembles
 * across the seam.
 */
function lozenge(cx: number, cy: number): string {
  return `M${cx} ${cy - ARM} L${cx + ARM} ${cy} L${cx} ${cy + ARM} L${cx - ARM} ${cy} Z`;
}

/**
 * The one decorative texture in the app: a flat tiling lozenge lattice in the
 * moss palette.
 *
 * It is deliberately a motif and not a picture. It replaces the illustration
 * set, so it has no figures, no faces and no scene — nothing with a subject to
 * compete with the words placed over or beside it. Two staggered ranks of
 * lozenges, one ground colour, one fill, no gradient and no stroke.
 *
 * `tint` is the quiet version for behind body copy; `deep` is the loud one for
 * a hero band, where only white display type belongs on top.
 */
export function MossPattern({ height = 160, tone = "tint" }: MossPatternProps) {
  // Two patterns on one screen must not share an id; useId's punctuation is
  // not safe inside url(#…), so strip it.
  const patternId = `moss-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

  const ground = tone === "deep" ? colors.mossDeep : colors.mossTint;
  const motif = tone === "deep" ? colors.mossBright : colors.mossMid;
  const motifOpacity = tone === "deep" ? 0.34 : 0.22;

  return (
    <Svg width="100%" height={height}>
      {/*
        <Defs> is required, not decorative. In the SVG spec a <pattern> is a
        paint server that is never drawn where it sits, but react-native-svg
        15.15.4 does not implement it that way: DefsView.java and RNSVGDefs.mm
        each override render to a no-op, while PatternView extends GroupView
        and RNSVGPattern : RNSVGGroup override neither. So without this wrapper
        both native platforms render the pattern as an ordinary group and paint
        one stray 36pt tile at the SVG origin on top of registering the brush.
        Do not "simplify" this away.
      */}
      {
        // @ts-expect-error -- react-native-svg's Defs declares children on
        // native (elements/Defs.d.ts: Component<React.PropsWithChildren>) but
        // not on web (elements.web.d.ts: `Defs extends WebShape`, i.e. bare
        // BaseProps). This tsconfig puts ".web" ahead of "" in moduleSuffixes,
        // so the childless declaration is the one that resolves. Delete this
        // line once the library's web typings carry children.
        <Defs>
          <Pattern
            id={patternId}
            patternUnits="userSpaceOnUse"
            width={TILE}
            height={TILE}
          >
            <Rect width={TILE} height={TILE} fill={ground} />
            {/* Centred rank. */}
            <Path
              d={lozenge(TILE / 2, TILE / 2)}
              fill={motif}
              fillOpacity={motifOpacity}
            />
            {/* Staggered rank — a quarter at each of the tile's corners. */}
            <Path d={lozenge(0, 0)} fill={motif} fillOpacity={motifOpacity} />
            <Path d={lozenge(TILE, 0)} fill={motif} fillOpacity={motifOpacity} />
            <Path d={lozenge(0, TILE)} fill={motif} fillOpacity={motifOpacity} />
            <Path
              d={lozenge(TILE, TILE)}
              fill={motif}
              fillOpacity={motifOpacity}
            />
          </Pattern>
        </Defs>
      }
      {/* The ground is painted inside the tile, so one filled rect is enough. */}
      <Rect width="100%" height={height} fill={`url(#${patternId})`} />
    </Svg>
  );
}
