import { useState } from "react";
import { StyleSheet, View, type DimensionValue } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { colors } from "@/lib/design-tokens";

type ShimmerProps = {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: object;
};

const SWEEP_MS = 1200;

/**
 * Placeholder rectangle with a light sweep across it. Falls back to a plain
 * static block when the system asks for reduced motion, and before layout
 * reports a width (the sweep distance depends on it).
 */
export function Shimmer({
  width = "100%",
  height = 12,
  radius = 6,
  style,
}: ShimmerProps) {
  const reduceMotion = useReducedMotion();
  const [measured, setMeasured] = useState(0);

  const sweep = useAnimatedStyle(() => {
    if (reduceMotion || measured === 0) {
      return { opacity: 0 };
    }
    return {
      opacity: 1,
      transform: [
        {
          translateX: withRepeat(
            withTiming(measured, { duration: SWEEP_MS }),
            -1,
            false,
          ),
        },
      ],
    };
  });

  return (
    <View
      onLayout={(event) => {
        const next = event.nativeEvent.layout.width;
        if (next > 0 && next !== measured) {
          setMeasured(next);
        }
      }}
      style={[styles.base, { width, height, borderRadius: radius }, style]}
    >
      <Animated.View
        style={[styles.sweepWrap, { width: measured, left: -measured }, sweep]}
      >
        <LinearGradient
          colors={["transparent", "rgba(255,255,255,0.75)", "transparent"]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.border,
    overflow: "hidden",
  },
  sweepWrap: {
    position: "absolute",
    top: 0,
    bottom: 0,
  },
});
