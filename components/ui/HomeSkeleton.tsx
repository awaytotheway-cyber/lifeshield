import { StyleSheet, View } from "react-native";

import { GlassCard } from "@/components/ui/GlassCard";
import { Shimmer } from "@/components/ui/Shimmer";
import { colors, spacing } from "@/lib/design-tokens";

/**
 * Ghost of the home screen — greeting, stat cards, trust grid and timeline —
 * shown while the session and questionnaire progress resolve. Shapes track
 * the real layout so content does not jump when it arrives.
 */
export function HomeSkeleton() {
  return (
    <View accessibilityLabel="Loading your overview">
      <Shimmer width={90} height={14} radius={7} />
      <View style={styles.gapLg}>
        <Shimmer width="62%" height={26} radius={8} />
      </View>
      <View style={styles.gapSm}>
        <Shimmer width="45%" height={14} radius={7} />
      </View>

      <View style={styles.gapLg}>
        <GlassCard intensity="card" style={styles.primaryCard}>
          <Shimmer width={72} height={72} radius={36} />
          <View style={styles.primaryText}>
            <Shimmer width="55%" height={20} radius={6} />
            <View style={styles.gapSm}>
              <Shimmer width="75%" height={12} radius={6} />
            </View>
          </View>
        </GlassCard>
      </View>

      <View style={styles.row}>
        {[0, 1].map((key) => (
          <GlassCard key={key} intensity="card" style={styles.smallCard}>
            <Shimmer width={36} height={36} radius={18} />
            <View style={styles.gapSm}>
              <Shimmer width="70%" height={14} radius={6} />
            </View>
            <View style={styles.gapXs}>
              <Shimmer width="50%" height={11} radius={5} />
            </View>
          </GlassCard>
        ))}
      </View>

      <View style={styles.row}>
        {[0, 1, 2, 3].map((key) => (
          <View key={key} style={styles.badgeCard}>
            <Shimmer width={36} height={36} radius={18} />
            <View style={styles.gapSm}>
              <Shimmer width="80%" height={12} radius={6} />
            </View>
          </View>
        ))}
      </View>

      <View style={styles.gapLg}>
        <GlassCard intensity="card" style={styles.timelineCard}>
          {[0, 1, 2, 3].map((key) => (
            <View key={key} style={styles.timelineRow}>
              <Shimmer width={32} height={32} radius={16} />
              <View style={styles.timelineText}>
                <Shimmer width="50%" height={14} radius={6} />
              </View>
            </View>
          ))}
        </GlassCard>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  gapXs: {
    marginTop: 4,
  },
  gapSm: {
    marginTop: spacing.sm,
  },
  gapLg: {
    marginTop: spacing.md,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.mdSm,
    marginTop: spacing.mdSm,
  },
  primaryCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.base,
    padding: spacing.base,
  },
  primaryText: {
    flex: 1,
  },
  smallCard: {
    flexGrow: 1,
    flexBasis: "46%",
    minWidth: "46%",
    padding: spacing.base,
  },
  badgeCard: {
    flexGrow: 1,
    flexBasis: "46%",
    minWidth: "46%",
    padding: spacing.mdSm,
    borderRadius: 14,
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  timelineCard: {
    padding: spacing.base,
    gap: spacing.base,
  },
  timelineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.mdSm,
  },
  timelineText: {
    flex: 1,
  },
});
