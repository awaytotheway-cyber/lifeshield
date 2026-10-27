import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Surface } from "@/components/ui/Surface";
import { WhyAskButton } from "@/components/ui/WhyAskSheet";
import { COPY } from "@/lib/copy";
import { colors } from "@/lib/design-tokens";
import { typography } from "@/lib/typography";

type QuestionCardProps = {
  title: string;
  hint?: string;
  hintLabel?: string;
  children: ReactNode;
};

/**
 * A question that needs its own card: the question, the optional "why we ask"
 * icon beside it, and the control underneath.
 *
 * A white `Surface` and nothing else — no border, no shadow, no tint. The
 * explanation behind the icon is the clinical wording in full; the icon only
 * decides when it is on screen.
 */
export function QuestionCard({
  title,
  hint,
  hintLabel,
  children,
}: QuestionCardProps) {
  return (
    <Surface style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {hint ? (
          <WhyAskButton
            explanation={hint}
            accessibilityLabel={hintLabel ?? COPY.whyWeAsk}
          />
        ) : null}
      </View>
      {children}
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
  },
  title: {
    flex: 1,
    ...typography.title,
    color: colors.ink,
  },
});
