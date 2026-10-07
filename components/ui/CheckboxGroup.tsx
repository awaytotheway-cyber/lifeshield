import { Pressable, StyleSheet, Text, View } from "react-native";
import { Icon } from "@/components/specimen/Icon";
import { Accent, Edge, Ink, Paper, SpecimenType } from "@/lib/specimen-tokens";

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
                <Icon name="check" size={20} color={Accent.tag} />
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
    fontFamily: SpecimenType.mono,
    fontSize: 14,
    letterSpacing: 0.2,
    color: Ink.soft,
    marginBottom: 8,
  },
  list: {
    gap: 8,
  },
  card: {
    minHeight: 56,
    borderRadius: Edge.mount,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardIdle: {
    backgroundColor: Paper.mount,
    borderWidth: 1.5,
    borderColor: Ink.rule,
  },
  cardSelected: {
    backgroundColor: Accent.tagWash,
    borderWidth: 2,
    borderColor: Accent.tag,
  },
  optionLabel: {
    flex: 1,
    fontFamily: SpecimenType.mono,
    fontSize: 17,
    color: Ink.full,
    paddingRight: 12,
  },
  error: {
    marginTop: 8,
    fontFamily: SpecimenType.mono,
    fontSize: 15,
    color: Accent.tag,
  },
});
