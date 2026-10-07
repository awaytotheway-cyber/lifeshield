import { StyleSheet, Text, View } from "react-native";
import { Accent, Edge, Ink, Measure, SpecimenType } from "@/lib/specimen-tokens";

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
    backgroundColor: Accent.ochreWash,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: {
    fontFamily: SpecimenType.mono,
    fontSize: 14,
    color: Accent.ochre,
  },
  callout: {
    marginTop: Measure.tight,
    backgroundColor: Accent.ochreWash,
    borderRadius: Edge.hair,
    padding: Measure.snug,
  },
  calloutText: {
    fontFamily: SpecimenType.mono,
    fontSize: 15,
    lineHeight: 22,
    color: Ink.full,
  },
});
