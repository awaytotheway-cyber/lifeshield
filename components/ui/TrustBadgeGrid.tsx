import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { colors, spacing } from "@/lib/design-tokens";
import { fontFamily } from "@/lib/typography";

export type TrustBadge = {
  id: string;
  label: string;
  description: string;
  icon: keyof typeof Feather.glyphMap;
  /** Icon colour. The surrounding circle uses `tint`. */
  color: string;
  tint: string;
};

type TrustBadgeGridProps = {
  badges: TrustBadge[];
};

/**
 * Two-column trust grid for home / onboarding. Solid white cards rather than
 * glass so they read as reassurance rather than another data surface.
 */
export function TrustBadgeGrid({ badges }: TrustBadgeGridProps) {
  return (
    <View style={styles.grid}>
      {badges.map((badge) => (
        <View key={badge.id} style={styles.card}>
          <View style={[styles.iconCircle, { backgroundColor: badge.tint }]}>
            <Feather name={badge.icon} size={18} color={badge.color} />
          </View>
          <Text style={styles.label}>{badge.label}</Text>
          <Text style={styles.description}>{badge.description}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.mdSm,
  },
  card: {
    flexGrow: 1,
    flexBasis: "46%",
    minWidth: "46%",
    padding: spacing.mdSm,
    borderRadius: 14,
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  label: {
    fontFamily: fontFamily.displaySemi,
    fontSize: 13,
    lineHeight: 18,
    color: colors.deepNavy,
  },
  description: {
    marginTop: 2,
    fontFamily: fontFamily.body,
    fontSize: 11,
    lineHeight: 15,
    color: colors.slate,
  },
});
