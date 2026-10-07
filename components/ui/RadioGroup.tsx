import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Icon } from "@/components/specimen/Icon";
import * as Haptics from "expo-haptics";

import { LabelRow } from "@/components/ui/WhyAskSheet";
import { Accent, Edge, Ink, Paper, SpecimenType } from "@/lib/specimen-tokens";

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
  /** When this option is selected, use tag styling (symptom Yes only). */
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
                if (Platform.OS !== "web") {
                  void Haptics.impactAsync(
                    Haptics.ImpactFeedbackStyle.Light,
                  ).catch(() => {});
                }
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
                <Icon
                  name="check"
                  size={18}
                  color={dangerSelected ? Accent.tag : Accent.tag}
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
    minHeight: 58,
    borderRadius: Edge.mount,
    paddingHorizontal: 20,
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
  cardDanger: {
    backgroundColor: Accent.tagWash,
    borderWidth: 2,
    borderColor: Accent.tag,
  },
  cardText: {
    flex: 1,
    paddingRight: 12,
  },
  optionLabel: {
    fontFamily: SpecimenType.monoBold,
    fontSize: 19,
    color: Ink.full,
  },
  optionDesc: {
    marginTop: 4,
    fontFamily: SpecimenType.mono,
    fontSize: 15,
    color: Ink.soft,
  },
  error: {
    marginTop: 8,
    fontFamily: SpecimenType.mono,
    fontSize: 15,
    color: Accent.tag,
  },
});
