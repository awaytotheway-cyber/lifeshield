import { StyleSheet, Text, View } from "react-native";

import { Chip } from "@/components/ui/Chip";
import { Colors, Radius, Space, typeStyle } from "@/lib/theme";

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
      <Chip label="Needs practitioner check" tone="amber" />
      {!compact && reason ? (
        <View style={styles.callout}>
          <Text style={styles.calloutText}>{reason}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  callout: {
    marginTop: Space.sm,
    backgroundColor: Colors.amberTint,
    borderRadius: Radius.input,
    padding: Space.md,
  },
  calloutText: {
    ...typeStyle("secondary"),
    color: Colors.body,
  },
});
