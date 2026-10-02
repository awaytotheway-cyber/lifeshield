import { StyleSheet, Text, View } from "react-native";

import { PressScale } from "@/components/ui/PressScale";
import { Colors, Gap, Motion, Radius, Space, typeStyle } from "@/lib/theme";
import type { SwitchColor } from "@/lib/switch-colors";

type Option = { value: string; label: string };

type ChoiceToggleProps = {
  label: string;
  options: readonly Option[];
  value?: string;
  onChange: (value: string) => void;
  error?: string;
  /**
   * Kept for the screens that still pass it. The redesign uses one orange
   * accent everywhere, so the colour no longer changes per question.
   */
  color?: SwitchColor;
  /**
   * If true, tapping the already-selected option clears it.
   * Questionnaire Yes/No uses this so people can undo while editing.
   */
  allowClear?: boolean;
};

/**
 * Two (or a few) choices in one rounded segmented control — every option is a
 * real answer (Yes is not the same as “switch on”).
 *
 * PLAIN ENGLISH: a pill split into equal parts. The part you pick turns
 * orange; the rest stay quiet on the warm inset track.
 */
export function ChoiceToggle({
  label,
  options,
  value,
  onChange,
  error,
  allowClear = true,
}: ChoiceToggleProps) {
  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.track}>
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <PressScale
              key={option.value}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={option.label}
              onPress={() => {
                if (selected && allowClear) {
                  onChange("");
                  return;
                }
                onChange(option.value);
              }}
              scale={Motion.pressCard}
              haptic="light"
              style={[styles.segment, selected ? styles.segmentOn : null]}
            >
              <Text
                style={[styles.text, selected ? styles.textOn : null]}
                numberOfLines={1}
              >
                {option.label}
              </Text>
            </PressScale>
          );
        })}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: Space.lg,
  },
  label: {
    ...typeStyle("cardTitle"),
    color: Colors.ink,
    marginBottom: Gap.labelToField,
  },
  track: {
    flexDirection: "row",
    borderRadius: Radius.chip,
    backgroundColor: Colors.cloud,
    padding: 5,
  },
  segment: {
    flex: 1,
    minHeight: Space.xxl,
    borderRadius: Radius.chip,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Space.md,
  },
  segmentOn: {
    backgroundColor: Colors.orange,
  },
  text: {
    ...typeStyle("body"),
    color: Colors.body,
  },
  textOn: {
    color: Colors.white,
  },
  error: {
    ...typeStyle("secondary"),
    marginTop: Space.sm,
    color: Colors.red,
  },
});
