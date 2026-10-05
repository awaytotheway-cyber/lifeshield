import { Pressable, Text, View } from "react-native";

import { BodyText, ErrorText } from "@/components/ui/Typography";
import { SWITCH_PALETTE, type SwitchColor } from "@/lib/switch-colors";
import { typography } from "@/lib/typography";

type Option = { value: string; label: string };

type ChoiceToggleProps = {
  label: string;
  options: readonly Option[];
  value?: string;
  onChange: (value: string) => void;
  error?: string;
  color?: SwitchColor;
  /**
   * If true, tapping the already-selected option clears it.
   * Questionnaire Yes/No uses this so people can undo while editing.
   */
  allowClear?: boolean;
};

/**
 * Two (or a few) choices in one pill — like a coloured switch, but every
 * option is a real answer (Yes is not the same as “switch on”).
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
  const palette = SWITCH_PALETTE[color];

  return (
    <View className="mt-4">
      <BodyText>{label}</BodyText>
      <View
        className="mt-3 flex-row rounded-full p-1"
        style={{ backgroundColor: palette.trackOff }}
      >
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => {
                if (selected && allowClear) {
                  onChange("");
                  return;
                }
                onChange(option.value);
              }}
              className="flex-1 items-center rounded-full px-4 py-3"
              style={{
                backgroundColor: selected
                  ? palette.selectedFill
                  : palette.idleFill,
              }}
            >
              <Text
                style={{
                  ...typography.body,
                  color: selected ? palette.selectedText : palette.idleText,
                }}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {error ? <ErrorText className="mt-1">{error}</ErrorText> : null}
    </View>
  );
}
