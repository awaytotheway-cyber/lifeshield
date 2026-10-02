import { StyleSheet, Text, View } from "react-native";

import { PressScale } from "@/components/ui/PressScale";
import type { SwitchColor } from "@/lib/switch-colors";
import { Colors, Font, Gap, Radius, Size, Space } from "@/lib/theme";

type ColorSwitchProps = {
  label: string;
  value: boolean;
  onChange: (next: boolean) => void;
  /** primary / secondary = orange, warning = red, default = ink */
  color?: SwitchColor;
  accessibilityLabel?: string;
};

/**
 * Accent colour for the "on" track. The redesign keeps switches orange so an
 * enabled preference reads as the one accent on the screen; `warning` stays red
 * for genuine attention questions.
 */
const TRACK_ON: Record<SwitchColor, string> = {
  primary: Colors.orange,
  secondary: Colors.orange,
  warning: Colors.red,
  default: Colors.ink,
};

/**
 * On/off switch that looks the same on phone and web.
 * Use this for a single yes/off choice (for example “I agree”).
 * For Yes vs No questions, use ChoiceToggle instead so “No” is not just “off”.
 */
export function ColorSwitch({
  label,
  value,
  onChange,
  color = "primary",
  accessibilityLabel,
}: ColorSwitchProps) {
  const trackOn = TRACK_ON[color];

  return (
    <PressScale
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={() => onChange(!value)}
      haptic="light"
      style={styles.row}
    >
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.track,
          { backgroundColor: value ? trackOn : Colors.line },
        ]}
      >
        <View
          style={[
            styles.thumb,
            {
              backgroundColor: value ? Colors.white : Colors.faint,
              alignSelf: value ? "flex-end" : "flex-start",
            },
          ]}
        />
      </View>
    </PressScale>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.md,
    // Section 10: list rows get 18px of vertical padding.
    paddingVertical: Gap.rowY,
    minHeight: Size.tap,
  },
  label: {
    flex: 1,
    fontFamily: Font.medium,
    fontSize: 16,
    lineHeight: 22,
    color: Colors.ink,
  },
  track: {
    width: 56,
    height: 32,
    borderRadius: Radius.chip,
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  thumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
});
