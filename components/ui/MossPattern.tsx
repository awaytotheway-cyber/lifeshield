import { useId } from "react";
import Svg, { Path, Pattern, Rect } from "react-native-svg";

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
        A <Pattern> is a paint server, so it is never drawn where it sits — it
        needs no <Defs> wrapper, whose web typings reject children anyway.
      */}
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
        {/* Staggered rank — a quarter at each of the tile's four corners. */}
        <Path d={lozenge(0, 0)} fill={motif} fillOpacity={motifOpacity} />
        <Path d={lozenge(TILE, 0)} fill={motif} fillOpacity={motifOpacity} />
        <Path d={lozenge(0, TILE)} fill={motif} fillOpacity={motifOpacity} />
        <Path
          d={lozenge(TILE, TILE)}
          fill={motif}
          fillOpacity={motifOpacity}
        />
      </Pattern>
      {/* The ground is painted inside the tile, so one filled rect is enough. */}
      <Rect width="100%" height={height} fill={`url(#${patternId})`} />
    </Svg>
  );
}
