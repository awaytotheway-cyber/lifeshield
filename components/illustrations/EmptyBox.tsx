import Svg, { Path } from "react-native-svg";

import { IllustrationFrame } from "@/components/illustrations/IllustrationFrame";
import { Accent, Paper } from "@/lib/specimen-tokens";

type EmptyBoxProps = {
  width?: number;
  height?: number;
};

/**
 * Open empty box with a small smile.
 * Empty cart that still feels inviting.
 */
export function EmptyBox({ width = 100, height = 100 }: EmptyBoxProps) {
  return (
    <IllustrationFrame
      width={width}
      height={height}
      accessibilityLabel="Open empty box with a gentle smile"
    >
    <Svg
      width={width}
      height={height}
      viewBox="0 0 100 100"
      fill="none"
    >
      {/* Inner floor */}
      <Path
        d="M22 46L50 58l28-12v28L50 86 22 74V46z"
        fill={Accent.tagWash}
      />
      <Path
        d="M22 46L50 58l28-12v28L50 86 22 74V46z"
        stroke={Accent.tag}
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Open flaps */}
      <Path
        d="M22 46L12 28l38-10 10 28"
        fill={Paper.sheet}
        stroke={Accent.tag}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <Path
        d="M50 18l38 10-10 18H50"
        fill={Accent.sageWash}
        stroke={Accent.sage}
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Front crease */}
      <Path
        d="M50 58v28"
        stroke={Accent.tag}
        strokeWidth="1.6"
        strokeLinecap="round"
      />

      {/* Gentle smile on the open floor */}
      <Path
        d="M40 68c3 5 17 5 20 0"
        stroke={Accent.tag}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </Svg>
    </IllustrationFrame>
  );
}
