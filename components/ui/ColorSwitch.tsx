import { Pressable, Text, View } from "react-native";

import { SWITCH_PALETTE, type SwitchColor } from "@/lib/switch-colors";

type ColorSwitchProps = {
  label: string;
  value: boolean;
  onChange: (next: boolean) => void;
  /** primary = teal, secondary = sage, warning = coral, default = charcoal */
  color?: SwitchColor;
  accessibilityLabel?: string;
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
  const palette = SWITCH_PALETTE[color];

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={() => onChange(!value)}
      className="mt-6 flex-row items-center"
    >
      <View
        className="mr-3 h-8 w-14 justify-center rounded-full px-1"
        style={{
          backgroundColor: value ? palette.trackOn : palette.trackOff,
        }}
      >
        <View
          className="h-6 w-6 rounded-full"
          style={{
            backgroundColor: value ? palette.thumbOn : palette.thumbOff,
            alignSelf: value ? "flex-end" : "flex-start",
            elevation: 2,
            shadowColor: "#000",
            shadowOpacity: 0.2,
            shadowRadius: 2,
            shadowOffset: { width: 0, height: 1 },
          }}
        />
      </View>
      <Text className="flex-1 text-charcoal">{label}</Text>
    </Pressable>
  );
}
