import { Pressable, StyleSheet, Text, View } from "react-native";

import { DataValue } from "@/components/ui/DataValue";
import { GlassCard } from "@/components/ui/GlassCard";
import { StatusChip, type StatusChipKind } from "@/components/ui/StatusChip";
import { Colors, Radii, Spacing, Typography } from "@/lib/design-tokens";

type ResultCardProps = {
  plainName: string;
  meaning: string;
  medicalName: string;
  status: StatusChipKind;
  statusLabel: string;
  onPress?: () => void;
};

/**
 * Results list row — PRESCOPE v2.
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
      ? Colors.dangerRed
      : status === "attention"
        ? Colors.warningAmber
        : Colors.successGreen;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${plainName} — ${statusLabel}`}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => (pressed ? { opacity: 0.92 } : null)}
    >
      <GlassCard variant="onWhite" radius={Radii.card} padding={0}>
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
              color={Colors.orangeDark}
            />
          </View>
        </View>
      </GlassCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  inner: {
    paddingLeft: 24,
    paddingRight: Spacing.lg,
    paddingVertical: Spacing.base,
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
    gap: Spacing.sm,
  },
  name: {
    flex: 1,
    fontFamily: Typography.semibold,
    fontSize: Typography.bodyLarge,
    color: Colors.charcoal,
  },
  meaning: {
    marginTop: Spacing.sm,
    fontFamily: Typography.regular,
    fontSize: 16,
    lineHeight: 23,
    color: Colors.bodyText,
  },
  divider: {
    marginTop: Spacing.base,
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.borderLight,
  },
  bottomRow: {
    marginTop: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  clinicalLabel: {
    fontFamily: Typography.regular,
    fontSize: Typography.micro,
    color: Colors.mutedText,
  },
});
