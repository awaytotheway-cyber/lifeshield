import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { WhyAskButton } from "@/components/ui/WhyAskSheet";
import { COPY } from "@/lib/copy";
import { Colors, Spacing, Typography } from "@/lib/design-tokens";

type QuestionCardProps = {
  title: string;
  hint?: string;
  hintLabel?: string;
  children: ReactNode;
};

/**
 * A question group — PRESCOPE v2.
 *
 * Deliberately not a card. Questions read as editorial groups: 17px
 * semibold prompt, an inline "why we ask" info icon (a trust feature),
 * a 12px gap, then the input. 28px separates groups.
 */
export function QuestionCard({
  title,
  hint,
  hintLabel,
  children,
}: QuestionCardProps) {
  return (
    <View style={styles.group}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {hint ? (
          <WhyAskButton
            explanation={hint}
            accessibilityLabel={hintLabel ?? COPY.whyWeAsk}
          />
        ) : null}
      </View>
      <View style={styles.input}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    marginBottom: 28,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  title: {
    flex: 1,
    fontFamily: Typography.semibold,
    fontSize: Typography.bodyLarge,
    lineHeight: 24,
    color: Colors.charcoal,
  },
  input: {
    marginTop: Spacing.md,
  },
});
