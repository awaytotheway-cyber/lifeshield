import Svg, { Circle, Line } from "react-native-svg";

import { IllustrationFrame } from "@/components/illustrations/IllustrationFrame";
import { art } from "@/components/illustrations/palette";

type SectionCompleteProps = {
  width?: number;
  height?: number;
};

/**
 * Quiet starburst for a finished questionnaire section.
 * Contained and calm — not a party or confetti explosion.
 */
export function SectionComplete({
  width = 80,
  height = 80,
}: SectionCompleteProps) {
  return (
    <IllustrationFrame
      width={width}
      height={height}
      accessibilityLabel="Section complete"
    >
    <Svg
      width={width}
      height={height}
      viewBox="0 0 80 80"
    >
      <Circle cx={40} cy={40} r={22} fill={art.doneWash} />
      <Circle cx={40} cy={40} r={10} fill={art.done} />
      <Circle cx={40} cy={40} r={4} fill={art.paper} />

      <Line
        x1={40}
        y1={10}
        x2={40}
        y2={20}
        stroke={art.done}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
      <Line
        x1={40}
        y1={60}
        x2={40}
        y2={70}
        stroke={art.done}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
      <Line
        x1={10}
        y1={40}
        x2={20}
        y2={40}
        stroke={art.done}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
      <Line
        x1={60}
        y1={40}
        x2={70}
        y2={40}
        stroke={art.done}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
      <Line
        x1={18}
        y1={18}
        x2={25}
        y2={25}
        stroke={art.done}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Line
        x1={55}
        y1={55}
        x2={62}
        y2={62}
        stroke={art.done}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Line
        x1={62}
        y1={18}
        x2={55}
        y2={25}
        stroke={art.done}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Line
        x1={25}
        y1={55}
        x2={18}
        y2={62}
        stroke={art.done}
        strokeWidth={2}
        strokeLinecap="round"
      />

      <Circle cx={28} cy={14} r={2} fill={art.done} />
      <Circle cx={66} cy={32} r={1.8} fill={art.done} />
      <Circle cx={52} cy={68} r={2} fill={art.done} />
      <Circle cx={14} cy={48} r={1.6} fill={art.done} />
    </Svg>
    </IllustrationFrame>
  );
}
