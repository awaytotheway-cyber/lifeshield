import { StyleSheet, Text, View } from "react-native";

import { PressScale } from "@/components/ui/PressScale";
import { Colors, Motion, Radius, Space, typeStyle } from "@/lib/theme";

export type ChipTone = "neutral" | "orange" | "green" | "amber" | "red";

type ChipProps = {
  label: string;
  tone?: ChipTone;
  /** Filter chips: when true, uses the solid orange "on" look. */
  selected?: boolean;
  /** Supply to make the chip tappable (filter rows). */
  onPress?: () => void;
};

const TONES: Record<ChipTone, { bg: string; text: string; border: string }> = {
  neutral: { bg: Colors.cloud, text: Colors.body, border: Colors.line },
  orange: { bg: Colors.orangeTint, text: Colors.orangeDeep, border: Colors.orangeTintDeep },
  green: { bg: Colors.greenTint, text: Colors.green, border: Colors.greenTint },
  amber: { bg: Colors.amberTint, text: Colors.amber, border: Colors.amberTint },
  red: { bg: Colors.redTint, text: Colors.red, border: Colors.redTint },
};

/**
 * Fully round status / filter pill.
 *
 * PLAIN ENGLISH: a small rounded label. Use `tone` for status colour, or
 * `selected` + `onPress` for a tappable filter chip.
 */
export function Chip({ label, tone = "neutral", selected = false, onPress }: ChipProps) {
  const palette = TONES[tone];
  const body = (
    <Text
      style={[
        styles.text,
        { color: selected ? Colors.white : palette.text },
      ]}
      numberOfLines={1}
    >
      {label}
    </Text>
  );

  const shape = [
    styles.chip,
    {
      backgroundColor: selected ? Colors.orange : palette.bg,
      borderColor: selected ? Colors.orange : palette.border,
    },
  ];

  if (onPress) {
    return (
      <PressScale
        accessibilityRole="button"
        accessibilityState={{ selected }}
        accessibilityLabel={label}
        onPress={onPress}
        scale={Motion.pressCard}
        haptic="light"
        style={shape}
      >
        {body}
      </PressScale>
    );
  }

  return <View style={shape}>{body}</View>;
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: "flex-start",
    borderRadius: Radius.chip,
    borderWidth: 1,
    paddingHorizontal: Space.sm + 1,
    paddingVertical: 7,
  },
  text: {
    ...typeStyle("label"),
  },
});
