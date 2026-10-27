import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { RadioGroup } from "@/components/ui/RadioGroup";
import { colors, radius, spacing, status } from "@/lib/design-tokens";
import { fontFamily } from "@/lib/typography";

/** Failure and warning text borrows the clay of `worthDiscussing`. Moss has no red. */
const CLAY = status.worthDiscussing.text;

type SymptomInterruptCardProps = {
  question: string;
  value?: string;
  onChange: (value: string) => void;
  error?: string;
};

/**
 * Mid-questionnaire safety gate look: a clay callout, not a red panic screen.
 * The clay fill carries the weight — Moss puts no border on a card.
 */
export function SymptomInterruptCard({
  question,
  value,
  onChange,
  error,
}: SymptomInterruptCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Feather name="alert-triangle" size={20} color={CLAY} />
        <Text style={styles.title}>One important question</Text>
      </View>
      <Text style={styles.body}>{question}</Text>
      <RadioGroup
        label=""
        options={[
          { value: "no", label: "No, I haven't" },
          { value: "yes", label: "Yes, I have" },
        ]}
        value={value}
        onChange={onChange}
        error={error}
        allowClear={false}
        dangerValue="yes"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: status.worthDiscussing.fill,
    borderRadius: radius.surface,
    padding: spacing.base,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    flex: 1,
    fontFamily: fontFamily.bodySemi,
    fontSize: 17,
    color: CLAY,
  },
  body: {
    marginTop: 12,
    fontFamily: fontFamily.body,
    fontSize: 15,
    lineHeight: 24,
    color: colors.ink,
  },
});
