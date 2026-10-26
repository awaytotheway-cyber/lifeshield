import { StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing, status } from "@/lib/design-tokens";
import { fontFamily } from "@/lib/typography";

/**
 * Sand, borrowed from `worthWatching`. Moss has no amber and no alert red:
 * a caution carries the middle of the three clinical statuses.
 */
const SAND = status.worthWatching;

type InteractionFlagProps = {
  reason?: string;
  compact?: boolean;
};

/**
 * Amber “needs a practitioner check” flag for supplements.
 */
export function InteractionFlag({
  reason,
  compact = false,
}: InteractionFlagProps) {
  return (
    <View>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>Needs practitioner check</Text>
      </View>
      {!compact && reason ? (
        <View style={styles.callout}>
          <Text style={styles.calloutText}>{reason}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    backgroundColor: SAND.fill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  badgeText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 12,
    color: SAND.text,
  },
  callout: {
    marginTop: spacing.sm,
    backgroundColor: SAND.fill,
    borderRadius: radius.surface,
    padding: spacing.mdSm,
  },
  calloutText: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    lineHeight: 20,
    color: colors.ink,
  },
});
