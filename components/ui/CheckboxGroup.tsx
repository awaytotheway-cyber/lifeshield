import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { colors, radius } from "@/lib/design-tokens";
import { fontFamily } from "@/lib/typography";

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
              style={[styles.card, selected ? styles.cardSelected : styles.cardIdle]}
            >
              <Text style={styles.optionLabel}>{option.label}</Text>
              {selected ? (
                <Feather name="check" size={20} color={colors.midTeal} />
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
    fontFamily: fontFamily.bodyMedium,
    fontSize: 12,
    letterSpacing: 0.2,
    color: colors.slate,
    marginBottom: 8,
  },
  list: {
    gap: 8,
  },
  card: {
    minHeight: 56,
    borderRadius: radius.radioCard,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardIdle: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  cardSelected: {
    backgroundColor: colors.lightTeal,
    borderWidth: 2,
    borderColor: colors.midTeal,
  },
  optionLabel: {
    flex: 1,
    fontFamily: fontFamily.bodyMedium,
    fontSize: 15,
    color: colors.charcoal,
    paddingRight: 12,
  },
  error: {
    marginTop: 8,
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.coral,
  },
});
