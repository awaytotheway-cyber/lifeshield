import { StyleSheet, View } from "react-native";

import { PixelStat } from "@/components/ui/PixelStat";
import { colors, spacing } from "@/lib/design-tokens";

export type StatEntry = {
  label: string;
  value: string;
  caption?: string;
};

type OrangeStatPanelProps = {
  stats: readonly StatEntry[];
};

/**
 * SwimClub statistic showcase — full-bleed tabloid-orange band divided
 * into equal columns by thin white vertical lines. Each column carries a
 * mono uppercase caption and a giant pixel numeral in ink black.
 *
 * The single most distinctive band in the system; use for headline
 * numbers (risk score, days-until-check, sample counts). At most one
 * per screen so it retains its impact.
 */
export function OrangeStatPanel({ stats }: OrangeStatPanelProps) {
  return (
    <View style={styles.panel}>
      {stats.map((stat, index) => (
        <View
          key={stat.label}
          style={[
            styles.cell,
            index > 0 ? styles.cellBordered : null,
          ]}
        >
          <PixelStat
            label={stat.label}
            value={stat.value}
            caption={stat.caption}
            tone="onOrange"
            size={90}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    flexDirection: "row",
    backgroundColor: colors.tabloidOrange,
    paddingVertical: spacing.lg,
  },
  cell: {
    flex: 1,
    paddingHorizontal: spacing.base,
  },
  cellBordered: {
    borderLeftWidth: 1,
    borderLeftColor: colors.paperWhite,
  },
});
