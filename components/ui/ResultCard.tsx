import { Pressable, StyleSheet, Text, View } from "react-native";

import { StatusChip } from "@/components/ui/StatusChip";
import { Surface } from "@/components/ui/Surface";
import {
  colors,
  radius,
  status as statusTones,
  type StatusKind,
} from "@/lib/design-tokens";
import { typography } from "@/lib/typography";

type ResultCardProps = {
  plainName: string;
  meaning: string;
  medicalName: string;
  status: StatusKind;
  statusLabel: string;
  onPress?: () => void;
};

/**
 * Results list row: a white card, a 4pt status rule down its left edge, and
 * the chip’s own word beside the name. The card itself stays white — tinting
 * the fill would make the status readable from colour alone.
 */
export function ResultCard({
  plainName,
  meaning,
  medicalName,
  status,
  statusLabel,
  onPress,
}: ResultCardProps) {
  const barColor = statusTones[status].text;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={plainName}
      onPress={onPress}
      disabled={!onPress}
    >
      <Surface style={styles.card}>
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
      </Surface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    // Room for the status rule, which sits on the card’s own left edge.
    paddingLeft: 24,
    overflow: "hidden",
  },
  bar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    zIndex: 2,
    borderTopLeftRadius: radius.surface,
    borderBottomLeftRadius: radius.surface,
  },
  body: {
    position: "relative",
    zIndex: 1,
  },
  name: {
    ...typography.title,
    color: colors.ink,
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
    ...typography.label,
    color: colors.inkSoft,
  },
  medicalLabel: {
    marginTop: 8,
    ...typography.label,
    color: colors.inkFaint,
  },
  medical: {
    ...typography.label,
    color: colors.inkSoft,
  },
});
