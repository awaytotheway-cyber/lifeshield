import { StyleSheet, Text, View, type ViewStyle } from "react-native";

import { Accent, Edge, Ink, Paper, Rule, SpecimenType, TRACK } from "@/lib/specimen-tokens";

/** v2 variant API. */
export type StatusChipVariant =
  | "success"
  | "warning"
  | "danger"
  | "orange"
  | "pending";

/** Legacy kind API — kept so existing screens keep rendering. */
export type StatusChipKind =
  | "normal"
  | "attention"
  | "critical"
  | "approved"
  | "draft";

type StatusChipProps = {
  label: string;
  /** v2 preferred. */
  variant?: StatusChipVariant;
  /** Legacy. */
  kind?: StatusChipKind;
  style?: ViewStyle;
};

/**
 * Small pill with a semantic colour. The 'orange' variant uses the
 * brand gradient and white text — reserved for 'Approved' / hero
 * highlights.
 */
export function StatusChip({ label, variant, kind, style }: StatusChipProps) {
  const resolved = resolveVariant(variant, kind);

  if (resolved === "orange") {
    // The stamped tag: ink block, paper lettering.
    return (
      <View
        style={[
          styles.chip,
          { backgroundColor: Ink.full, borderWidth: 0 },
          style,
        ]}
      >
        <Text style={[styles.text, { color: Paper.sheet }]}>
          {label.toUpperCase()}
        </Text>
      </View>
    );
  }

  const p = PALETTE[resolved];
  return (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: p.bg,
          borderWidth: p.border ? 1 : 0,
          borderColor: p.border ?? "transparent",
        },
        style,
      ]}
    >
      <View style={[styles.punch, { borderColor: p.text }]} />
      <Text style={[styles.text, { color: p.text }]}>{label.toUpperCase()}</Text>
    </View>
  );
}

function resolveVariant(
  variant?: StatusChipVariant,
  kind?: StatusChipKind,
): StatusChipVariant {
  if (variant) return variant;
  switch (kind) {
    case "normal":
      return "success";
    case "attention":
      return "warning";
    case "critical":
      return "danger";
    case "approved":
      return "orange";
    case "draft":
    default:
      return "pending";
  }
}

const PALETTE: Record<Exclude<StatusChipVariant, "orange">, {
  bg: string;
  text: string;
  border?: string;
}> = {
  success: { bg: Accent.sageWash, text: Accent.sage, border: "#CFD6C2" },
  warning: { bg: Accent.ochreWash, text: Accent.ochre, border: "#E2D2B4" },
  danger: { bg: Accent.tagWash, text: Accent.tag, border: "#E3C8C1" },
  pending: { bg: Paper.sheetDeep, text: Ink.soft, border: Ink.rule },
};

const styles = StyleSheet.create({
  chip: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingLeft: 7,
    paddingRight: 10,
    paddingVertical: 4,
    borderWidth: Rule.hair,
    borderRadius: Edge.tag,
  },
  punch: {
    width: 5,
    height: 5,
    borderRadius: 3,
    borderWidth: Rule.hair,
  },
  text: {
    fontFamily: SpecimenType.mono,
    fontSize: SpecimenType.catalogue,
    letterSpacing: TRACK.label,
  },
});
