import { StyleSheet, Text, View } from "react-native";

import { colors, hairline, spacing } from "@/lib/design-tokens";
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
 * SwimClub status chip — sharp corners, 1px black outline, uppercase
 * mono label. "critical" flips fill to tabloid orange (the one accent).
 * Kind is preserved for callsite compatibility; the visual is intentionally
 * monochrome so status reads like a stamped label, not decoration.
 */
export function StatusChip({ kind, label }: StatusChipProps) {
  const palette = palettes[kind];
  return (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
        },
      ]}
    >
      <Text style={[styles.text, { color: palette.text }]}>
        {label.toUpperCase()}
      </Text>
    </View>
  );
}

const palettes: Record<
  StatusChipKind,
  { bg: string; text: string; border: string }
> = {
  normal: {
    bg: colors.paperWhite,
    text: colors.inkBlack,
    border: colors.inkBlack,
  },
  attention: {
    bg: colors.paperWhite,
    text: colors.inkBlack,
    border: colors.inkBlack,
  },
  critical: {
    bg: colors.tabloidOrange,
    text: colors.inkBlack,
    border: colors.inkBlack,
  },
  approved: {
    bg: colors.inkBlack,
    text: colors.paperWhite,
    border: colors.inkBlack,
  },
  draft: {
    bg: colors.paperWhite,
    text: colors.ironGray,
    border: colors.ash,
  },
};

const styles = StyleSheet.create({
  chip: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.micro,
    borderRadius: 0,
    borderWidth: hairline,
  },
  text: {
    fontFamily: fontFamily.mono,
    fontSize: 11,
    letterSpacing: 0.6,
  },
});
