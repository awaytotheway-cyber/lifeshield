import { StyleSheet, Text, View } from "react-native";
import { Icon } from "@/components/specimen/Icon";

import { RadioGroup } from "@/components/ui/RadioGroup";
import { Accent, Edge, Ink, Measure, SpecimenType } from "@/lib/specimen-tokens";

type SymptomInterruptCardProps = {
  question: string;
  value?: string;
  onChange: (value: string) => void;
  error?: string;
};

/**
 * Mid-questionnaire safety gate: a tagged callout, not a red panic screen.
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
        <Icon name="alert-triangle" size={20} color={Accent.tag} />
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
    backgroundColor: Accent.tagWash,
    borderRadius: Edge.hair,
    borderLeftWidth: 2,
    borderLeftColor: Accent.tag,
    padding: Measure.base,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    flex: 1,
    fontFamily: SpecimenType.monoBold,
    fontSize: 19,
    color: Accent.tag,
  },
  body: {
    marginTop: 12,
    fontFamily: SpecimenType.mono,
    fontSize: 17,
    lineHeight: 26,
    color: Ink.full,
  },
});
