import { useEffect, useRef } from "react";
import { Animated, Easing, View, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { Colors } from "@/lib/design-tokens";

type ProgressBarProps = {
  /** v2: direct fraction 0–1. */
  progress?: number;
  /** Legacy: `current / total`. */
  current?: number;
  total?: number;
  height?: number;
  /** Default true. Set false to skip the Animated transition. */
  animated?: boolean;
  /** Round the ends. Default true. */
  rounded?: boolean;
  style?: ViewStyle;
};

/**
 * Orange-gradient progress bar on a warm neutral track. Accepts either
 * a 0–1 `progress` fraction (v2) or a `current / total` pair (legacy).
 */
export function ProgressBar({
  progress,
  current,
  total,
  height = 6,
  animated = true,
  rounded = true,
  style,
}: ProgressBarProps) {
  const fraction = clamp01(
    typeof progress === "number"
      ? progress
      : total && total > 0
        ? (current ?? 0) / total
        : 0,
  );

  const anim = useRef(new Animated.Value(fraction)).current;

  useEffect(() => {
    if (!animated) {
      anim.setValue(fraction);
      return;
    }
    Animated.timing(anim, {
      toValue: fraction,
      duration: 600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [anim, animated, fraction]);

  const width = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  const r = rounded ? height / 2 : 0;

  return (
    <View
      style={[
        {
          width: "100%",
          height,
          backgroundColor: Colors.borderLight,
          borderRadius: r,
          overflow: "hidden",
        },
        style,
      ]}
    >
      <Animated.View style={{ height, width, borderRadius: r, overflow: "hidden" }}>
        <LinearGradient
          colors={[Colors.orangeDark, Colors.orangeBright]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={{ flex: 1, borderRadius: r }}
        />
      </Animated.View>
    </View>
  );
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}
