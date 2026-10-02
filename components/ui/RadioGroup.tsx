import { StyleSheet, Text, View } from "react-native";

import { ChoiceCard } from "@/components/ui/ChoiceCard";
import { LabelRow } from "@/components/ui/WhyAskSheet";
import { Colors, Gap, Space, typeStyle } from "@/lib/theme";

type Option = { value: string; label: string; description?: string };

type RadioGroupProps = {
  label: string;
  options: readonly Option[];
  value?: string;
  /** Empty string means "cleared" (tap the same option again). */
  onChange: (value: string) => void;
  error?: string;
  /** Kept so older screens still compile; cards use the design-system colours. */
  color?: string;
  /** If false, tapping a selected option does not clear it (used on triage). */
  allowClear?: boolean;
  /** Optional "Why do we ask this?" sheet for intrusive questions. */
  whyAsk?: string;
  /** When this option is selected, use red styling (symptom Yes only). */
  dangerValue?: string;
};

/**
 * Single-choice question rendered as full-width ChoiceCards — never radio dots.
 * Tap the selected card again to unselect unless `allowClear` is false.
 */
export function RadioGroup({
  label,
  options,
  value,
  onChange,
  error,
  allowClear = true,
  whyAsk,
  dangerValue,
}: RadioGroupProps) {
  return (
    <View style={styles.wrap}>
      {label ? <LabelRow label={label} whyAsk={whyAsk} /> : null}
      <View style={styles.list}>
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <ChoiceCard
              key={option.value}
              label={option.label}
              description={option.description}
              selected={selected}
              danger={dangerValue === option.value}
              onPress={() => {
                onChange(selected && allowClear ? "" : option.value);
              }}
            />
          );
        })}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    // Section 8: 40px between question groups — lots of air.
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
