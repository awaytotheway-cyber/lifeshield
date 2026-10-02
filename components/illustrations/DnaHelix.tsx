import Svg, { Circle, Path } from "react-native-svg";

import { IllustrationFrame } from "@/components/illustrations/IllustrationFrame";
import { art } from "@/components/illustrations/palette";

type DnaHelixProps = {
  width?: number;
  height?: number;
};

/**
 * Friendly two-strand DNA helix for BRCA consent.
 * Rounded rungs and soft warm tones — informative, not clinical-scary.
 */
export function DnaHelix({ width = 100, height = 100 }: DnaHelixProps) {
  return (
    <IllustrationFrame
      width={width}
      height={height}
      accessibilityLabel="DNA helix"
    >
    <Svg
      width={width}
      height={height}
      viewBox="0 0 100 100"
    >
      <Circle cx={50} cy={50} r={42} fill={art.wash} />

      <Path
        d="M36 18 C52 30, 52 42, 36 50 C20 58, 20 70, 36 82"
        fill="none"
        stroke={art.outline}
        strokeWidth={3.5}
        strokeLinecap="round"
      />
      <Path
        d="M64 18 C48 30, 48 42, 64 50 C80 58, 80 70, 64 82"
        fill="none"
        stroke={art.solid}
        strokeWidth={3.5}
        strokeLinecap="round"
      />

      <Path
        d="M40 28 H60"
        stroke={art.washDeep}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
      <Path
        d="M44 40 H56"
        stroke={art.washDeep}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
      <Path
        d="M40 60 H60"
        stroke={art.washDeep}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
      <Path
        d="M44 72 H56"
        stroke={art.washDeep}
        strokeWidth={2.5}
        strokeLinecap="round"
      />

      <Circle cx={36} cy={18} r={4} fill={art.outline} />
      <Circle cx={64} cy={18} r={4} fill={art.solid} />
      <Circle cx={36} cy={50} r={4} fill={art.outline} />
      <Circle cx={64} cy={50} r={4} fill={art.solid} />
      <Circle cx={36} cy={82} r={4} fill={art.outline} />
      <Circle cx={64} cy={82} r={4} fill={art.solid} />
    </Svg>
    </IllustrationFrame>
  );
}
