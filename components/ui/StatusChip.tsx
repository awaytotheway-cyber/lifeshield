import { StyleSheet, Text, View, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { Colors, Radii, Typography } from "@/lib/design-tokens";

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
    return (
      <View style={[styles.chip, styles.gradientWrap, style]}>
        <LinearGradient
          colors={[Colors.orangeDark, Colors.orangeBright]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFillObject}
        />
        <Text style={[styles.text, { color: Colors.pureWhite }]}>{label}</Text>
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
      <Text style={[styles.text, { color: p.text }]}>{label}</Text>
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
  success: { bg: Colors.successTint, text: Colors.successGreen },
  warning: { bg: Colors.warningTint, text: Colors.warningAmber },
  danger: { bg: Colors.dangerTint, text: Colors.dangerRed },
  pending: {
    bg: "#F5F5F5",
    text: Colors.mutedText,
    border: Colors.borderLight,
  },
};

const styles = StyleSheet.create({
  chip: {
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Radii.chip,
  },
  gradientWrap: {
    overflow: "hidden",
  },
  text: {
    fontFamily: Typography.medium,
    fontSize: Typography.label,
  },
});
