import Svg, { Circle, Path, Rect } from "react-native-svg";

import { IllustrationFrame } from "@/components/illustrations/IllustrationFrame";
import { colors } from "@/lib/design-tokens";

type FollowUpCalendarProps = {
  width?: number;
  height?: number;
};

/**
 * Compact calendar with soft dots on upcoming days.
 * Routine reminders — never urgency.
 */
export function FollowUpCalendar({
  width = 100,
  height = 80,
}: FollowUpCalendarProps) {
  return (
    <IllustrationFrame
      width={width}
      height={height}
      accessibilityLabel="Calendar with gentle reminder dots on upcoming dates"
    >
    <Svg
      width={width}
      height={height}
      viewBox="0 0 100 80"
      fill="none"
    >
      <Rect x="10" y="14" width="80" height="58" rx="10" fill={colors.white} />
      <Rect
        x="10"
        y="14"
        width="80"
        height="58"
        rx="10"
        stroke={colors.deepTeal}
        strokeWidth="2"
      />

      <Path
        d="M10 18c0-2.2 1.8-4 4-4h72c2.2 0 4 1.8 4 4v14H10V18z"
        fill={colors.midTeal}
      />

      <Rect x="28" y="8" width="4.5" height="12" rx="2.25" fill={colors.deepTeal} />
      <Rect x="67.5" y="8" width="4.5" height="12" rx="2.25" fill={colors.deepTeal} />

      {/* Soft date cells */}
      <Rect x="20" y="40" width="12" height="10" rx="3" fill={colors.cream} />
      <Rect x="36" y="40" width="12" height="10" rx="3" fill={colors.cream} />
      <Rect x="52" y="40" width="12" height="10" rx="3" fill={colors.cream} />
      <Rect x="68" y="40" width="12" height="10" rx="3" fill={colors.cream} />
      <Rect x="20" y="54" width="12" height="10" rx="3" fill={colors.cream} />
      <Rect x="36" y="54" width="12" height="10" rx="3" fill={colors.cream} />
      <Rect x="52" y="54" width="12" height="10" rx="3" fill={colors.cream} />
      <Rect x="68" y="54" width="12" height="10" rx="3" fill={colors.cream} />

      {/* Reminder dots — sage / teal / amber, never coral */}
      <Circle cx="42" cy="48" r="2.2" fill={colors.sage} />
      <Circle cx="74" cy="48" r="2.2" fill={colors.midTeal} />
      <Circle cx="26" cy="62" r="2.2" fill={colors.amber} />
      <Circle cx="58" cy="62" r="2.2" fill={colors.sage} />
    </Svg>
    </IllustrationFrame>
  );
}
