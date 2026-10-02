import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { PressScale } from "@/components/ui/PressScale";
import { Colors, Motion, Size, Space, typeStyle } from "@/lib/theme";

type ChoiceCardProps = {
  label: string;
  /** Optional one-line explanation under the label. */
  description?: string;
  selected: boolean;
  onPress: () => void;
  /** "checkbox" announces a multi-select option to screen readers. */
  multi?: boolean;
  /** Use the red/soft-red treatment when selected (symptom "Yes" answers only). */
  danger?: boolean;
  disabled?: boolean;
};

/**
 * The only way questionnaire options are shown — never radio dots.
 *
 * PLAIN ENGLISH: a full-width tappable card. Unselected it is white with a
 * thin warm border; selected it turns soft orange with an orange tick.
 */
export function ChoiceCard({
  label,
  description,
  selected,
  onPress,
  multi = false,
  danger = false,
  disabled = false,
}: ChoiceCardProps) {
  const dangerSelected = selected && danger;

  return (
    <PressScale
      accessibilityRole={multi ? "checkbox" : "radio"}
      accessibilityLabel={label}
      accessibilityState={multi ? { checked: selected } : { selected }}
      onPress={onPress}
      disabled={disabled}
      scale={Motion.pressCard}
      haptic="light"
      style={[
        styles.card,
        selected ? styles.selected : styles.idle,
        dangerSelected ? styles.danger : null,
        disabled ? styles.disabled : null,
      ]}
    >
      <View style={styles.text}>
        <Text style={styles.label}>{label}</Text>
        {description ? (
          <Text style={styles.description}>{description}</Text>
        ) : null}
      </View>
      {selected ? (
        <Feather
          name="check"
          size={22}
          color={dangerSelected ? Colors.red : Colors.orange}
        />
      ) : null}
    </PressScale>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: Size.choiceCard,
    borderRadius: 20,
    paddingHorizontal: Space.md + 2,
    paddingVertical: Space.md - 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  idle: {
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.line,
  },
  selected: {
    backgroundColor: Colors.orangeTint,
    borderWidth: 2,
    borderColor: Colors.orange,
  },
  danger: {
    backgroundColor: Colors.redTint,
    borderWidth: 2,
    borderColor: Colors.red,
  },
  disabled: {
    opacity: 0.55,
  },
  text: {
    flex: 1,
    paddingRight: Space.sm,
  },
  label: {
    ...typeStyle("body"),
    color: Colors.ink,
  },
  description: {
    ...typeStyle("secondary"),
    marginTop: 4,
    color: Colors.muted,
  },
});
