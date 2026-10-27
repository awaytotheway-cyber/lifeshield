import { StyleSheet, Text, View } from "react-native";

import { StatusChip as MossStatusChip } from "@/components/ui/StatusChip";
import { colors } from "@/lib/design-tokens";
import { mossStatusFromFlag, statusChipFromFlag } from "@/lib/result-status";
import { fontFamily } from "@/lib/typography";

type StatusChipProps = {
  /** The lab's own flag, straight off the row. */
  flag: string | null | undefined;
};

/**
 * A lab flag as its Moss status: one pill, one fill, and always the word.
 *
 * Both halves come from the flag through the same pair of functions, so the
 * word and the colour can never disagree about one result. The three fills
 * differ in lightness rather than hue — moss, sand, clay, never green to red
 * — so they stay distinct in greyscale and for colour-blind readers.
 *
 * A flag the app does not recognise gets no fill at all. "Saved — no flag
 * yet" is the absence of a clinical status, and the within-range moss would
 * read as a verdict nobody has given.
 */
export function StatusChip({ flag }: StatusChipProps) {
  const chip = statusChipFromFlag(flag);
  const kind = mossStatusFromFlag(flag);

  if (!kind) {
    return (
      <View style={styles.plain}>
        <Text style={styles.plainText}>{chip.label}</Text>
      </View>
    );
  }

  return <MossStatusChip kind={kind} label={chip.label} />;
}

const styles = StyleSheet.create({
  plain: {
    alignSelf: "flex-start",
  },
  plainText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 12,
    lineHeight: 16,
    color: colors.inkMuted,
  },
});
