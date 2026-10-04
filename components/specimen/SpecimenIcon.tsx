import Svg, { Circle, G, Line, Path, Rect } from "react-native-svg";

import { Ink } from "@/lib/specimen-tokens";

/**
 * PRESCOPE's own iconography — drawn for this app, not imported.
 *
 * House style, applied to every glyph:
 *  · 24×24 frame, optically centred, ~1px visual margin
 *  · Single consistent stroke weight; fills only where a plate would be solid
 *  · Round caps and joins — an engraver's burin, not a geometric grid
 *  · Botanical and laboratory motifs in preference to generic UI symbols
 *
 * Deliberately NOT a Feather/Material clone: the recognisable silhouettes
 * here are a leaf-sheet, a specimen vial, a survey line, a pressed seed.
 */

export type SpecimenIconName =
  | "sheet"       // home — a mounted specimen sheet
  | "survey"      // journey — a surveyor's meander with station marks
  | "vial"        // results — a graduated specimen vial
  | "slip"        // plan — a folded prescription slip
  | "index"       // more — catalogue card dividers
  | "seedling"    // goals — a shoot breaking soil
  | "pair"        // buddies — two leaves, one stem
  | "mortar"      // recipes — mortar and pestle
  | "compass"     // partners — a field compass
  | "key"         // plugins — a plate key
  | "lens"        // search / scope — a loupe over a leaf
  | "tag"         // label / status
  | "calendar"    // dated label
  | "droplet"     // sample
  | "heart"       // anatomical heart, not an emoji heart
  | "chevronLeft"
  | "chevronRight"
  | "chevronDown"
  | "check"
  | "plus"
  | "bell"
  | "lock";

type SpecimenIconProps = {
  name: SpecimenIconName;
  size?: number;
  color?: string;
  /** Stroke weight. Defaults scale gently with size. */
  weight?: number;
};

export function SpecimenIcon({
  name,
  size = 24,
  color = Ink.full,
  weight,
}: SpecimenIconProps) {
  const sw = weight ?? (size <= 18 ? 1.4 : size >= 34 ? 1.1 : 1.25);
  const common = {
    stroke: color,
    strokeWidth: sw,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    fill: "none" as const,
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {GLYPHS[name](common, color)}
    </Svg>
  );
}

type StrokeProps = {
  stroke: string;
  strokeWidth: number;
  strokeLinecap: "round";
  strokeLinejoin: "round";
  fill: "none";
};

const GLYPHS: Record<
  SpecimenIconName,
  (s: StrokeProps, color: string) => React.ReactNode
> = {
  // A mounted herbarium sheet: paper, a pressed frond, a corner label.
  sheet: (s, color) => (
    <G>
      <Rect x="4" y="2.8" width="16" height="18.4" rx="0.6" {...s} />
      <Path d="M12 7.2 v8.4" {...s} />
      <Path d="M12 9.1 c-1.7 -0.2 -2.9 -1.1 -3.4 -2.4 1.6 -0.2 2.8 0.6 3.4 2.4Z" {...s} />
      <Path d="M12 11.6 c1.7 -0.2 2.9 -1.1 3.4 -2.4 -1.6 -0.2 -2.8 0.6 -3.4 2.4Z" {...s} />
      <Path d="M12 14.1 c-1.5 -0.2 -2.6 -1 -3 -2.1 1.4 -0.2 2.5 0.5 3 2.1Z" {...s} />
      <Line x1="13.6" y1="18.4" x2="18" y2="18.4" {...s} />
      <Circle cx="7.4" cy="18.4" r="1.1" fill={color} stroke="none" />
    </G>
  ),

  // Surveyor's meander with station marks — a route actually walked.
  survey: (s, color) => (
    <G>
      <Path d="M3.4 18.6 C6.2 18.6 6.4 12.4 9.4 12.4 12.4 12.4 12 7 15 7 c2.3 0 3.4 2.2 5.6 2.2" {...s} />
      <Circle cx="3.4" cy="18.6" r="1.5" {...s} fill="none" />
      <Circle cx="9.4" cy="12.4" r="1.5" {...s} fill="none" />
      <Circle cx="15" cy="7" r="1.5" fill={color} stroke="none" />
      <Line x1="3.4" y1="21.4" x2="20.6" y2="21.4" {...s} strokeWidth={s.strokeWidth * 0.8} />
    </G>
  ),

  // Graduated specimen vial with a sample line.
  vial: (s, color) => (
    <G>
      <Path d="M9.2 2.6 h5.6" {...s} />
      <Path d="M10 2.6 v12.2 a2 2 0 0 0 4 0 V2.6" {...s} />
      <Path d="M10 13.2 a2 2 0 0 0 4 0" {...s} />
      <Path d="M10 15 a2 2 0 0 0 4 0 v-1.8 a2 2 0 0 1 -4 0Z" fill={color} stroke="none" opacity={0.9} />
      <Line x1="10" y1="6" x2="11.6" y2="6" {...s} strokeWidth={s.strokeWidth * 0.8} />
      <Line x1="10" y1="8.6" x2="12.2" y2="8.6" {...s} strokeWidth={s.strokeWidth * 0.8} />
      <Line x1="10" y1="11.2" x2="11.6" y2="11.2" {...s} strokeWidth={s.strokeWidth * 0.8} />
      <Path d="M12 17.4 v3.8" {...s} />
      <Path d="M9.6 21.2 h4.8" {...s} />
    </G>
  ),

  // A folded slip — the written plan.
  slip: (s, color) => (
    <G>
      <Path d="M5 3.2 h10.4 L19 6.8 V20.8 H5 Z" {...s} />
      <Path d="M15.4 3.2 V6.8 H19" {...s} />
      <Line x1="8" y1="11" x2="16" y2="11" {...s} strokeWidth={s.strokeWidth * 0.85} />
      <Line x1="8" y1="14" x2="16" y2="14" {...s} strokeWidth={s.strokeWidth * 0.85} />
      <Line x1="8" y1="17" x2="12.6" y2="17" {...s} strokeWidth={s.strokeWidth * 0.85} />
      <Circle cx="16.4" cy="17" r="1" fill={color} stroke="none" />
    </G>
  ),

  // Catalogue card dividers, staggered like a real index drawer.
  index: (s) => (
    <G>
      <Path d="M3.4 6.4 h12" {...s} />
      <Path d="M3.4 12 h17.2" {...s} />
      <Path d="M3.4 17.6 h8.6" {...s} />
      <Path d="M18 5 v2.8" {...s} strokeWidth={s.strokeWidth * 0.9} />
      <Path d="M15 16.2 v2.8" {...s} strokeWidth={s.strokeWidth * 0.9} />
    </G>
  ),

  // A shoot breaking soil — growth, in progress.
  seedling: (s, color) => (
    <G>
      <Path d="M12 20.6 V11" {...s} />
      <Path d="M12 13.4 C9.3 13.4 7.4 11.6 7 8.8 c2.8 -0.3 4.7 1.2 5 4.6Z" {...s} />
      <Path d="M12 11.2 c2.4 0 4.1 -1.6 4.5 -4.1 -2.5 -0.3 -4.2 1 -4.5 4.1Z" {...s} />
      <Path d="M5.6 20.6 h12.8" {...s} />
      <Circle cx="12" cy="8.2" r="0.9" fill={color} stroke="none" opacity={0.5} />
    </G>
  ),

  // Two leaves on one stem — companionship, same root.
  pair: (s) => (
    <G>
      <Path d="M12 21 V8.4" {...s} />
      <Path d="M12 14.2 C8.6 14.2 6.4 11.9 6 8.2 c3.5 -0.3 5.7 1.7 6 6Z" {...s} />
      <Path d="M12 12.4 C15.4 12.4 17.6 10.1 18 6.4 c-3.5 -0.3 -5.7 1.7 -6 6Z" {...s} />
    </G>
  ),

  // Mortar and pestle.
  mortar: (s) => (
    <G>
      <Path d="M4.6 10.6 h14.8 c0 4.4 -2.6 7.4 -7.4 7.4 S4.6 15 4.6 10.6Z" {...s} />
      <Path d="M12 18 v3" {...s} />
      <Path d="M8.6 21 h6.8" {...s} />
      <Path d="M14.6 10.6 L18.8 4.2" {...s} />
      <Path d="M17.6 3 a1.6 1.6 0 0 1 2.4 2.1" {...s} />
    </G>
  ),

  // Field compass with a true-north needle.
  compass: (s, color) => (
    <G>
      <Circle cx="12" cy="12" r="8.6" {...s} />
      <Path d="M15.2 8.8 L10.6 10.6 8.8 15.2 13.4 13.4Z" {...s} />
      <Path d="M15.2 8.8 L13.4 13.4 10.6 10.6Z" fill={color} stroke="none" />
      <Line x1="12" y1="1.6" x2="12" y2="3.4" {...s} strokeWidth={s.strokeWidth * 0.9} />
    </G>
  ),

  // A plate key.
  key: (s, color) => (
    <G>
      <Circle cx="7.6" cy="8.2" r="3.9" {...s} />
      <Circle cx="7.6" cy="8.2" r="1.3" fill={color} stroke="none" />
      <Path d="M10.4 11 L19 19.6" {...s} />
      <Path d="M16.4 17 L14.6 18.8" {...s} />
      <Path d="M18.4 19 L16.8 20.6" {...s} />
    </G>
  ),

  // A loupe held over a leaf.
  lens: (s) => (
    <G>
      <Circle cx="10.6" cy="10.6" r="6.6" {...s} />
      <Path d="M15.4 15.4 L20.6 20.6" {...s} />
      <Path d="M10.6 14 V7.6" {...s} strokeWidth={s.strokeWidth * 0.85} />
      <Path d="M10.6 10.8 c-1.7 -0.2 -2.8 -1.2 -3.1 -2.7 1.8 -0.2 2.9 0.8 3.1 2.7Z" {...s} strokeWidth={s.strokeWidth * 0.85} />
      <Path d="M10.6 12.6 c1.7 -0.2 2.8 -1.2 3.1 -2.7 -1.8 -0.2 -2.9 0.8 -3.1 2.7Z" {...s} strokeWidth={s.strokeWidth * 0.85} />
    </G>
  ),

  // A tied specimen tag.
  tag: (s, color) => (
    <G>
      <Path d="M4.2 9.6 L9.6 4.2 h9.2 a1 1 0 0 1 1 1 v9.2 l-5.4 5.4 a1.2 1.2 0 0 1 -1.7 0 L4.2 11.3 a1.2 1.2 0 0 1 0 -1.7Z" {...s} />
      <Circle cx="16" cy="8" r="1.5" fill={color} stroke="none" />
    </G>
  ),

  // A dated label with a punched hole.
  calendar: (s, color) => (
    <G>
      <Rect x="3.6" y="5.4" width="16.8" height="15" rx="0.6" {...s} />
      <Path d="M3.6 10 h16.8" {...s} />
      <Path d="M8.2 2.8 v4" {...s} />
      <Path d="M15.8 2.8 v4" {...s} />
      <Circle cx="12" cy="15" r="1.6" fill={color} stroke="none" opacity={0.85} />
    </G>
  ),

  droplet: (s, color) => (
    <G>
      <Path d="M12 2.8 C12 2.8 5.6 10 5.6 14.4 a6.4 6.4 0 0 0 12.8 0 C18.4 10 12 2.8 12 2.8Z" {...s} />
      <Path d="M9 14.8 a3 3 0 0 0 3 3" {...s} strokeWidth={s.strokeWidth * 0.85} opacity={0.6} />
      <Circle cx="12" cy="14.4" r="0" fill={color} stroke="none" />
    </G>
  ),

  // Anatomical heart — chambers and great vessels, not a valentine.
  heart: (s) => (
    <G>
      <Path d="M8.4 5.2 c3.4 -1.4 6.8 -0.6 7.8 2.4 1 3 0.2 7.4 -2.2 10.2 -1.6 1.9 -4 2.4 -5.6 1 -2.2 -1.9 -3.4 -6 -2.6 -9.6 0.3 -1.6 1.1 -3.2 2.6 -4Z" {...s} />
      <Path d="M9.4 4.6 V8" {...s} strokeWidth={s.strokeWidth * 0.9} />
      <Path d="M12.6 3.8 c0 2 -0.6 3.4 -2 4.4" {...s} strokeWidth={s.strokeWidth * 0.9} />
      <Path d="M15.4 6 c-1.4 1.1 -2.6 2.9 -3.2 5" {...s} strokeWidth={s.strokeWidth * 0.8} opacity={0.75} />
    </G>
  ),

  chevronLeft: (s) => <Path d="M14.6 5.4 L8 12 l6.6 6.6" {...s} strokeWidth={s.strokeWidth * 1.25} />,
  chevronRight: (s) => <Path d="M9.4 5.4 L16 12 l-6.6 6.6" {...s} strokeWidth={s.strokeWidth * 1.25} />,
  chevronDown: (s) => <Path d="M5.4 9.4 L12 16 l6.6 -6.6" {...s} strokeWidth={s.strokeWidth * 1.25} />,
  check: (s) => <Path d="M4.6 12.8 L9.4 17.6 19.4 6.8" {...s} strokeWidth={s.strokeWidth * 1.35} />,
  plus: (s) => (
    <G>
      <Path d="M12 4.6 v14.8" {...s} strokeWidth={s.strokeWidth * 1.25} />
      <Path d="M4.6 12 h14.8" {...s} strokeWidth={s.strokeWidth * 1.25} />
    </G>
  ),

  // A hand-bell, not a notification badge.
  bell: (s) => (
    <G>
      <Path d="M6.4 17 c1.4 -1.6 1.6 -3.2 1.7 -5.6 0.1 -2.8 1.6 -4.8 3.9 -4.8 s3.8 2 3.9 4.8 c0.1 2.4 0.3 4 1.7 5.6Z" {...s} />
      <Path d="M10.4 20 a1.8 1.8 0 0 0 3.2 0" {...s} />
      <Path d="M12 4.2 v2.4" {...s} strokeWidth={s.strokeWidth * 0.9} />
    </G>
  ),

  lock: (s) => (
    <G>
      <Rect x="4.8" y="10.6" width="14.4" height="10" rx="0.8" {...s} />
      <Path d="M8.4 10.6 V7.8 a3.6 3.6 0 0 1 7.2 0 v2.8" {...s} />
      <Path d="M12 14.4 v2.6" {...s} strokeWidth={s.strokeWidth * 1.1} />
    </G>
  ),
};
