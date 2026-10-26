import { StyleSheet, Text, View } from "react-native";

import { Surface } from "@/components/ui/Surface";
import { colors, spacing } from "@/lib/design-tokens";
import { typography } from "@/lib/typography";

export type MilestoneStat = {
  id: string;
  value: string | number;
  label: string;
};

type MilestoneStatStripProps = {
  stats: [MilestoneStat, MilestoneStat, MilestoneStat];
};

/**
 * Three oversized display numbers — risk score, days-until-check, progress, etc.
 */
export function MilestoneStatStrip({ stats }: MilestoneStatStripProps) {
  return (
    <Surface padded={false} style={styles.card}>
      <View style={styles.row}>
        {stats.map((stat, index) => (
          <View
            key={stat.id}
            style={[styles.cell, index < 2 ? styles.cellBorder : null]}
          >
            <Text style={styles.value}>{stat.value}</Text>
            <Text style={styles.label}>{stat.label}</Text>
          </View>
        ))}
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  cell: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: spacing.sm,
  },
  // The only divider in the system, used sparingly — 1px, not a card border.
  cellBorder: {
    borderRightWidth: 1,
    borderRightColor: colors.hairline,
  },
  value: {
    ...typography.heroStat,
    color: colors.ink,
  },
  label: {
    marginTop: 4,
    ...typography.label,
    color: colors.inkSoft,
    textAlign: "center",
  },
});
