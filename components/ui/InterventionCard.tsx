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
import { Icon } from "@/components/specimen/Icon";

import { Sheet } from "@/components/specimen/Sheet";
import { StatusChip, type StatusChipKind } from "@/components/ui/StatusChip";
import { Accent, Edge, Ink, Measure, SpecimenType } from "@/lib/specimen-tokens";

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
  /** Flagged items render on the tint surface instead of a plain mount. */
  flagged?: boolean;
};

/**
 * Plan item card.
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
      <Sheet
        variant={flagged ? "tint" : "mount"}
        radius={Edge.mount}
        padding={Measure.base}
      >
        <View style={styles.top}>
          <Icon name={icon} size={20} color={Accent.tag} />
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
            <Icon
              name={open ? "chevron-down" : "chevron-right"}
              size={14}
              color={Accent.tag}
            />
            <Text style={styles.expandLabel}>Clinical basis</Text>
          </Pressable>
        ) : null}

        {open && clinicalBasis ? (
          <Text style={styles.basis}>{clinicalBasis}</Text>
        ) : null}
      </Sheet>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  top: {
    flexDirection: "row",
    gap: Measure.snug,
  },
  topText: {
    flex: 1,
    gap: Measure.tight,
    alignItems: "flex-start",
  },
  title: {
    fontFamily: SpecimenType.semibold,
    fontSize: SpecimenType.bodyLarge,
    lineHeight: 23,
    color: Ink.full,
  },
  whyLabel: {
    marginTop: Measure.snug,
    fontFamily: SpecimenType.medium,
    fontSize: SpecimenType.micro,
    letterSpacing: 0.6,
    color: Ink.faint,
  },
  why: {
    marginTop: Measure.hair,
    fontFamily: SpecimenType.regular,
    fontSize: 16,
    lineHeight: 24,
    color: Ink.soft,
  },
  expand: {
    marginTop: Measure.snug,
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  expandLabel: {
    fontFamily: SpecimenType.semibold,
    fontSize: 16,
    color: Accent.tag,
  },
  basis: {
    fontFamily: SpecimenType.regular,
    fontSize: SpecimenType.secondary,
    lineHeight: 21,
    color: Ink.soft,
  },
});
