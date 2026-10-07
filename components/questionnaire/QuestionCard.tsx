import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { WhyAskButton } from "@/components/ui/WhyAskSheet";
import { COPY } from "@/lib/copy";
import { Ink, Measure, SpecimenType } from "@/lib/specimen-tokens";

type QuestionCardProps = {
  title: string;
  hint?: string;
  hintLabel?: string;
  children: ReactNode;
};

/**
 * A question group.
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
    gap: Measure.tight,
  },
  title: {
    flex: 1,
    fontFamily: SpecimenType.semibold,
    fontSize: SpecimenType.bodyLarge,
    lineHeight: 24,
    color: Ink.full,
  },
  input: {
    marginTop: Measure.snug,
  },
});
