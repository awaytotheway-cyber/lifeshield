import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { colors, spacing } from "@/lib/design-tokens";
import { fontFamily } from "@/lib/typography";

type EmptyStateProps = {
  icon?: keyof typeof Feather.glyphMap;
  heading: string;
  explanation: string;
};

/** Designed empty state — never “No data found”. */
export function EmptyState({
  icon = "inbox",
  heading,
  explanation,
}: EmptyStateProps) {
  return (
    <View style={styles.wrap}>
      <Feather name={icon} size={32} color={colors.deepTeal} />
      <Text style={styles.heading}>{heading}</Text>
      <Text style={styles.body}>{explanation}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: spacing.md,
    alignItems: "center",
    paddingHorizontal: spacing.base,
  },
  heading: {
    marginTop: 16,
    fontFamily: fontFamily.display,
    fontSize: 26,
    lineHeight: 31,
    letterSpacing: -0.5,
    color: colors.deepTeal,
    textAlign: "center",
  },
  body: {
    marginTop: 12,
    fontFamily: fontFamily.body,
    fontSize: 15,
    lineHeight: 24,
    color: colors.slate,
    textAlign: "center",
  },
});
