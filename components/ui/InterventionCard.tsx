import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { StatusChip, type StatusChipKind } from "@/components/ui/StatusChip";
import { colors, radius, shadows, spacing } from "@/lib/design-tokens";
import { fontFamily } from "@/lib/typography";

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
  status: Extract<StatusChipKind, "approved" | "draft" | "critical">;
  statusLabel: string;
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
}: InterventionCardProps) {
  const [open, setOpen] = useState(false);
  const icon = CATEGORY_ICONS[category];

  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <Feather name={icon} size={20} color={colors.deepTeal} />
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
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.radioCard,
    padding: spacing.base,
    ...shadows.card,
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
    fontFamily: fontFamily.bodySemi,
    fontSize: 16,
    color: colors.charcoal,
  },
  whyLabel: {
    marginTop: 12,
    fontFamily: fontFamily.bodyMedium,
    fontSize: 12,
    color: colors.slate,
  },
  why: {
    marginTop: 4,
    fontFamily: fontFamily.body,
    fontSize: 15,
    lineHeight: 24,
    color: colors.charcoal,
  },
  expand: {
    marginTop: 8,
    minHeight: 44,
    justifyContent: "center",
  },
  expandLabel: {
    fontFamily: fontFamily.body,
    fontSize: 15,
    color: colors.midTeal,
  },
  basis: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    lineHeight: 20,
    color: colors.slate,
  },
});
