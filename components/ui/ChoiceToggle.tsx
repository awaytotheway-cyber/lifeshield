import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radius, status } from "@/lib/design-tokens";
import { fontFamily, typography } from "@/lib/typography";
import type { SwitchColor } from "@/lib/switch-colors";

type Option = { value: string; label: string };

type ChoiceToggleProps = {
  label: string;
  options: readonly Option[];
  value?: string;
  onChange: (value: string) => void;
  error?: string;
  /**
   * Kept so older screens still compile. Only `"warning"` changes anything:
   * it tints the chosen segment clay instead of moss, for the symptom
   * questions where "Yes" is the answer that routes someone to a clinician.
   */
  color?: SwitchColor;
  /**
   * If true, tapping the already-selected option clears it.
   * Questionnaire Yes/No uses this so people can undo while editing.
   */
  allowClear?: boolean;
};

/** The one height every choice row shares. Comfortably past the 44pt floor. */
const ROW_HEIGHT = 52;

/** Clay, borrowed from `worthDiscussing` — Moss has no red. */
const CLAY = status.worthDiscussing.text;

/**
 * Two (or a few) choices side by side — like a switch, but every option is a
 * real answer (Yes is not the same as “switch on”).
 *
 * Built to the same rule as the other choice controls: each segment is a
 * 52pt target at `radius.control`, bare until chosen and filled with
 * `mossTint` once it is. There is no track behind the segments and no pill
 * sliding between them.
 */
export function ChoiceToggle({
  label,
  options,
  value,
  onChange,
  error,
  color = "primary",
  allowClear = true,
}: ChoiceToggleProps) {
  const isWarning = color === "warning";

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityLabel={option.label}
              accessibilityState={{ selected }}
              onPress={() => {
                if (selected && allowClear) {
                  onChange("");
                  return;
                }
                onChange(option.value);
              }}
              style={({ pressed }) => [
                styles.segment,
                pressed && !selected ? styles.segmentPressed : null,
                selected
                  ? isWarning
                    ? styles.segmentWarning
                    : styles.segmentSelected
                  : null,
              ]}
            >
              <Text
                style={[
                  styles.segmentLabel,
                  selected ? styles.segmentLabelSelected : null,
                  selected && isWarning ? styles.segmentLabelWarning : null,
                ]}
              >
                {option.label}
              </Text>
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
  row: {
    flexDirection: "row",
    gap: 4,
  },
  segment: {
    flex: 1,
    minHeight: ROW_HEIGHT,
    borderRadius: radius.control,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  segmentPressed: {
    backgroundColor: colors.paper,
  },
  segmentSelected: {
    backgroundColor: colors.mossTint,
  },
  segmentWarning: {
    backgroundColor: status.worthDiscussing.fill,
  },
  segmentLabel: {
    ...typography.body,
    color: colors.inkSoft,
  },
  // The chosen segment carries weight as well as fill, so the answer is not
  // told by colour alone.
  segmentLabelSelected: {
    fontFamily: fontFamily.bodySemi,
    color: colors.ink,
  },
  segmentLabelWarning: {
    color: CLAY,
  },
  error: {
    marginTop: 8,
    ...typography.label,
    color: CLAY,
  },
});
