import { StyleSheet, View, type DimensionValue } from "react-native";

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
 * Ghost of the home screen — date, greeting, the next-step card and the two
 * stat cards — shown while the session and questionnaire progress resolve.
 * Shapes track the real layout so content does not jump when it arrives.
 *
 * The next-step card is a flat `hairline` rectangle, not a gradient: a
 * skeleton paints no colour it has not loaded yet.
 */
export function HomeSkeleton() {
  return (
    <View accessibilityLabel="Loading your overview">
      {/* Micro-caps date. */}
      <Block width={140} height={11} />

      {/* Two-tone greeting — 46pt, so two tall lines. */}
      <View style={styles.gapGreeting}>
        <Block width="78%" height={34} />
      </View>
      <View style={styles.gapSm}>
        <Block width="46%" height={34} />
      </View>

      {/* The next-step card. */}
      <View style={styles.gapCard}>
        <Block height={186} round={radius.surface} />
      </View>

      {/* The two stat cards, side by side. */}
      <View style={styles.row}>
        {[0, 1].map((key) => (
          <View key={key} style={styles.statCard}>
            <Block width="62%" height={11} />
            <View style={styles.statValue}>
              <Block width="54%" height={28} />
              <View style={styles.gapXs}>
                <Block width="82%" height={11} />
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: colors.hairline,
  },
  gapXs: {
    marginTop: 5,
  },
  gapSm: {
    marginTop: spacing.sm,
  },
  gapGreeting: {
    marginTop: spacing.base,
  },
  gapCard: {
    marginTop: 22,
  },
  row: {
    flexDirection: "row",
    gap: spacing.mdSm,
    marginTop: 14,
  },
  // Matches the real stat card: white, one radius, no border and no shadow.
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.surface,
    paddingTop: 18,
    paddingHorizontal: 18,
    paddingBottom: 20,
    minHeight: 118,
    justifyContent: "space-between",
  },
  statValue: {
    width: "100%",
  },
});
