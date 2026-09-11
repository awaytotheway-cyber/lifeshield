import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { WhyAskButton } from "@/components/ui/WhyAskSheet";
import { COPY } from "@/lib/copy";
import { colors, radius, shadows, spacing } from "@/lib/design-tokens";
import { fontFamily } from "@/lib/typography";

type QuestionCardProps = {
  title: string;
  hint?: string;
  hintLabel?: string;
  children: ReactNode;
};

export function QuestionCard({
  title,
  hint,
  hintLabel,
  children,
}: QuestionCardProps) {
  return (
    <View style={styles.card}>
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
  card: {
    marginTop: 16,
    backgroundColor: colors.white,
    borderRadius: radius.card,
    padding: spacing.base,
    ...shadows.card,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
  },
  title: {
    flex: 1,
    fontFamily: fontFamily.bodySemi,
    fontSize: 15,
    color: colors.charcoal,
  },
});
