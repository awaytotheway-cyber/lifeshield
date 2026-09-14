import Svg, { Circle, Path, Rect } from "react-native-svg";

import { IllustrationFrame } from "@/components/illustrations/IllustrationFrame";
import { colors } from "@/lib/design-tokens";

type CalendarCheckProps = {
  width?: number;
  height?: number;
};

/**
 * Small calendar with a sage check.
 * Empty follow-ups: you are caught up.
 */
export function CalendarCheck({
  width = 100,
  height = 100,
}: CalendarCheckProps) {
  return (
    <IllustrationFrame
      width={width}
      height={height}
      accessibilityLabel="Calendar with a checkmark showing you are caught up"
    >
    <Svg
      width={width}
      height={height}
      viewBox="0 0 100 100"
      fill="none"
    >
      <Rect x="16" y="22" width="68" height="60" rx="10" fill={colors.white} />
      <Rect
        x="16"
        y="22"
        width="68"
        height="60"
        rx="10"
        stroke={colors.deepTeal}
        strokeWidth="2"
      />

      {/* Header bar */}
      <Path
        d="M16 22c0-2.2 1.8-4 4-4h60c2.2 0 4 1.8 4 4v16H16V22z"
        fill={colors.midTeal}
      />

      {/* Binding rings */}
      <Rect x="32" y="14" width="5" height="14" rx="2.5" fill={colors.deepTeal} />
      <Rect x="63" y="14" width="5" height="14" rx="2.5" fill={colors.deepTeal} />

      {/* Quiet grid — planned empty, not missing */}
      <Path
        d="M32 52h36M32 64h36"
        stroke={colors.lightTeal}
        strokeWidth="1.6"
        strokeLinecap="round"
      />

      {/* Check — completion, not urgency */}
      <Circle cx="62" cy="68" r="14" fill={colors.sageLight} />
      <Path
        d="M54 68l5.5 5.5L72 61"
        stroke={colors.sage}
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
    </IllustrationFrame>
  );
}
