import { StyleSheet, View, type DimensionValue } from "react-native";

import { Surface } from "@/components/ui/Surface";
import { colors, radius, spacing } from "@/lib/design-tokens";

type BlockProps = {
  width?: DimensionValue;
  height?: number;
  /** Pass `radius.pill` for the round placeholders (rings, badges). */
  round?: number;
};

/**
 * One placeholder block.
 *
 * This replaces `Shimmer`, which swept a white gradient across each block.
 * Moss has no gradients and no decorative motion, so a loading block is a
 * flat `hairline` rectangle that simply sits there until the data lands.
 */
function Block({ width = "100%", height = 12, round }: BlockProps) {
  return (
    <View
      style={[
        styles.block,
        { width, height, borderRadius: round ?? radius.control },
      ]}
    />
  );
}

/**
 * Ghost of the home screen — greeting, stat cards and timeline — shown while
 * the session and questionnaire progress resolve. Shapes track the real
 * layout so content does not jump when it arrives.
 */
export function HomeSkeleton() {
  return (
    <View accessibilityLabel="Loading your overview">
      <Block width={90} height={14} />
      <View style={styles.gapLg}>
        <Block width="62%" height={26} />
      </View>
      <View style={styles.gapSm}>
        <Block width="45%" height={14} />
      </View>

      <View style={styles.gapLg}>
        <Surface padded={false} style={styles.primaryCard}>
          <Block width={72} height={72} round={radius.pill} />
          <View style={styles.primaryText}>
            <Block width="55%" height={20} />
            <View style={styles.gapSm}>
              <Block width="75%" height={12} />
            </View>
          </View>
        </Surface>
      </View>

      <View style={styles.row}>
        {[0, 1].map((key) => (
          <Surface key={key} padded={false} style={styles.smallCard}>
            <Block width={36} height={36} round={radius.pill} />
            <View style={styles.gapSm}>
              <Block width="70%" height={14} />
            </View>
            <View style={styles.gapXs}>
              <Block width="50%" height={11} />
            </View>
          </Surface>
        ))}
      </View>

      <View style={styles.gapLg}>
        <Surface padded={false} style={styles.timelineCard}>
          {[0, 1, 2, 3].map((key) => (
            <View key={key} style={styles.timelineRow}>
              <Block width={32} height={32} round={radius.pill} />
              <View style={styles.timelineText}>
                <Block width="50%" height={14} />
              </View>
            </View>
          ))}
        </Surface>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: colors.hairline,
  },
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
