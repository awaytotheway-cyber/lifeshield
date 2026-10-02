import { StyleSheet, Text, View } from "react-native";

import { Card } from "@/components/ui/Card";
import { Colors, Space, typeStyle } from "@/lib/theme";

type StatCardProps = {
  /** Big orange number or short word. Pass "—" when there is nothing yet. */
  value: string;
  /** Quiet label underneath. */
  label: string;
  onPress?: () => void;
};

/**
 * Roomy white stat card with a big orange number and a label below.
 * Lay three of these out in a row with 16px gaps (`flex: 1` each).
 */
export function StatCard({ value, label, onPress }: StatCardProps) {
  return (
    <Card
      onPress={onPress}
      accessibilityLabel={`${label}: ${value}`}
      style={styles.card}
    >
      <View>
        <Text style={styles.value} numberOfLines={1}>
          {value}
        </Text>
        <Text style={styles.label} numberOfLines={2}>
          {label}
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 120,
    justifyContent: "center",
  },
  value: {
    ...typeStyle("dataBig"),
    color: Colors.orange,
  },
  label: {
    ...typeStyle("secondary"),
    marginTop: Space.xs,
    color: Colors.muted,
  },
});
