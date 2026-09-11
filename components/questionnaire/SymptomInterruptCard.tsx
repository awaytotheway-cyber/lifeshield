import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { RadioGroup } from "@/components/ui/RadioGroup";
import { colors, radius, spacing } from "@/lib/design-tokens";
import { fontFamily } from "@/lib/typography";

type SymptomInterruptCardProps = {
  question: string;
  value?: string;
  onChange: (value: string) => void;
  error?: string;
};

/**
 * Mid-questionnaire safety gate look: coral callout, not a red panic screen.
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
        <Feather name="alert-triangle" size={20} color={colors.coral} />
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
    backgroundColor: colors.coralLight,
    borderRadius: radius.alert,
    borderLeftWidth: 2,
    borderLeftColor: colors.coral,
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
    color: colors.coral,
  },
  body: {
    marginTop: 12,
    fontFamily: fontFamily.body,
    fontSize: 15,
    lineHeight: 24,
    color: colors.charcoal,
  },
});
