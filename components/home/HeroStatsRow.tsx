import { StyleSheet, Text, View } from "react-native";

import { DataValue } from "@/components/ui/DataValue";
import { GlassCard } from "@/components/ui/GlassCard";
import { Colors, Spacing, Typography } from "@/lib/design-tokens";

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
 * Three equal-width glass tiles that bridge the orange hero and the
 * white content below (position: absolute, bottom: -28). This bridging
 * row is one of the key v2 visual signatures.
 */
export function HeroStatsRow({ stats }: HeroStatsRowProps) {
  return (
    <View style={styles.wrap} pointerEvents="box-none">
      {stats.map((s) => (
        <GlassCard
          key={s.id}
          variant="onGradient"
          radius={20}
          padding={14}
          style={styles.tile}
        >
          <DataValue value={s.value} unit={s.unit} size="hero" color={Colors.pureWhite} unitColor="rgba(255,255,255,0.7)" />
          <Text style={styles.label}>{s.label}</Text>
        </GlassCard>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: Spacing.screenH,
    right: Spacing.screenH,
    bottom: -28,
    flexDirection: "row",
    gap: 10,
  },
  tile: {
    flex: 1,
  },
  label: {
    marginTop: 4,
    fontFamily: Typography.medium,
    fontSize: Typography.label,
    color: "rgba(255,255,255,0.72)",
  },
});
