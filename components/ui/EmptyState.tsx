import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { GlassCard } from "@/components/ui/GlassCard";
import { colors, spacing } from "@/lib/design-tokens";
import { fontFamily } from "@/lib/typography";

type EmptyStateProps = {
  icon?: keyof typeof Feather.glyphMap;
  heading: string;
  explanation: string;
  /** Optional drawing. When set, the Feather icon is not shown. */
  illustration?: ReactNode;
};

/** Designed empty state — never “No data found”. */
export function EmptyState({
  icon = "inbox",
  heading,
  explanation,
  illustration,
}: EmptyStateProps) {
  return (
    <GlassCard intensity="card" style={styles.wrap}>
      {illustration ?? (
        <Feather name={icon} size={32} color={colors.primaryBlue} />
      )}
      <Text style={styles.heading}>{heading}</Text>
      <Text style={styles.body}>{explanation}</Text>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: spacing.md,
    alignItems: "center",
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  heading: {
    marginTop: 16,
    fontFamily: fontFamily.display,
    fontSize: 26,
    lineHeight: 31,
    letterSpacing: -0.5,
    color: colors.primaryBlue,
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
