import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { StatusChip } from "@/components/ui/StatusChip";
import { Surface } from "@/components/ui/Surface";
import { colors, spacing, type StatusKind } from "@/lib/design-tokens";
import { typography } from "@/lib/typography";

const CATEGORY_ICONS = {
  supplement: "droplet",
  diet: "coffee",
  lifestyle: "sun",
  therapy: "activity",
  referral: "user-check",
  coaching: "message-circle",
  retest: "refresh-cw",
} as const;

type InterventionCardProps = {
  title: string;
  why: string;
  clinicalBasis?: string;
  category?: keyof typeof CATEGORY_ICONS;
  status: StatusKind;
  statusLabel: string;
  onPress?: () => void;
};

/**
 * Plan item card. Clinical wording stays collapsed until someone asks.
 */
export function InterventionCard({
  title,
  why,
  clinicalBasis,
  category = "lifestyle",
  status,
  statusLabel,
  onPress,
}: InterventionCardProps) {
  const [open, setOpen] = useState(false);
  const icon = CATEGORY_ICONS[category];

  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={title}
      onPress={onPress}
      disabled={!onPress}
    >
      <Surface style={styles.card}>
      <View style={styles.top}>
        <Feather name={icon} size={20} color={colors.ink} />
        <View style={styles.topText}>
          <Text style={styles.title}>{title}</Text>
          <StatusChip kind={status} label={statusLabel} />
        </View>
      </View>
      <Text style={styles.whyLabel}>Why you're seeing this:</Text>
      <Text style={styles.why}>{why}</Text>
      {clinicalBasis ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clinical basis"
          onPress={() => setOpen((current) => !current)}
          style={styles.expand}
        >
          <Text style={styles.expandLabel}>Clinical basis ›</Text>
        </Pressable>
      ) : null}
      {open && clinicalBasis ? (
        <Text style={styles.basis}>{clinicalBasis}</Text>
      ) : null}
      </Surface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.mdSm,
  },
  top: {
    flexDirection: "row",
    gap: 12,
  },
  topText: {
    flex: 1,
    gap: 8,
  },
  title: {
    ...typography.title,
    color: colors.ink,
  },
  // An 11px eyebrow cannot carry inkFaint (3.47:1 on white). The spec asks
  // for 11px uppercase inkFaint micro labels generally; at that size it fails
  // AA, so this one takes inkSoft.
  whyLabel: {
    marginTop: 12,
    ...typography.micro,
    color: colors.inkSoft,
  },
  why: {
    marginTop: 4,
    ...typography.body,
    color: colors.inkSoft,
  },
  expand: {
    marginTop: 8,
    minHeight: 44,
    justifyContent: "center",
  },
  // Tertiary action: an underlined link, not a tinted one.
  expandLabel: {
    ...typography.body,
    color: colors.ink,
    textDecorationLine: "underline",
  },
  basis: {
    ...typography.label,
    color: colors.inkSoft,
  },
});
