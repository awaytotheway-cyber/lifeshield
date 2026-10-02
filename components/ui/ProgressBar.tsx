import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { Colors, Gradients, Space } from "@/lib/theme";

type ProgressBarProps = {
  current: number;
  total: number;
  /** Remove the default top margin when the bar sits flush under a header. */
  flush?: boolean;
};

/** Slim orange-gradient progress bar on a warm track. */
export function ProgressBar({ current, total, flush = false }: ProgressBarProps) {
  const safeTotal = total > 0 ? total : 1;
  const ratio = Math.min(1, Math.max(0, current / safeTotal));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: safeTotal, now: current }}
      style={[styles.track, flush ? styles.flush : null]}
    >
      <LinearGradient
        colors={[...Gradients.orange]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={[styles.fill, { width: `${Math.round(ratio * 100)}%` }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    marginTop: Space.md,
    height: 6,
    width: "100%",
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: Colors.line,
  },
  flush: {
    marginTop: 0,
  },
  fill: {
    height: 6,
    borderRadius: 999,
  },
});
