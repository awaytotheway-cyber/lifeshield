import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { WhyAskButton } from "@/components/ui/WhyAskSheet";
import { COPY } from "@/lib/copy";
import { Colors, Gap, typeStyle } from "@/lib/theme";

type QuestionCardProps = {
  title: string;
  hint?: string;
  hintLabel?: string;
  children: ReactNode;
};

/**
 * One question group inside a questionnaire section: the question in 17px
 * semibold, an optional “why we ask” info button, then the answer control.
 *
 * PLAIN ENGLISH: this is not a white box any more. The redesign keeps
 * questionnaire pages flat and airy — 40px of space separates each group, so
 * the question text and its answers read as one block without a border.
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
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    // Section 8: 40px between question groups.
    marginTop: Gap.sections,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
  },
  title: {
    flex: 1,
    ...typeStyle("cardTitle"),
    color: Colors.ink,
  },
});
