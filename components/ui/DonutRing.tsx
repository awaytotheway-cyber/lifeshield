import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { DataValue } from "@/components/ui/DataValue";
import { Colors, Typography } from "@/lib/design-tokens";

type DonutRingProps = {
  /** 0–1 fraction filled. */
  progress: number;
  /** Big number in the middle. */
  value: string | number;
  /** Small caption under the number. */
  caption?: string;
  /** Diameter. Default 100. */
  size?: number;
  /** Stroke width. Default 10. */
  stroke?: number;
  /** Ring colour. Default white (for use on the orange hero). */
  color?: string;
  /** Track colour behind the ring. */
  trackColor?: string;
  /** Colour for the centre value + caption. */
  textColor?: string;
};

/**
 * Thin SVG donut used in the Results hero. On the orange gradient the
 * ring is white at 90% for "all normal" and 50% when something needs
 * attention — one glance tells the story.
 */
export function DonutRing({
  progress,
  value,
  caption,
  size = 100,
  stroke = 10,
  color = "rgba(255,255,255,0.90)",
  trackColor = "rgba(255,255,255,0.25)",
  textColor = Colors.pureWhite,
}: DonutRingProps) {
  const safe = Number.isFinite(progress)
    ? Math.max(0, Math.min(1, progress))
    : 0;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = circumference * safe;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference - dash}`}
          // Start the arc at 12 o'clock.
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          fill="none"
        />
      </Svg>
      <View style={[StyleSheet.absoluteFillObject, styles.center]}>
        <DataValue value={value} size="hero" color={textColor} />
        {caption ? (
          <Text style={[styles.caption, { color: textColor }]}>{caption}</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: "center",
    justifyContent: "center",
  },
  caption: {
    marginTop: -2,
    fontFamily: Typography.regular,
    fontSize: Typography.micro,
    opacity: 0.65,
  },
});
