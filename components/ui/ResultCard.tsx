import { Pressable, StyleSheet, Text, View } from "react-native";

import { StatusChip, type StatusChipKind } from "@/components/ui/StatusChip";
import { colors, radius, shadows, spacing } from "@/lib/design-tokens";
import { fontFamily } from "@/lib/typography";

type ResultCardProps = {
  plainName: string;
  meaning: string;
  medicalName: string;
  status: StatusChipKind;
  statusLabel: string;
  onPress?: () => void;
};

/**
 * Results list row. Chip first — never lead with a raw lab number.
 */
export function ResultCard({
  plainName,
  meaning,
  medicalName,
  status,
  statusLabel,
  onPress,
}: ResultCardProps) {
  const barColor =
    status === "critical"
      ? colors.coral
      : status === "attention"
        ? colors.amber
        : colors.sage;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={plainName}
      onPress={onPress}
      disabled={!onPress}
      style={styles.card}
    >
      <View style={[styles.bar, { backgroundColor: barColor }]} />
      <View style={styles.body}>
        <Text style={styles.name}>{plainName}</Text>
        <View style={styles.row2}>
          <StatusChip kind={status} label={statusLabel} />
          <Text style={styles.meaning}>{meaning}</Text>
        </View>
        <Text style={styles.medicalLabel}>
          Medical name: <Text style={styles.medical}>{medicalName}</Text>
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.radioCard,
    padding: spacing.base,
    paddingLeft: spacing.base + 4,
    flexDirection: "row",
    overflow: "hidden",
    ...shadows.card,
  },
  bar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  body: {
    flex: 1,
  },
  name: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 16,
    color: colors.charcoal,
  },
  row2: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  meaning: {
    flex: 1,
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.slate,
  },
  medicalLabel: {
    marginTop: 8,
    fontFamily: fontFamily.body,
    fontSize: 12,
    color: colors.mist,
  },
  medical: {
    fontFamily: fontFamily.medical,
    fontSize: 13,
    color: colors.slate,
  },
});
