import { StyleSheet, Text, View } from "react-native";

import { Reading } from "@/components/specimen/Primitives";
import { Ink, Measure, Rule, SpecimenType, TRACK } from "@/lib/specimen-tokens";

export type HeroStat = {
  id: string;
  value: string | number;
  unit?: string;
  label: string;
};

type HeroStatsRowProps = {
  stats: [HeroStat, HeroStat, HeroStat];
};

/**
 * The register — three readings on one ruled row.
 *
 * Three readings in a row. On paper that
 * move has nothing to bridge, so this is now what it should always have
 * been: a ruled register, vertical hairlines between columns, closed by
 * a heavier rule beneath.
 */
export function HeroStatsRow({ stats }: HeroStatsRowProps) {
  return (
    <View>
      <View style={styles.row}>
        {stats.map((s, i) => (
          <View key={s.id} style={styles.cellWrap}>
            {i > 0 ? <View style={styles.divider} /> : null}
            <View style={styles.cell}>
              <Text style={styles.label}>{s.label.toUpperCase()}</Text>
              <View style={{ marginTop: 5 }}>
                <Reading value={s.value} unit={s.unit} size="readingLarge" />
              </View>
            </View>
          </View>
        ))}
      </View>
      <View style={styles.closingRule} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "stretch",
    paddingBottom: Measure.base,
  },
  cellWrap: {
    flex: 1,
    flexDirection: "row",
  },
  divider: {
    width: Rule.hair,
    backgroundColor: Ink.rule,
    marginRight: Measure.snug,
  },
  cell: {
    flex: 1,
  },
  label: {
    fontFamily: SpecimenType.mono,
    fontSize: SpecimenType.annotation,
    letterSpacing: TRACK.label,
    color: Ink.faint,
  },
  closingRule: {
    height: Rule.medium,
    backgroundColor: Ink.ruleStrong,
  },
});
