import { StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing } from "@/lib/design-tokens";
import { typography } from "@/lib/typography";

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
 *
 * The label is deepNavy on a tinted fill, and the status colour is carried by
 * the dot rather than the text. The vivid system Green/Yellow/Red are fill
 * colours: as text on their own tint they measure 2.02:1, 1.42:1 and 2.97:1,
 * all far below AA, while deepNavy on those tints is 13-15:1. The dot is
 * non-text, where 3:1 is the bar, so the colour cue survives intact.
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
      {palette.dot ? (
        <View style={[styles.dot, { backgroundColor: palette.dot }]} />
      ) : null}
      <Text style={[styles.text, { color: palette.text }]}>{label}</Text>
    </View>
  );
}

const palettes = {
  normal: {
    bg: colors.riskLowLight,
    text: colors.heading,
    dot: colors.riskLow,
    border: undefined,
  },
  attention: {
    bg: colors.riskModerateLight,
    text: colors.heading,
    dot: colors.riskModerate,
    border: undefined,
  },
  critical: {
    bg: colors.riskHighLight,
    text: colors.heading,
    dot: colors.riskHigh,
    border: undefined,
  },
  // Solid brand fill already clears AA at 5.50:1, so no dot is needed.
  approved: {
    bg: colors.primaryBlue,
    text: colors.white,
    dot: undefined,
    border: undefined,
  },
  draft: {
    bg: "transparent",
    text: colors.slate,
    dot: undefined,
    border: colors.border,
  },
} as const;

const styles = StyleSheet.create({
  chip: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.micro + 2,
    minWidth: 72,
    paddingHorizontal: spacing.mdSm,
    paddingVertical: spacing.micro,
    borderRadius: radius.chip,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radius.chip,
  },
  text: {
    ...typography.chip,
    // Sentence case: chips only go ALL CAPS for one or two words, and these
    // labels are phrases ("Worth watching").
    textTransform: "none",
  },
});
