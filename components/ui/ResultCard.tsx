import { StyleSheet, Text, View } from "react-native";

import { Card } from "@/components/ui/Card";
import { StatusChip, type StatusChipKind } from "@/components/ui/StatusChip";
import { Colors, Space, typeStyle } from "@/lib/theme";

type ResultCardProps = {
  plainName: string;
  meaning: string;
  medicalName: string;
  status: StatusChipKind;
  statusLabel: string;
  /** The clinical number plus unit. Shown under the divider in the data font. */
  value?: string;
  /** The lab's usual range, as a quiet caption under the value. */
  referenceRange?: string;
  onPress?: () => void;
};

/**
 * One result, the calm way round: everyday name and a status chip first, a
 * plain "what this means" line next, then the clinical number below a divider.
 *
 * PLAIN ENGLISH: a white card with a thin coloured stripe down its left edge —
 * green when a result is within range, amber when it is worth watching, red
 * only for something that genuinely needs attention.
 */
export function ResultCard({
  plainName,
  meaning,
  medicalName,
  status,
  statusLabel,
  value,
  referenceRange,
  onPress,
}: ResultCardProps) {
  const barColor = BAR_COLOURS[status];

  return (
    <Card
      padded={false}
      onPress={onPress}
      accessibilityLabel={plainName}
      style={styles.card}
    >
      <View
        pointerEvents="none"
        style={[styles.bar, { backgroundColor: barColor }]}
      />
      <View style={styles.body}>
        {/* Status leads, so a raw number is never the headline. */}
        <StatusChip kind={status} label={statusLabel} />
        <Text style={styles.name}>{plainName}</Text>
        <Text style={styles.meaning}>{meaning}</Text>
        <View style={styles.divider} />
        {value ? <Text style={styles.value}>{value}</Text> : null}
        {referenceRange ? (
          <Text style={styles.range}>{referenceRange}</Text>
        ) : null}
        <Text style={styles.medicalLabel}>
          Medical name: <Text style={styles.medical}>{medicalName}</Text>
        </Text>
      </View>
    </Card>
  );
}

/** Red is reserved for genuine high risk. Orange marks a reviewed suggestion. */
const BAR_COLOURS: Record<StatusChipKind, string> = {
  normal: Colors.green,
  attention: Colors.amber,
  critical: Colors.red,
  approved: Colors.orange,
  draft: Colors.faint,
};

/** The left edge stripe, per Section 8 of the redesign brief. */
const BAR_WIDTH = 4;

const styles = StyleSheet.create({
  card: {
    overflow: "hidden",
  },
  bar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: BAR_WIDTH,
  },
  body: {
    // 24px of padding everywhere, measured from the stripe rather than the edge.
    paddingVertical: Space.cardPad,
    paddingRight: Space.cardPad,
    paddingLeft: Space.cardPad + BAR_WIDTH,
  },
  name: {
    ...typeStyle("cardTitle"),
    marginTop: Space.sm,
    color: Colors.ink,
  },
  meaning: {
    ...typeStyle("body"),
    marginTop: Space.sm,
    color: Colors.body,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.line,
    marginVertical: Space.md,
  },
  value: {
    ...typeStyle("dataBig"),
    color: Colors.ink,
  },
  range: {
    ...typeStyle("caption"),
    marginTop: Space.xs,
    color: Colors.muted,
  },
  medicalLabel: {
    ...typeStyle("caption"),
    marginTop: Space.sm,
    color: Colors.muted,
  },
  medical: {
    ...typeStyle("label"),
    color: Colors.body,
  },
});
