import { Pressable, StyleSheet, Text, View } from "react-native";

import { StatusChip } from "@/components/ui/StatusChip";
import { colors, type StatusKind } from "@/lib/design-tokens";
import { fontFamily } from "@/lib/typography";

type ResultCardProps = {
  /** The everyday name. The clinical term belongs on the detail screen. */
  plainName: string;
  /** One grey line: why this is on the list, or what the reading means. */
  meaning: string;
  /**
   * The clinical status, or `null` when the row has none — an unflagged
   * result is not "within range", so it is given its word without a chip
   * rather than a fill that would claim something nobody has said.
   */
  status: StatusKind | null;
  statusLabel: string;
  onPress?: () => void;
  /** False on the last row of a card: the rule sits between rows only. */
  divider?: boolean;
};

/**
 * The list row — the workhorse of the UI kit. Plain name in bold, reason in
 * grey, status on the right.
 *
 * The clinical term is deliberately absent. On a list a reader is scanning
 * for the one thing they recognise, and "Thyroid function (TSH, Free T3,
 * Free T4) + antibodies (TPOAb, TgAb)" under every name buries it; the exact
 * term waits on the detail screen, where there is room to read it.
 *
 * The row draws no card of its own. Rows share one white `Surface`, which is
 * why the only separation between them is a hairline rule — a card per row
 * would turn a list of three into three objects.
 */
export function ResultCard({
  plainName,
  meaning,
  status,
  statusLabel,
  onPress,
  divider = false,
}: ResultCardProps) {
  // Read as one sentence rather than as three unrelated labels.
  const spoken = `${plainName}. ${meaning}. ${statusLabel}`;

  const body = (
    <>
      <View style={styles.text}>
        <Text style={styles.name}>{plainName}</Text>
        <Text style={styles.reason}>{meaning}</Text>
      </View>
      {/*
        The chip sets `alignSelf: flex-start` for the places it leads a block,
        so it needs a slot of its own to sit centred against the row.
      */}
      <View style={styles.statusSlot}>
        {status ? (
          <StatusChip kind={status} label={statusLabel} />
        ) : (
          <Text style={styles.unflagged}>{statusLabel}</Text>
        )}
      </View>
    </>
  );

  if (!onPress) {
    return (
      <View
        style={[styles.row, divider ? styles.divided : null]}
        accessible
        accessibilityLabel={spoken}
      >
        {body}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={spoken}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        divider ? styles.divided : null,
        pressed ? styles.pressed : null,
      ]}
    >
      {body}
    </Pressable>
  );
}

/**
 * The row's own height. Well past the 44pt floor, which is what lets the
 * whole row — not just the name — be the target.
 */
const ROW_HEIGHT = 80;

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    minHeight: ROW_HEIGHT,
    // The card's own 20pt inset; the row runs the full width inside it.
    paddingVertical: 12,
  },
  divided: {
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  // A press tints the row with the paper ground. Moss does not bounce.
  pressed: {
    backgroundColor: colors.paper,
  },
  text: {
    flex: 1,
    // Without this the name's own width wins and pushes the chip off the row.
    minWidth: 0,
  },
  name: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 16,
    lineHeight: 21,
    color: colors.ink,
  },
  reason: {
    marginTop: 3,
    fontFamily: fontFamily.body,
    fontSize: 13,
    lineHeight: 19,
    color: colors.inkSoft,
  },
  // Keeps its own width (the name column is the one that gives way) and
  // centres whatever word the row ends in.
  statusSlot: {
    justifyContent: "center",
  },
  // No fill and no pill: this is the absence of a status, not a fourth one.
  unflagged: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 12,
    lineHeight: 16,
    color: colors.inkMuted,
  },
});
