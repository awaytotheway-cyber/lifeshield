import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { Card } from "@/components/ui/Card";
import { Colors, Radius, Space, typeStyle } from "@/lib/theme";

type EmptyStateProps = {
  icon?: keyof typeof Feather.glyphMap;
  heading: string;
  explanation: string;
  /** Optional drawing. When set, the Feather icon is not shown. */
  illustration?: ReactNode;
};

/** Designed empty state — never “No data found”. */
export function EmptyState({
  icon = "inbox",
  heading,
  explanation,
  illustration,
}: EmptyStateProps) {
  return (
    <Card style={styles.wrap}>
      {illustration ?? (
        <View style={styles.iconHalo}>
          <Feather name={icon} size={28} color={Colors.orange} />
        </View>
      )}
      <Text style={styles.heading}>{heading}</Text>
      <Text style={styles.body}>{explanation}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    // Taller than a normal card: an empty state should feel like calm space.
    paddingVertical: Space.xl,
  },
  iconHalo: {
    width: 72,
    height: 72,
    borderRadius: Radius.chip,
    backgroundColor: Colors.orangeTint,
    alignItems: "center",
    justifyContent: "center",
  },
  heading: {
    ...typeStyle("section"),
    marginTop: Space.lg,
    color: Colors.ink,
    textAlign: "center",
  },
  body: {
    ...typeStyle("body"),
    marginTop: Space.sm,
    color: Colors.body,
    textAlign: "center",
  },
});
