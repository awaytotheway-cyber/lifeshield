import Svg, { Circle, Path } from "react-native-svg";

import { IllustrationFrame } from "@/components/illustrations/IllustrationFrame";
import { colors } from "@/lib/design-tokens";

type JourneyTrailProps = {
  /** How wide the drawing should be on screen. Full-width feels natural. */
  width?: number;
  /** How tall the drawing should be on screen. */
  height?: number;
};

/**
 * Journey progress as a winding upward trail through abstract nature.
 * Milestone dots mark completed, current, and upcoming steps.
 */
export function JourneyTrail({
  width = 320,
  height = 140,
}: JourneyTrailProps) {
  return (
    <IllustrationFrame
      width={width}
      height={height}
      accessibilityLabel="Winding upward path through abstract leaves and circles with milestone markers"
    >
    <Svg
      width={width}
      height={height}
      viewBox="0 0 320 140"
    >
      {/* Soft sky / ground washes so the path has air around it */}
      <Circle cx="48" cy="108" r="36" fill={colors.sageLight} />
      <Circle cx="168" cy="72" r="42" fill={colors.lightTeal} />
      <Circle cx="268" cy="36" r="30" fill={colors.cream} />

      {/* Abstract leaves — simple two-lobe shapes, not botanical drawings */}
      <Path
        d="M36 86 C44 70 62 72 58 88 C62 102 44 104 36 86 Z"
        fill={colors.sage}
      />
      <Path
        d="M198 44 C208 30 224 34 218 48 C224 60 206 62 198 44 Z"
        fill={colors.sage}
      />
      <Path
        d="M292 22 C300 10 314 14 308 26 C314 36 298 38 292 22 Z"
        fill={colors.midTeal}
      />

      {/* Small nature dots along the hillside */}
      <Circle cx="72" cy="54" r="5" fill={colors.sageLight} />
      <Circle cx="132" cy="28" r="4" fill={colors.lightTeal} />
      <Circle cx="236" cy="88" r="6" fill={colors.sageLight} />

      {/* The trail itself — winds up from left to right */}
      <Path
        d="M16 118
           C52 118 64 92 96 88
           C128 84 140 112 172 100
           C204 88 214 52 248 46
           C276 41 288 28 304 22"
        fill="none"
        stroke={colors.deepTeal}
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Milestone markers sitting on the path */}
      {/* Done */}
      <Circle
        cx="32"
        cy="118"
        r="8"
        fill={colors.sage}
        stroke={colors.white}
        strokeWidth="2"
      />
      {/* Done */}
      <Circle
        cx="96"
        cy="88"
        r="8"
        fill={colors.sage}
        stroke={colors.white}
        strokeWidth="2"
      />
      {/* Current */}
      <Circle
        cx="172"
        cy="100"
        r="9"
        fill={colors.midTeal}
        stroke={colors.white}
        strokeWidth="2.2"
      />
      {/* Upcoming */}
      <Circle
        cx="248"
        cy="46"
        r="8"
        fill={colors.white}
        stroke={colors.deepTeal}
        strokeWidth="2.2"
      />
      {/* Goal */}
      <Circle
        cx="304"
        cy="22"
        r="7"
        fill={colors.cream}
        stroke={colors.amber}
        strokeWidth="2"
      />
    </Svg>
    </IllustrationFrame>
  );
}
