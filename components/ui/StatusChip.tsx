import { StyleSheet, Text, View } from "react-native";

import { colors } from "@/lib/design-tokens";
import { fontFamily } from "@/lib/typography";

export type StatusChipKind =
  | "normal"
  | "attention"
  | "critical"
  | "approved"
  | "draft";

type StatusChipProps = {
  kind: StatusChipKind;
  label: string;
};

/**
 * Small status pill. Use a calm phrase — never a raw number as the headline.
 */
export function StatusChip({ kind, label }: StatusChipProps) {
  const palette = palettes[kind];
  return (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: palette.bg,
          borderWidth: palette.border ? 1 : 0,
          borderColor: palette.border ?? "transparent",
        },
      ]}
    >
      <Text style={[styles.text, { color: palette.text }]}>{label}</Text>
    </View>
  );
}

const palettes = {
  normal: { bg: colors.sageLight, text: colors.sage, border: undefined },
  attention: { bg: colors.amberLight, text: colors.amber, border: undefined },
  critical: { bg: colors.coralLight, text: colors.coral, border: undefined },
  approved: { bg: colors.deepTeal, text: colors.white, border: undefined },
  draft: { bg: "transparent", text: colors.slate, border: colors.border },
} as const;

const styles = StyleSheet.create({
  chip: {
    alignSelf: "flex-start",
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 20,
  },
  text: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 12,
  },
});
