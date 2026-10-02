import { StyleSheet, View } from "react-native";

import { Colors, Gap, Radius, Shadow, Space } from "@/lib/theme";

type StaticSkeletonProps = {
  rows?: number;
};

/** Ghost layout with no pulse — stands in for white cards while data loads. */
export function StaticSkeleton({ rows = 3 }: StaticSkeletonProps) {
  return (
    <View style={styles.wrap} accessibilityLabel="Loading">
      {Array.from({ length: rows }).map((_, index) => (
        <View key={index} style={[styles.card, Shadow.soft]}>
          <View style={styles.bar} />
          <View style={styles.lineWide} />
          <View style={styles.lineShort} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    // Matches the 16px gap real stacked cards use, so nothing jumps on load.
    gap: Gap.cards,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.card,
    padding: Space.cardPad,
  },
  bar: {
    height: 12,
    width: 96,
    borderRadius: 6,
    backgroundColor: Colors.orangeTint,
  },
  lineWide: {
    marginTop: Space.md,
    height: 10,
    width: "100%",
    borderRadius: 5,
    backgroundColor: Colors.line,
  },
  lineShort: {
    marginTop: Gap.labelToField,
    height: 10,
    width: "55%",
    borderRadius: 5,
    backgroundColor: Colors.line,
  },
});
