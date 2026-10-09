import Svg, { Circle } from "react-native-svg";
import { StyleSheet, View } from "react-native";

import { colors } from "@/lib/design-tokens";

type ProgressRingProps = {
  current: number;
  total: number;
  size?: number;
  thickness?: number;
  /** Ring colour. Track is always the pale border blue. */
  color?: string;
  children?: React.ReactNode;
};

/**
 * Circular progress ring with the filled arc starting at 12 o'clock.
 * Children render centred inside the ring.
 */
export function ProgressRing({
  current,
  total,
  size = 64,
  thickness = 6,
  color = colors.primaryBlue,
  children,
}: ProgressRingProps) {
  const safeTotal = total > 0 ? total : 1;
  const ratio = Math.min(1, Math.max(0, current / safeTotal));
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={colors.border}
          strokeWidth={thickness}
          fill="none"
        />
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={color}
          strokeWidth={thickness}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - ratio)}
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>
      {children ? (
        <View style={[StyleSheet.absoluteFill, styles.center]}>{children}</View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: "center",
    justifyContent: "center",
  },
});
