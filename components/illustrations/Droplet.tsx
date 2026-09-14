import Svg, { Circle, Path } from "react-native-svg";

import { IllustrationFrame } from "@/components/illustrations/IllustrationFrame";
import { colors } from "@/lib/design-tokens";

type DropletProps = {
  width?: number;
  height?: number;
};

/**
 * Simple liquid droplet for CTC / liquid biopsy consent.
 * Soft highlight, no blood-like red.
 */
export function Droplet({ width = 100, height = 100 }: DropletProps) {
  return (
    <IllustrationFrame
      width={width}
      height={height}
      accessibilityLabel="Liquid droplet"
    >
    <Svg
      width={width}
      height={height}
      viewBox="0 0 100 100"
    >
      <Circle cx={50} cy={50} r={42} fill={colors.lightTeal} />

      <Path
        d="M50 18 C50 18, 26 48, 26 64 C26 78, 36 86, 50 86 C64 86, 74 78, 74 64 C74 48, 50 18, 50 18 Z"
        fill={colors.midTeal}
      />
      <Path
        d="M50 26 C50 26, 34 50, 34 64 C34 74, 41 80, 50 80 C50 80, 50 80, 50 80 C42 76, 38 70, 38 62 C38 50, 50 32, 50 26 Z"
        fill={colors.deepTeal}
        opacity={0.22}
      />
      <Circle cx={42} cy={56} r={6} fill={colors.white} opacity={0.55} />
      <Circle cx={58} cy={70} r={3} fill={colors.lightTeal} />
    </Svg>
    </IllustrationFrame>
  );
}
