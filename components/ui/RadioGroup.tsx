import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { LabelRow } from "@/components/ui/WhyAskSheet";
import { colors, radius, status } from "@/lib/design-tokens";
import { typography } from "@/lib/typography";

type Option = { value: string; label: string; description?: string };

type RadioGroupProps = {
  label: string;
  options: readonly Option[];
  value?: string;
  /** Empty string means “cleared” (tap the same option again). */
  onChange: (value: string) => void;
  error?: string;
  /** Kept so older screens still compile; rows use the design-system colours. */
  color?: string;
  /** If false, tapping a selected option does not clear it (used on triage). */
  allowClear?: boolean;
  /** Optional “Why do we ask this?” sheet for intrusive questions. */
  whyAsk?: string;
  /** When this option is selected, use the clay styling (symptom Yes only). */
  dangerValue?: string;
};

/** The one height every choice row shares. Comfortably past the 44pt floor. */
const ROW_HEIGHT = 52;

/** Clay, borrowed from `worthDiscussing` — for errors and the symptom Yes. */
const CLAY = status.worthDiscussing.text;

/**
 * Full-width choice rows. The whole row is the target, not a dot beside it.
 *
 * An unselected row is bare — no border, no fill, just its words on the card
 * it sits on. Selecting one fills it with `mossTint` and adds a check, so the
 * answer reads from the fill and the mark, never from colour alone. Tap the
 * selected row again to clear it unless `allowClear` is false.
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
              style={({ pressed }) => [
                styles.row,
                pressed && !selected ? styles.rowPressed : null,
                selected ? styles.rowSelected : null,
                dangerSelected ? styles.rowDanger : null,
              ]}
            >
              <View style={styles.rowText}>
                <Text style={styles.optionLabel}>{option.label}</Text>
                {option.description ? (
                  <Text style={styles.optionDesc}>{option.description}</Text>
                ) : null}
              </View>
              {selected ? (
                <Feather
                  name="check"
                  size={20}
                  color={dangerSelected ? CLAY : colors.mossDeep}
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
  rowDanger: {
    backgroundColor: status.worthDiscussing.fill,
  },
  rowText: {
    flex: 1,
    paddingRight: 12,
  },
  optionLabel: {
    ...typography.body,
    color: colors.ink,
  },
  optionDesc: {
    marginTop: 2,
    ...typography.label,
    color: colors.inkSoft,
  },
  error: {
    marginTop: 8,
    ...typography.label,
    color: CLAY,
  },
});
