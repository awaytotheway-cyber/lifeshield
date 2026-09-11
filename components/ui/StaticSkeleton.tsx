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
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.radioCard,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bar: {
    height: 12,
    width: 88,
    borderRadius: 6,
    backgroundColor: colors.border,
    marginBottom: 12,
  },
  lineWide: {
    height: 10,
    width: "100%",
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  lineShort: {
    marginTop: 8,
    height: 10,
    width: "55%",
    borderRadius: 4,
    backgroundColor: colors.border,
  },
});
