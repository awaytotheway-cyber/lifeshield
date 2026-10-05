import { StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing } from "@/lib/design-tokens";
import type { ResultStatusChip } from "@/lib/result-status";
import { typography } from "@/lib/typography";

/**
 * Colour-coded status. Leads the row so the raw number is never the headline.
 *
 * Same contract as components/ui/StatusChip: tinted fill, deepNavy label, and
 * the status colour on the dot. The previous version put iceBlue on the
 * vivid red (3.13:1) and primaryBlue on the vivid green (2.48:1) — the
 * within-range chip, which most users see most often, was the worst of the
 * two. deepNavy on these tints is 13-15:1.
 */
export function StatusChip({ chip }: { chip: ResultStatusChip }) {
  const palette =
    chip.tone === "needs_attention"
      ? { bg: colors.riskHighLight, dot: colors.riskHigh }
      : chip.tone === "worth_watching"
        ? { bg: colors.riskModerateLight, dot: colors.riskModerate }
        : { bg: colors.riskLowLight, dot: colors.riskLow };

  return (
    <View style={[styles.chip, { backgroundColor: palette.bg }]}>
      <View style={[styles.dot, { backgroundColor: palette.dot }]} />
      <Text style={styles.label}>{chip.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.micro + 2,
    minWidth: 72,
    paddingHorizontal: spacing.mdSm,
    paddingVertical: spacing.micro,
    borderRadius: radius.chip,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radius.chip,
  },
  label: {
    ...typography.chip,
    textTransform: "none",
    color: colors.heading,
  },
});
