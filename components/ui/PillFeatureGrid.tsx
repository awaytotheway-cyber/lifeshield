import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { GlassCard } from "@/components/ui/GlassCard";
import { colors, spacing } from "@/lib/design-tokens";
import { fontFamily } from "@/lib/typography";

export type PillFeature = {
  id: string;
  label: string;
  icon?: keyof typeof Feather.glyphMap;
};

type PillFeatureGridProps = {
  features: PillFeature[];
};

/**
 * Two-column pill grid for home / onboarding feature highlights.
 */
export function PillFeatureGrid({ features }: PillFeatureGridProps) {
  return (
    <View style={styles.grid}>
      {features.map((item) => (
        <GlassCard key={item.id} intensity="card" style={styles.pill}>
          <View style={styles.row}>
            {item.icon ? (
              <Feather name={item.icon} size={16} color={colors.primaryBlue} />
            ) : null}
            <Text style={styles.label}>{item.label}</Text>
          </View>
        </GlassCard>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  pill: {
    width: "48%",
    flexGrow: 1,
    minWidth: "46%",
    paddingVertical: spacing.mdSm,
    paddingHorizontal: spacing.base,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  label: {
    flex: 1,
    fontFamily: fontFamily.bodyMedium,
    fontSize: 13,
    lineHeight: 18,
    color: colors.deepNavy,
  },
});
