import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { LabelRow } from "@/components/ui/WhyAskSheet";
import { colors, radius } from "@/lib/design-tokens";
import { fontFamily } from "@/lib/typography";

type Option = { value: string; label: string; description?: string };

type RadioGroupProps = {
  label: string;
  options: readonly Option[];
  value?: string;
  /** Empty string means “cleared” (tap the same option again). */
  onChange: (value: string) => void;
  error?: string;
  /** Kept so older screens still compile; cards use the design-system colours. */
  color?: string;
  /** If false, tapping a selected option does not clear it (used on triage). */
  allowClear?: boolean;
  /** Optional “Why do we ask this?” sheet for intrusive questions. */
  whyAsk?: string;
  /** When this option is selected, use coral styling (symptom Yes only). */
  dangerValue?: string;
};

/**
 * Full-width choice cards (not tiny dots). Tap again to unselect unless allowClear is false.
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
          const dangerSelected = selected && dangerValue === option.value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityLabel={option.label}
              accessibilityState={{ selected }}
              onPress={() => {
                onChange(selected && allowClear ? "" : option.value);
              }}
              style={[
                styles.card,
                selected ? styles.cardSelected : styles.cardIdle,
                dangerSelected ? styles.cardDanger : null,
              ]}
            >
              <View style={styles.cardText}>
                <Text style={styles.optionLabel}>{option.label}</Text>
                {option.description ? (
                  <Text style={styles.optionDesc}>{option.description}</Text>
                ) : null}
              </View>
              {selected ? (
                <Feather
                  name="check"
                  size={20}
                  color={dangerSelected ? colors.coral : colors.midTeal}
                />
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
  cardDanger: {
    backgroundColor: colors.coralLight,
    borderWidth: 2,
    borderColor: colors.coral,
  },
  cardText: {
    flex: 1,
    paddingRight: 12,
  },
  optionLabel: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 15,
    color: colors.inkOnLight,
  },
  optionDesc: {
    marginTop: 4,
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.inkOnLightMuted,
  },
  error: {
    marginTop: 8,
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.coral,
  },
});
