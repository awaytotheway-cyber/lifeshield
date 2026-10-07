import { StyleSheet, View } from "react-native";
import { Edge, Ink, Measure, Paper } from "@/lib/specimen-tokens";

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
    marginTop: Measure.loose,
    gap: 12,
  },
  card: {
    backgroundColor: Paper.mount,
    borderRadius: Edge.mount,
    padding: Measure.base,
    borderWidth: 1,
    borderColor: Ink.rule,
  },
  bar: {
    height: 12,
    width: 88,
    borderRadius: 6,
    backgroundColor: Ink.rule,
    marginBottom: 12,
  },
  lineWide: {
    height: 10,
    width: "100%",
    borderRadius: 4,
    backgroundColor: Ink.rule,
  },
  lineShort: {
    marginTop: 8,
    height: 10,
    width: "55%",
    borderRadius: 4,
    backgroundColor: Ink.rule,
  },
});
