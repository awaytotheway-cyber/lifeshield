import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { colors, radius, spacing, status } from "@/lib/design-tokens";
import { fontFamily } from "@/lib/typography";

/**
 * Sand, borrowed from `worthWatching`. Moss has no amber and no alert red:
 * a caution carries the middle of the three clinical statuses.
 */
const SAND = status.worthWatching;

type IodineHardStopProps = {
  reason?: string;
};

/**
 * Shown when iodine is not recommended. Calm amber, not a crash or scare.
 */
export function IodineHardStop({
  reason = "Because your thyroid antibodies are positive, iodine supplementation could cause a flare-up. Your plan has been adjusted to keep you safe.",
}: IodineHardStopProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Feather name="alert-triangle" size={20} color={SAND.text} />
        <Text style={styles.title}>This isn't recommended for you right now</Text>
      </View>
      <Text style={styles.body}>{reason}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: SAND.fill,
    borderRadius: radius.surface,
    padding: spacing.base,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  title: {
    flex: 1,
    fontFamily: fontFamily.bodySemi,
    fontSize: 17,
    color: colors.ink,
  },
  body: {
    marginTop: 8,
    fontFamily: fontFamily.body,
    fontSize: 15,
    lineHeight: 24,
    color: colors.inkSoft,
  },
});
