import Svg, { Circle, Ellipse, G, Path } from "react-native-svg";

import { IllustrationFrame } from "@/components/illustrations/IllustrationFrame";
import { colors } from "@/lib/design-tokens";

type WelcomeFigureProps = {
  /** How wide the drawing should be on screen. */
  width?: number;
  /** How tall the drawing should be on screen. */
  height?: number;
};

/**
 * Calm welcome illustration: overlapping “wholeness” circles
 * and an abstract figure with arms slightly open.
 * Flat line-art — no faces, no realistic people.
 */
export function WelcomeFigure({
  width = 200,
  height = 180,
}: WelcomeFigureProps) {
  return (
    <IllustrationFrame
      width={width}
      height={height}
      accessibilityLabel="Calm abstract figure with open arms and soft circles suggesting wholeness"
    >
    <Svg
      width={width}
      height={height}
      viewBox="0 0 200 180"
    >
      {/* Soft overlapping circles — a sense of completeness, not a medical icon */}
      <Circle cx="78" cy="94" r="62" fill={colors.lightTeal} />
      <Circle cx="130" cy="88" r="54" fill={colors.sageLight} />
      <Circle cx="104" cy="98" r="30" fill={colors.cream} />

      {/* Head — simple circle, no facial features */}
      <Circle
        cx="100"
        cy="48"
        r="16"
        fill={colors.white}
        stroke={colors.deepTeal}
        strokeWidth="2.6"
      />

      {/* Torso — rounded, friendly silhouette */}
      <Path
        d="M86 70
           C80 72 76 80 77 90
           L79 132
           C79 146 121 146 121 132
           L123 90
           C124 80 120 72 114 70
           C108 68 92 68 86 70 Z"
        fill={colors.white}
        stroke={colors.deepTeal}
        strokeWidth="2.6"
        strokeLinejoin="round"
      />

      {/* Arms slightly open — rounded strokes, welcoming not waving */}
      <G>
        <Path
          d="M80 78 C60 82 46 92 38 106"
          fill="none"
          stroke={colors.deepTeal}
          strokeWidth="7"
          strokeLinecap="round"
        />
        <Path
          d="M120 78 C140 82 154 92 162 106"
          fill="none"
          stroke={colors.deepTeal}
          strokeWidth="7"
          strokeLinecap="round"
        />
      </G>

      {/* Small grounding ellipses so the figure feels planted, not floating */}
      <Ellipse cx="90" cy="150" rx="10" ry="4" fill={colors.midTeal} />
      <Ellipse cx="110" cy="150" rx="10" ry="4" fill={colors.midTeal} />
    </Svg>
    </IllustrationFrame>
  );
}
