import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { RadioGroup } from "@/components/ui/RadioGroup";
import { Colors, Radius, Size, Space, typeStyle } from "@/lib/theme";

type SymptomInterruptCardProps = {
  question: string;
  value?: string;
  onChange: (value: string) => void;
  error?: string;
};

/**
 * Mid-questionnaire safety gate look: a soft warm-red callout, not a red
 * panic screen. The wording and the Yes/No behaviour are fixed — only the
 * styling changes.
 */
export function SymptomInterruptCard({
  question,
  value,
  onChange,
  error,
}: SymptomInterruptCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.iconSquare}>
        <Feather name="alert-circle" size={20} color={Colors.red} />
      </View>
      <Text style={styles.title}>One important question</Text>
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
    backgroundColor: Colors.redTint,
    borderRadius: Radius.card,
    padding: Space.cardPad,
  },
  iconSquare: {
    width: Size.iconSquare,
    height: Size.iconSquare,
    borderRadius: 14,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    ...typeStyle("section"),
    marginTop: Space.md,
    color: Colors.ink,
  },
  body: {
    ...typeStyle("body"),
    marginTop: Space.sm,
    color: Colors.body,
  },
});
