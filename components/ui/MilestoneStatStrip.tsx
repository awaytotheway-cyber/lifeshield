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
 *
 * The numbers are set in `displayL`, the Moss scale's own hero-number step.
 * They were held at the pre-Moss 40 by `typography.heroStat`, a deprecated
 * alias kept alive solely for this component because inheriting `displayXL`'s
 * 46 would have grown three side-by-side numbers past a narrow screen.
 * `displayL` is 34 — smaller than the hold, so the row has more room than
 * before, not less — and this was the alias's last consumer.
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
    // The card inset is 20 top and bottom. The sides stay narrow on purpose:
    // the three cells and the rules between them need the width.
    paddingVertical: 20,
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
    ...typography.displayL,
    color: colors.ink,
  },
  // The caption under a number is meta, so it takes the micro eyebrow:
  // 11px uppercase in `inkMuted`, which clears AA where `inkFaint` does not.
  label: {
    marginTop: 6,
    ...typography.micro,
    color: colors.inkMuted,
    textAlign: "center",
  },
});
