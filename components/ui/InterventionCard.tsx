import { useState } from "react";
import {
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  UIManager,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";

import { GlassCard } from "@/components/ui/GlassCard";
import { StatusChip, type StatusChipKind } from "@/components/ui/StatusChip";
import { Colors, Radii, Spacing, Typography } from "@/lib/design-tokens";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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
  onPress?: () => void;
  /** Flagged items render on the tint surface instead of white glass. */
  flagged?: boolean;
};

/**
 * Plan item card — PRESCOPE v2.
 *
 * "Clinical basis" expands inline with LayoutAnimation rather than
 * pushing a new screen; keeping the reader in place is what makes the
 * plan feel considered rather than bureaucratic.
 */
export function InterventionCard({
  title,
  why,
  clinicalBasis,
  category = "lifestyle",
  status,
  statusLabel,
  onPress,
  flagged = false,
}: InterventionCardProps) {
  const [open, setOpen] = useState(false);
  const icon = CATEGORY_ICONS[category];

  const toggle = () => {
    // LayoutAnimation must be configured BEFORE the state change.
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((current) => !current);
  };

  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={title}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => (pressed && onPress ? { opacity: 0.92 } : null)}
    >
      <GlassCard
        variant={flagged ? "tint" : "onWhite"}
        radius={Radii.card}
        padding={Spacing.card}
      >
        <View style={styles.top}>
          <Feather name={icon} size={20} color={Colors.orangeDark} />
          <View style={styles.topText}>
            <Text style={styles.title}>{title}</Text>
            <StatusChip kind={status} label={statusLabel} />
          </View>
        </View>

        <Text style={styles.whyLabel}>WHY YOU'RE SEEING THIS</Text>
        <Text style={styles.why} numberOfLines={open ? undefined : 2}>
          {why}
        </Text>

        {clinicalBasis ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clinical basis"
            accessibilityState={{ expanded: open }}
            onPress={toggle}
            style={styles.expand}
          >
            <Feather
              name={open ? "chevron-down" : "chevron-right"}
              size={14}
              color={Colors.orangeDark}
            />
            <Text style={styles.expandLabel}>Clinical basis</Text>
          </Pressable>
        ) : null}

        {open && clinicalBasis ? (
          <Text style={styles.basis}>{clinicalBasis}</Text>
        ) : null}
      </GlassCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  top: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  topText: {
    flex: 1,
    gap: Spacing.sm,
    alignItems: "flex-start",
  },
  title: {
    fontFamily: Typography.semibold,
    fontSize: Typography.bodyLarge,
    lineHeight: 23,
    color: Colors.charcoal,
  },
  whyLabel: {
    marginTop: Spacing.md,
    fontFamily: Typography.medium,
    fontSize: Typography.micro,
    letterSpacing: 0.6,
    color: Colors.mutedText,
  },
  why: {
    marginTop: Spacing.xs,
    fontFamily: Typography.regular,
    fontSize: 14,
    lineHeight: 22,
    color: Colors.bodyText,
  },
  expand: {
    marginTop: Spacing.md,
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  expandLabel: {
    fontFamily: Typography.semibold,
    fontSize: 14,
    color: Colors.orangeDark,
  },
  basis: {
    fontFamily: Typography.regular,
    fontSize: Typography.secondary,
    lineHeight: 21,
    color: Colors.bodyText,
  },
});
