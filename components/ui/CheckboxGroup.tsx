import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { colors, radius, status } from "@/lib/design-tokens";
import { typography } from "@/lib/typography";

type Option = { value: string; label: string };

type CheckboxGroupProps = {
  label: string;
  options: readonly Option[];
  values: string[];
  onChange: (next: string[]) => void;
  error?: string;
  /** If set, choosing this value clears the others (used for “None”). */
  exclusiveValue?: string;
};

/** The one height every choice row shares. Comfortably past the 44pt floor. */
const ROW_HEIGHT = 52;

/** Clay, borrowed from `worthDiscussing` — Moss has no red for errors. */
const CLAY = status.worthDiscussing.text;

/**
 * Multi-select choice rows, built to the same rule as `RadioGroup`: the whole
 * row is the target, an unchosen row is bare, and a chosen one fills with
 * `mossTint` and carries a check.
 */
export function CheckboxGroup({
  label,
  options,
  values,
  onChange,
  error,
  exclusiveValue = "none",
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
      <Text style={styles.label}>{label}</Text>
      <View style={styles.list}>
        {options.map((option) => {
          const selected = values.includes(option.value);
          return (
            <Pressable
              key={option.value}
              accessibilityRole="checkbox"
              accessibilityLabel={option.label}
              accessibilityState={{ checked: selected }}
              onPress={() => toggle(option.value)}
              style={({ pressed }) => [
                styles.row,
                pressed && !selected ? styles.rowPressed : null,
                selected ? styles.rowSelected : null,
              ]}
            >
              <Text style={styles.optionLabel}>{option.label}</Text>
              {selected ? (
                <Feather name="check" size={20} color={colors.mossDeep} />
              ) : null}
            </Pressable>
          );
        })}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 16,
  },
  label: {
    ...typography.label,
    color: colors.inkSoft,
    marginBottom: 4,
  },
  list: {
    gap: 4,
  },
  row: {
    minHeight: ROW_HEIGHT,
    borderRadius: radius.control,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowPressed: {
    backgroundColor: colors.paper,
  },
  rowSelected: {
    backgroundColor: colors.mossTint,
  },
  optionLabel: {
    flex: 1,
    ...typography.body,
    color: colors.ink,
    paddingRight: 12,
  },
  error: {
    marginTop: 8,
    ...typography.label,
    color: CLAY,
  },
});
