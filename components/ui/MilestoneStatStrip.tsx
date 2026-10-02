import { StyleSheet, Text, View } from "react-native";

import { Card } from "@/components/ui/Card";
import { Colors, Space, typeStyle } from "@/lib/theme";

export type MilestoneStat = {
  id: string;
  value: string | number;
  label: string;
};

type MilestoneStatStripProps = {
  stats: [MilestoneStat, MilestoneStat, MilestoneStat];
};

/**
 * Three big orange numbers in one white card — progress, days until a check,
 * steps complete. The numbers are the screen's accent; everything else is quiet.
 */
export function MilestoneStatStrip({ stats }: MilestoneStatStripProps) {
  return (
    <Card>
      <View style={styles.row}>
        {stats.map((stat, index) => (
          <View
            key={stat.id}
            style={[styles.cell, index < 2 ? styles.cellBorder : null]}
          >
            <Text style={styles.value} numberOfLines={1}>
              {stat.value}
            </Text>
            <Text style={styles.label} numberOfLines={2}>
              {stat.label}
            </Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  cell: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingHorizontal: Space.sm,
  },
  cellBorder: {
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: Colors.line,
  },
  value: {
    ...typeStyle("dataBig"),
    color: Colors.orange,
  },
  label: {
    ...typeStyle("secondary"),
    marginTop: Space.xs,
    color: Colors.muted,
    textAlign: "center",
  },
});
