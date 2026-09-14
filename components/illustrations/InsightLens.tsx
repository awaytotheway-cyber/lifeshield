import Svg, { Circle, G, Line, Path } from "react-native-svg";

import { IllustrationFrame } from "@/components/illustrations/IllustrationFrame";
import { colors } from "@/lib/design-tokens";

type InsightLensProps = {
  width?: number;
  height?: number;
};

/**
 * Abstract magnifying glass with coloured dots inside the lens.
 * Insight, not judgment — dots are observations, not alerts.
 */
export function InsightLens({ width = 120, height = 100 }: InsightLensProps) {
  return (
    <IllustrationFrame
      width={width}
      height={height}
      accessibilityLabel="Magnifying glass revealing coloured dots of insight"
    >
    <Svg
      width={width}
      height={height}
      viewBox="0 0 120 100"
      fill="none"
    >
      {/* Soft ground so the mark sits on cream, not empty space */}
      <Circle cx="46" cy="44" r="34" fill={colors.cream} />

      {/* Lens glass */}
      <Circle cx="46" cy="44" r="26" fill={colors.lightTeal} />
      <Circle
        cx="46"
        cy="44"
        r="26"
        stroke={colors.deepTeal}
        strokeWidth="2.4"
      />

      {/* Gentle highlight — Apple Health–style, one stroke only */}
      <Path
        d="M32 36c4-8 14-12 22-8"
        stroke={colors.white}
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Observation dots (sage / teal / amber — curiosity, not risk) */}
      <Circle cx="38" cy="40" r="4.2" fill={colors.sage} />
      <Circle cx="52" cy="38" r="3.4" fill={colors.midTeal} />
      <Circle cx="48" cy="50" r="3.8" fill={colors.amber} />
      <Circle cx="36" cy="52" r="2.4" fill={colors.deepTeal} />

      {/* Handle */}
      <G>
        <Line
          x1="64"
          y1="62"
          x2="92"
          y2="88"
          stroke={colors.deepTeal}
          strokeWidth="5"
          strokeLinecap="round"
        />
        <Line
          x1="66"
          y1="64"
          x2="90"
          y2="86"
          stroke={colors.midTeal}
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </G>
    </Svg>
    </IllustrationFrame>
  );
}
