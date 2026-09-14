import Svg, { Circle, G, Path } from "react-native-svg";

import { IllustrationFrame } from "@/components/illustrations/IllustrationFrame";
import { colors } from "@/lib/design-tokens";

type PlanRoadmapProps = {
  width?: number;
  height?: number;
};

/**
 * A calm path with three milestone marks:
 * leaf (diet), droplet (supplements), sun (lifestyle).
 */
export function PlanRoadmap({ width = 280, height = 120 }: PlanRoadmapProps) {
  return (
    <IllustrationFrame
      width={width}
      height={height}
      accessibilityLabel="Personalised plan roadmap with diet, supplement, and lifestyle milestones"
    >
    <Svg
      width={width}
      height={height}
      viewBox="0 0 280 120"
      fill="none"
    >
      <Path
        d="M8 92h264"
        stroke={colors.lightTeal}
        strokeWidth="8"
        strokeLinecap="round"
      />

      {/* Winding path — progress, not a race */}
      <Path
        d="M16 86C48 86 56 38 96 42c36 4 40 52 88 46 40-5 48-40 80-36"
        stroke={colors.midTeal}
        strokeWidth="2.4"
        strokeLinecap="round"
      />

      {/* Diet — leaf */}
      <G>
        <Circle cx="56" cy="70" r="16" fill={colors.sageLight} />
        <Circle cx="56" cy="70" r="16" stroke={colors.sage} strokeWidth="1.6" />
        <Path
          d="M56 80c-8-8-8-18 0-26 8 8 8 18 0 26z"
          fill={colors.sage}
        />
        <Path
          d="M56 80V56"
          stroke={colors.white}
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </G>

      {/* Supplements — droplet */}
      <G>
        <Circle cx="140" cy="78" r="16" fill={colors.lightTeal} />
        <Circle
          cx="140"
          cy="78"
          r="16"
          stroke={colors.midTeal}
          strokeWidth="1.6"
        />
        <Path
          d="M140 66c6 8 8 12 8 16a8 8 0 1 1-16 0c0-4 2-8 8-16z"
          fill={colors.midTeal}
        />
        <Circle cx="138" cy="80" r="1.6" fill={colors.white} />
      </G>

      {/* Lifestyle — sun */}
      <G>
        <Circle cx="228" cy="56" r="16" fill={colors.cream} />
        <Circle
          cx="228"
          cy="56"
          r="16"
          stroke={colors.amber}
          strokeWidth="1.6"
        />
        <Circle cx="228" cy="56" r="5.2" fill={colors.amber} />
        <Path
          d="M228 42v4M228 66v4M214 56h4M238 56h4M218.2 46.2l2.8 2.8M235 63l2.8 2.8M235 46.2L232.2 49M221 63l-2.8 2.8"
          stroke={colors.amber}
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </G>
    </Svg>
    </IllustrationFrame>
  );
}
