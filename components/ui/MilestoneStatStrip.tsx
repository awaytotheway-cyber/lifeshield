import { StyleSheet, Text, View } from "react-native";

import { Sheet } from "@/components/specimen/Sheet";
import { Accent, Ink, Measure, SpecimenType, TypeStyle } from "@/lib/specimen-tokens";

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
    <Sheet style={styles.card}>
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
    </Sheet>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: Measure.base,
    paddingHorizontal: Measure.tight,
  },
  row: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  cell: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: Measure.tight,
  },
  cellBorder: {
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: Ink.rule,
  },
  value: {
    ...TypeStyle.readingLarge,
    color: Accent.tag,
  },
  label: {
    marginTop: 4,
    fontFamily: SpecimenType.mono,
    fontSize: 14,
    lineHeight: 18,
    color: Ink.soft,
    textAlign: "center",
  },
});
