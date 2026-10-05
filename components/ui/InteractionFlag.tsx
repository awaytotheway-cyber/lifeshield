import { StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing } from "@/lib/design-tokens";
import { fontFamily } from "@/lib/typography";
import { COPY } from "@/lib/copy";

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
        <Text style={styles.badgeText}>{COPY.interactionFlagBadge}</Text>
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
    backgroundColor: colors.riskModerateLight,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 12,
    color: colors.riskModerateText,
  },
  callout: {
    marginTop: spacing.sm,
    backgroundColor: colors.riskModerateLight,
    borderRadius: radius.alert,
    padding: spacing.mdSm,
  },
  calloutText: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    lineHeight: 20,
    color: colors.charcoal,
  },
});
