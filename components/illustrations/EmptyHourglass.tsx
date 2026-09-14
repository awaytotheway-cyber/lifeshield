import Svg, { Circle, Path } from "react-native-svg";

import { IllustrationFrame } from "@/components/illustrations/IllustrationFrame";
import { colors } from "@/lib/design-tokens";

type EmptyHourglassProps = {
  width?: number;
  height?: number;
};

/**
 * Hourglass with a quiet trickle of sand.
 * Empty on purpose: results are still on their way.
 */
export function EmptyHourglass({
  width = 100,
  height = 100,
}: EmptyHourglassProps) {
  return (
    <IllustrationFrame
      width={width}
      height={height}
      accessibilityLabel="Hourglass showing results are still on their way"
    >
    <Svg
      width={width}
      height={height}
      viewBox="0 0 100 100"
      fill="none"
    >
      <Circle cx="50" cy="50" r="42" fill={colors.cream} />

      {/* Caps */}
      <Path
        d="M28 18h44"
        stroke={colors.deepTeal}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <Path
        d="M28 82h44"
        stroke={colors.deepTeal}
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* Glass silhouette */}
      <Path
        d="M32 20c0 10 4 16 18 30C36 64 32 70 32 80h36c0-10-4-16-18-30 14-14 18-20 18-30H32z"
        stroke={colors.midTeal}
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Remaining sand (top) — planned wait, not an error */}
      <Path
        d="M38 24h24c-2 8-8 14-12 18-4-4-10-10-12-18z"
        fill={colors.amber}
        opacity={0.85}
      />

      {/* Gentle trickle — static grains, no looping motion */}
      <Circle cx="50" cy="48" r="1.3" fill={colors.amber} />
      <Circle cx="50" cy="54" r="1.1" fill={colors.amber} />
      <Circle cx="50" cy="59" r="0.9" fill={colors.amber} />

      {/* Soft pile at the bottom */}
      <Path
        d="M40 76c3-8 7-12 10-12s7 4 10 12H40z"
        fill={colors.amber}
        opacity={0.7}
      />
    </Svg>
    </IllustrationFrame>
  );
}
