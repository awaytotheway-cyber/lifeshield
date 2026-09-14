import { StyleSheet, Text, View } from "react-native";

import { GlassCard } from "@/components/ui/GlassCard";
import { colors, spacing } from "@/lib/design-tokens";
import { fontFamily, typography } from "@/lib/typography";

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
    <GlassCard intensity="card" style={styles.card}>
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
    </GlassCard>
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
  cellBorder: {
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: colors.border,
  },
  value: {
    ...typography.heroStat,
    color: colors.primaryBlue,
  },
  label: {
    marginTop: 4,
    fontFamily: fontFamily.body,
    fontSize: 12,
    lineHeight: 16,
    color: colors.slate,
    textAlign: "center",
  },
});
