import { StyleSheet, Text, View } from "react-native";

import { ChoiceCard } from "@/components/ui/ChoiceCard";
import { LabelRow } from "@/components/ui/WhyAskSheet";
import { Colors, Gap, Space, typeStyle } from "@/lib/theme";

type Option = { value: string; label: string };

type CheckboxGroupProps = {
  label: string;
  options: readonly Option[];
  values: string[];
  onChange: (next: string[]) => void;
  error?: string;
  /** If set, choosing this value clears the others (used for "None"). */
  exclusiveValue?: string;
  /** Optional "Why do we ask this?" sheet. */
  whyAsk?: string;
};

/** Multi-choice question rendered as full-width ChoiceCards — never checkboxes. */
export function CheckboxGroup({
  label,
  options,
  values,
  onChange,
  error,
  exclusiveValue = "none",
  whyAsk,
}: CheckboxGroupProps) {
  const toggle = (optionValue: string) => {
    const selected = values.includes(optionValue);
    if (optionValue === exclusiveValue) {
      onChange(selected ? [] : [exclusiveValue]);
      return;
    }
    const withoutExclusive = values.filter((item) => item !== exclusiveValue);
    if (selected) {
      onChange(withoutExclusive.filter((item) => item !== optionValue));
      return;
    }
    onChange([...withoutExclusive, optionValue]);
  };

  return (
    <View style={styles.wrap}>
      <LabelRow label={label} whyAsk={whyAsk} />
      <View style={styles.list}>
        {options.map((option) => (
          <ChoiceCard
            key={option.value}
            label={option.label}
            selected={values.includes(option.value)}
            multi
            onPress={() => toggle(option.value)}
          />
        ))}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: Gap.sections,
  },
  list: {
    gap: Space.sm,
  },
  error: {
    ...typeStyle("secondary"),
    marginTop: Space.sm,
    color: Colors.red,
  },
});
