import { StyleSheet, Text } from "react-native";

import { Screen } from "@/components/ui/Screen";
import { colors, spacing } from "@/lib/design-tokens";
import { fontFamily } from "@/lib/typography";

/**
 * Placeholder so the Buddies tab resolves to a route. The real screens —
 * find a buddy, requests, and the shared view — land in a later task, which
 * replaces this file. Deliberately plain: no mock rows, no fake counts.
 */
export default function BuddiesIndexScreen() {
  return (
    <Screen contentPadding={spacing.screenX}>
      <Text style={styles.body}>Buddies is not built yet.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    fontFamily: fontFamily.body,
    fontSize: 16,
    lineHeight: 24,
    color: colors.inkSoft,
    textAlign: "center",
  },
});
