import Svg, { Circle, Path } from "react-native-svg";

import { IllustrationFrame } from "@/components/illustrations/IllustrationFrame";
import { colors } from "@/lib/design-tokens";

type ShieldTrustProps = {
  /** How wide the drawing should be on screen. */
  width?: number;
  /** How tall the drawing should be on screen. */
  height?: number;
};

/**
 * Trust mark: a rounded shield, a gentle check, and tiny data dots
 * flowing inward. Abstract — not a lock, not a hospital badge.
 */
export function ShieldTrust({ width = 120, height = 120 }: ShieldTrustProps) {
  return (
    <IllustrationFrame
      width={width}
      height={height}
      accessibilityLabel="Shield with a gentle checkmark and small abstract data dots flowing into it"
    >
    <Svg
      width={width}
      height={height}
      viewBox="0 0 120 120"
    >
      {/* Soft halo so the shield sits in space, not on a hard box */}
      <Circle cx="64" cy="62" r="46" fill={colors.lightTeal} />

      {/* Data dots — small markers drifting toward the shield */}
      <Circle cx="14" cy="28" r="3.2" fill={colors.midTeal} />
      <Circle cx="26" cy="18" r="2.4" fill={colors.sage} />
      <Circle cx="22" cy="40" r="2" fill={colors.amber} />
      <Circle cx="36" cy="30" r="2.8" fill={colors.deepTeal} />
      <Circle cx="32" cy="50" r="1.8" fill={colors.midTeal} />
      <Circle cx="44" cy="20" r="1.6" fill={colors.sage} />

      {/* Shield body — classic but rounded, filled cream for warmth */}
      <Path
        d="M60 16
           L96 30
           C96 58 88 86 60 104
           C32 86 24 58 24 30
           Z"
        fill={colors.cream}
        stroke={colors.deepTeal}
        strokeWidth="2.6"
        strokeLinejoin="round"
      />

      {/* Inner wash — a second, quieter layer of protection */}
      <Path
        d="M60 26
           L86 36
           C86 58 80 80 60 94
           C40 80 34 58 34 36
           Z"
        fill={colors.sageLight}
      />

      {/* Gentle check — sage success, not a harsh tick */}
      <Path
        d="M46 62 L56 74 L76 50"
        fill="none"
        stroke={colors.sage}
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
    </IllustrationFrame>
  );
}
