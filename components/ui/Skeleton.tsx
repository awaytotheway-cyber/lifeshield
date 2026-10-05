import { useEffect, useState } from "react";
import { StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { colors, radius, spacing } from "@/lib/design-tokens";

/** One shimmer sweep, per the design system's loading spec. */
const SHIMMER_DURATION_MS = 1500;

type SkeletonProps = {
  width?: DimensionValue;
  height?: number;
  /** Defaults to the card corner so ghosts match the surface they stand in for. */
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * A single shimmering placeholder block.
 *
 * Use this (or the helpers below) instead of ActivityIndicator for anything
 * that is waiting on data: a ghost of the real layout tells the user what is
 * coming, where a spinner only says "wait".
 *
 * When the phone asks for less motion the sweep is dropped and the block
 * renders as a calm static fill.
 */
export function Skeleton({
  width = "100%",
  height = 12,
  borderRadius = radius.card,
  style,
}: SkeletonProps) {
  const reduceMotion = useReducedMotion();
  const [bandWidth, setBandWidth] = useState(0);
  const progress = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion || bandWidth === 0) return;

    progress.value = 0;
    progress.value = withRepeat(
      withTiming(1, {
        duration: SHIMMER_DURATION_MS,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      false,
    );

    return () => cancelAnimation(progress);
  }, [bandWidth, progress, reduceMotion]);

  const sweepStyle = useAnimatedStyle(() => ({
    transform: [
      // Travel from fully off the left edge to fully off the right edge.
      { translateX: -bandWidth + progress.value * (bandWidth * 2) },
    ],
  }));

  return (
    <View
      accessibilityLabel="Loading"
      onLayout={(event) => setBandWidth(event.nativeEvent.layout.width)}
      style={[styles.base, { width, height, borderRadius }, style]}
    >
      {!reduceMotion && bandWidth > 0 ? (
        <Animated.View style={[styles.sweep, { width: bandWidth }, sweepStyle]}>
          <LinearGradient
            colors={["transparent", "rgba(255,255,255,0.75)", "transparent"]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      ) : null}
    </View>
  );
}

/** A few ghost lines, for paragraph-shaped content. */
export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <View style={styles.textWrap}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          height={10}
          borderRadius={4}
          // Taper the last line so the block reads as prose, not a table.
          width={index === lines - 1 ? "55%" : "100%"}
        />
      ))}
    </View>
  );
}

/** A single card-shaped ghost: short title bar above two body lines. */
export function SkeletonCard() {
  return (
    <View style={styles.card}>
      <Skeleton width={88} height={12} borderRadius={6} />
      <View style={styles.cardBody}>
        <Skeleton height={10} borderRadius={4} />
        <Skeleton height={10} borderRadius={4} width="55%" />
      </View>
    </View>
  );
}

/**
 * The default content loader: a stack of card ghosts.
 * Reach for this when a screen or list is waiting on Supabase.
 */
export function SkeletonCardList({ rows = 3 }: { rows?: number }) {
  return (
    <View style={styles.list} accessibilityLabel="Loading">
      {Array.from({ length: rows }).map((_, index) => (
        <SkeletonCard key={index} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.border,
    overflow: "hidden",
  },
  sweep: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
  },
  textWrap: {
    gap: spacing.sm,
  },
  list: {
    marginTop: spacing.md,
    gap: 12,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardBody: {
    marginTop: 12,
    gap: spacing.sm,
  },
});
