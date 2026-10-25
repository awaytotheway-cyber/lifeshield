import { StyleSheet, View } from "react-native";

import { colors, radius } from "@/lib/design-tokens";

type ProgressBarProps = {
  current: number;
  total: number;
};

/** Moss progress: a `mossMid` fill on a `hairline` track, and nothing else. */
export function ProgressBar({ current, total }: ProgressBarProps) {
  const safeTotal = total > 0 ? total : 1;
  const ratio = Math.min(1, Math.max(0, current / safeTotal));

  return (
    <View
      style={styles.track}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: safeTotal, now: current }}
    >
      <View style={[styles.fill, { width: `${Math.round(ratio * 100)}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    marginTop: 16,
    height: 6,
    width: "100%",
    borderRadius: radius.pill,
    backgroundColor: colors.hairline,
    overflow: "hidden",
  },
  fill: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.mossMid,
  },
});
