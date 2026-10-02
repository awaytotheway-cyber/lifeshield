import { StyleSheet, View } from "react-native";

import { Colors, Space } from "@/lib/theme";

export type DotState = "complete" | "current" | "upcoming";

type DotProgressProps = {
  /** One entry per journey stage, in order. */
  states: DotState[];
  accessibilityLabel?: string;
};

/**
 * Horizontal dot indicator with generous spacing between dots.
 * Complete = solid orange, current = a larger orange dot with a tint ring,
 * upcoming = a quiet warm line colour.
 */
export function DotProgress({ states, accessibilityLabel }: DotProgressProps) {
  return (
    <View
      style={styles.row}
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
    >
      {states.map((state, index) => (
        <View
          // Dots are positional, so the index is the only stable identity.
          key={index}
          style={[
            styles.dot,
            state === "complete" ? styles.complete : null,
            state === "current" ? styles.current : null,
            state === "upcoming" ? styles.upcoming : null,
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.sm,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  complete: {
    backgroundColor: Colors.orange,
  },
  current: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.orange,
    borderWidth: 3,
    borderColor: Colors.orangeTintDeep,
  },
  upcoming: {
    backgroundColor: Colors.line,
  },
});
