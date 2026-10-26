import { StyleSheet, View } from "react-native";

import { colors, radius, spacing } from "@/lib/design-tokens";

type StaticSkeletonProps = {
  rows?: number;
};

/** Ghost layout with no pulse — used on Results and Plan while data loads. */
export function StaticSkeleton({ rows = 3 }: StaticSkeletonProps) {
  return (
    <View style={styles.wrap} accessibilityLabel="Loading">
      {Array.from({ length: rows }).map((_, index) => (
        <View key={index} style={styles.card}>
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
    marginTop: spacing.md,
    gap: 12,
  },
  // A card has no border, so the ghost does not grow one either — the white
  // fill and the hairline blocks inside it are the whole shape.
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.surface,
    padding: spacing.base,
  },
  bar: {
    height: 12,
    width: 88,
    borderRadius: radius.control,
    backgroundColor: colors.hairline,
    marginBottom: 12,
  },
  lineWide: {
    height: 10,
    width: "100%",
    borderRadius: radius.control,
    backgroundColor: colors.hairline,
  },
  lineShort: {
    marginTop: 8,
    height: 10,
    width: "55%",
    borderRadius: radius.control,
    backgroundColor: colors.hairline,
  },
});
