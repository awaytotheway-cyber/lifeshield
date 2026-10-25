import { StyleSheet, Text, View } from "react-native";

import { radius, status, type StatusKind } from "@/lib/design-tokens";
import { fontFamily } from "@/lib/typography";

type StatusChipProps = {
  kind: StatusKind;
  /**
   * Override the word. Omit it and the chip uses the status's own label, which
   * is the wording the three statuses are specified with.
   */
  label?: string;
};

/**
 * The clinical status chip: a pill, a fill, and always a word.
 *
 * Colour is never the only signal, so there is no icon-only or dot-only form
 * of this component — `label` can be reworded but not removed. The three
 * fills differ in lightness rather than hue (moss → sand → clay), so they
 * stay distinct in greyscale and for colour-blind readers.
 */
export function StatusChip({ kind, label }: StatusChipProps) {
  const tone = status[kind];

  return (
    <View style={[styles.chip, { backgroundColor: tone.fill }]}>
      <Text style={[styles.text, { color: tone.text }]}>
        {label ?? tone.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  text: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 12,
    lineHeight: 16,
  },
});
