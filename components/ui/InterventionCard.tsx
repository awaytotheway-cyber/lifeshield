import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { Card } from "@/components/ui/Card";
import { Chip, type ChipTone } from "@/components/ui/Chip";
import { PressScale } from "@/components/ui/PressScale";
import { COPY } from "@/lib/copy";
import { Colors, Radius, Size, Space, typeStyle } from "@/lib/theme";

/** Where a plan item sits with the practitioner. */
export type InterventionTone = "approved" | "pending" | "check";

/** Soft green for approved, amber for "ask a practitioner", quiet grey for drafts. */
const CHIP_TONES: Record<InterventionTone, ChipTone> = {
  approved: "green",
  pending: "neutral",
  check: "amber",
};

type InterventionCardProps = {
  title: string;
  why: string;
  clinicalBasis?: string;
  tone: InterventionTone;
  statusLabel: string;
  /** Supply both to show the orange pill — supplements only. */
  actionLabel?: string;
  onAction?: () => void;
  onPress?: () => void;
};

/**
 * Plan item card. Clinical wording stays collapsed until someone asks.
 *
 * PLAIN ENGLISH: a roomy white card — what the idea is, why it is here, and a
 * "Clinical basis" line that unfolds in place when tapped. The title area, the
 * unfold line and the orange pill are separate taps, never nested in each other.
 */
export function InterventionCard({
  title,
  why,
  clinicalBasis,
  tone,
  statusLabel,
  actionLabel,
  onAction,
  onPress,
}: InterventionCardProps) {
  const [open, setOpen] = useState(false);

  const summary = (
    <>
      <Chip label={statusLabel} tone={CHIP_TONES[tone]} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.whyLabel}>{COPY.planWhyLabel}</Text>
      <Text style={styles.why}>{why}</Text>
    </>
  );

  return (
    <Card>
      {onPress ? (
        <PressScale
          accessibilityRole="button"
          accessibilityLabel={title}
          onPress={onPress}
          haptic="light"
        >
          {summary}
        </PressScale>
      ) : (
        summary
      )}

      {clinicalBasis ? (
        <>
          <View style={styles.divider} />
          <PressScale
            accessibilityRole="button"
            accessibilityState={{ expanded: open }}
            accessibilityLabel={
              open ? COPY.planClinicalBasisHide : COPY.planClinicalBasis
            }
            onPress={() => setOpen((current) => !current)}
            haptic="light"
            style={styles.expandHit}
          >
            <Text style={styles.expandLabel}>
              {open ? COPY.planClinicalBasisHide : COPY.planClinicalBasis}
            </Text>
            <Feather
              name={open ? "chevron-up" : "chevron-down"}
              size={18}
              color={Colors.muted}
            />
          </PressScale>
          {open ? <Text style={styles.basis}>{clinicalBasis}</Text> : null}
        </>
      ) : null}

      {actionLabel && onAction ? (
        <View style={styles.actionRow}>
          <PressScale
            accessibilityRole="button"
            accessibilityLabel={`${actionLabel}: ${title}`}
            onPress={onAction}
            haptic="medium"
            style={styles.pill}
          >
            <Text style={styles.pillLabel}>{actionLabel}</Text>
          </PressScale>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  title: {
    ...typeStyle("cardTitle"),
    marginTop: Space.sm,
    color: Colors.ink,
  },
  whyLabel: {
    ...typeStyle("caption"),
    marginTop: Space.md,
    color: Colors.muted,
  },
  why: {
    ...typeStyle("body"),
    marginTop: Space.xs,
    color: Colors.body,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.line,
    marginTop: Space.md,
  },
  expandHit: {
    minHeight: Size.tap,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Space.sm,
  },
  expandLabel: {
    flex: 1,
    ...typeStyle("secondary"),
    color: Colors.body,
  },
  basis: {
    ...typeStyle("secondary"),
    marginBottom: Space.xs,
    color: Colors.muted,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: Space.md,
  },
  pill: {
    minHeight: Size.tap,
    justifyContent: "center",
    paddingHorizontal: Space.lg,
    borderRadius: Radius.chip,
    backgroundColor: Colors.orange,
  },
  pillLabel: {
    ...typeStyle("label"),
    color: Colors.white,
  },
});
