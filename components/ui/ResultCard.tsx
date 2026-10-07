import { Pressable, StyleSheet, Text, View } from "react-native";

import { DataValue } from "@/components/ui/DataValue";
import { Sheet } from "@/components/specimen/Sheet";
import { StatusChip, type StatusChipKind } from "@/components/ui/StatusChip";
import { Accent, Edge, Ink, Measure, SpecimenType } from "@/lib/specimen-tokens";

type ResultCardProps = {
  plainName: string;
  meaning: string;
  medicalName: string;
  status: StatusChipKind;
  statusLabel: string;
  onPress?: () => void;
};

/**
 * Results list row.
 *
 * The 4px full-height coloured left edge is the fastest visual scan
 * signal: the reader clocks status before reading a single word.
 */
export function ResultCard({
  plainName,
  meaning,
  medicalName,
  status,
  statusLabel,
  onPress,
}: ResultCardProps) {
  const edgeColor =
    status === "critical"
      ? Accent.tag
      : status === "attention"
        ? Accent.ochre
        : Accent.sage;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${plainName} — ${statusLabel}`}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => (pressed ? { opacity: 0.92 } : null)}
    >
      <Sheet radius={Edge.mount} padding={0}>
        <View style={styles.inner}>
          <View style={[styles.edge, { backgroundColor: edgeColor }]} />

          <View style={styles.topRow}>
            <Text style={styles.name}>{plainName}</Text>
            <StatusChip kind={status} label={statusLabel} />
          </View>

          <Text style={styles.meaning} numberOfLines={2}>
            {meaning}
          </Text>

          <View style={styles.divider} />

          <View style={styles.bottomRow}>
            <Text style={styles.clinicalLabel}>Clinical name</Text>
            <DataValue
              value={medicalName}
              size="small"
              color={Accent.tag}
            />
          </View>
        </View>
      </Sheet>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  inner: {
    paddingLeft: 24,
    paddingRight: Measure.wide,
    paddingVertical: Measure.base,
  },
  edge: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Measure.tight,
  },
  name: {
    flex: 1,
    fontFamily: SpecimenType.semibold,
    fontSize: SpecimenType.bodyLarge,
    color: Ink.full,
  },
  meaning: {
    marginTop: Measure.tight,
    fontFamily: SpecimenType.regular,
    fontSize: 16,
    lineHeight: 23,
    color: Ink.soft,
  },
  divider: {
    marginTop: Measure.base,
    height: StyleSheet.hairlineWidth,
    backgroundColor: Ink.rule,
  },
  bottomRow: {
    marginTop: Measure.snug,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Measure.tight,
  },
  clinicalLabel: {
    fontFamily: SpecimenType.regular,
    fontSize: SpecimenType.micro,
    color: Ink.faint,
  },
});
