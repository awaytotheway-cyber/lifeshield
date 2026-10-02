import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { Card } from "@/components/ui/Card";
import { Colors, Gap, Space, typeStyle } from "@/lib/theme";

export type PillFeature = {
  id: string;
  label: string;
  icon?: keyof typeof Feather.glyphMap;
};

type PillFeatureGridProps = {
  features: PillFeature[];
};

/**
 * Two-column feature grid for home / onboarding highlights.
 *
 * PLAIN ENGLISH: a pair of small white cards per row, each with an orange
 * Feather icon and a short label.
 */
export function PillFeatureGrid({ features }: PillFeatureGridProps) {
  return (
    <View style={styles.grid}>
      {features.map((item) => (
        <Card key={item.id} style={styles.pill}>
          <View style={styles.row}>
            {item.icon ? (
              <Feather name={item.icon} size={18} color={Colors.orange} />
            ) : null}
            <Text style={styles.label}>{item.label}</Text>
          </View>
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Gap.cards,
  },
  pill: {
    flexGrow: 1,
    flexBasis: "45%",
    minWidth: "45%",
    paddingVertical: Space.md,
    paddingHorizontal: Space.lg,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.sm,
  },
  label: {
    flex: 1,
    ...typeStyle("label"),
    color: Colors.ink,
  },
});
