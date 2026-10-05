import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { PressScale } from "@/components/ui/PressScale";
import { colors, radius, shadows, spacing, tapTarget } from "@/lib/design-tokens";
import { fontFamily } from "@/lib/typography";

export type QuickAction = {
  id: string;
  label: string;
  icon: keyof typeof Feather.glyphMap;
  onPress: () => void;
};

type QuickActionGridProps = {
  actions: QuickAction[];
};

/**
 * Two-column grid of navigation cards: a tinted icon circle above a short
 * label, per the dashboard template.
 *
 * Use this instead of stacking text links. A column of identically weighted
 * links gives the eye nothing to land on and reads as a sitemap; icon cards
 * are scannable and give each destination a distinct shape.
 */
export function QuickActionGrid({ actions }: QuickActionGridProps) {
  if (actions.length === 0) {
    return null;
  }

  return (
    <View style={styles.grid}>
      {actions.map((action) => (
        <PressScale
          key={action.id}
          accessibilityRole="button"
          accessibilityLabel={action.label}
          onPress={action.onPress}
          style={styles.card}
        >
          <View style={styles.iconCircle}>
            <Feather name={action.icon} size={22} color={colors.primaryBlue} />
          </View>
          <Text style={styles.label} numberOfLines={2}>
            {action.label}
          </Text>
        </PressScale>
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
    // Two per row once the 12px gap is accounted for.
    width: "48%",
    flexGrow: 1,
    minWidth: "46%",
    minHeight: tapTarget * 2,
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.base,
    gap: spacing.mdSm,
    ...shadows.card,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: radius.chip,
    alignItems: "center",
    justifyContent: "center",
    // A 10% primaryBlue tint, written out because NativeWind opacity
    // modifiers are not used anywhere in this project.
    backgroundColor: colors.lightTeal,
  },
  label: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 14,
    lineHeight: 19,
    color: colors.deepNavy,
  },
});
