import Svg, { Circle, Ellipse, Path, Rect } from "react-native-svg";

import { IllustrationFrame } from "@/components/illustrations/IllustrationFrame";
import { colors } from "@/lib/design-tokens";

type PathwayBHandoffProps = {
  /** How wide the drawing should be on screen. */
  width?: number;
  /** How tall the drawing should be on screen. */
  height?: number;
};

/**
 * Pathway B as a caring hand-off: a warm figure guided by a hand
 * toward a doorway. Calm, not a rejection or an alarm.
 */
export function PathwayBHandoff({
  width = 160,
  height = 140,
}: PathwayBHandoffProps) {
  return (
    <IllustrationFrame
      width={width}
      height={height}
      accessibilityLabel="Warm abstract figure gently guided by a hand toward a doorway, a hand-off to care"
    >
    <Svg
      width={width}
      height={height}
      viewBox="0 0 160 140"
    >
      {/* Warm wash — coral-light so it feels human, not a red stop sign */}
      <Ellipse cx="78" cy="78" rx="72" ry="56" fill={colors.coralLight} />
      <Circle cx="118" cy="52" r="28" fill={colors.lightTeal} />

      {/* Ground path leading to the door */}
      <Path
        d="M18 118 C48 112 88 116 122 108"
        fill="none"
        stroke={colors.midTeal}
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* Door / arch — a path to care, not a locked exit */}
      <Path
        d="M118 108
           L118 52
           C118 36 146 36 146 52
           L146 108 Z"
        fill={colors.cream}
        stroke={colors.deepTeal}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <Rect x="128" y="70" width="8" height="8" rx="2" fill={colors.sage} />

      {/* Abstract figure walking toward the door — no face, no anatomy */}
      <Circle
        cx="78"
        cy="58"
        r="9"
        fill={colors.white}
        stroke={colors.deepTeal}
        strokeWidth="2.2"
      />
      <Path
        d="M70 70
           C66 72 64 78 65 86
           L66 104
           C66 110 90 110 90 104
           L91 86
           C92 78 90 72 86 70
           C82 68 74 68 70 70 Z"
        fill={colors.white}
        stroke={colors.deepTeal}
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      {/* Small step toward the door */}
      <Path
        d="M88 90 C96 88 102 92 108 96"
        fill="none"
        stroke={colors.deepTeal}
        strokeWidth="3.2"
        strokeLinecap="round"
      />

      {/* Caring hand from the left — guidance, not a push */}
      <Path
        d="M10 118
           C8 96 18 84 32 86
           C34 74 44 70 50 78
           C52 66 64 64 68 76
           C72 66 84 70 82 82
           C92 86 94 100 84 110
           C68 124 28 128 10 118 Z"
        fill={colors.sageLight}
        stroke={colors.sage}
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
    </Svg>
    </IllustrationFrame>
  );
}
