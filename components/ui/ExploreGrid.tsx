import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { PressScale } from "@/components/ui/PressScale";
import { colors, spacing, tapTarget } from "@/lib/design-tokens";
import { fontFamily } from "@/lib/typography";

export type ExploreItem = {
  id: string;
  label: string;
  icon: keyof typeof Feather.glyphMap;
  onPress: () => void;
};

type ExploreGridProps = {
  items: ExploreItem[];
};

/**
 * Two-column grid of outlined secondary destinations. Replaces the stack of
 * bare text links under the primary call to action.
 */
export function ExploreGrid({ items }: ExploreGridProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <View style={styles.grid}>
      {items.map((item) => (
        <PressScale
          key={item.id}
          accessibilityRole="button"
          accessibilityLabel={item.label}
          onPress={item.onPress}
          style={({ pressed }) => [styles.card, pressed ? styles.cardPressed : null]}
        >
          <Feather name={item.icon} size={18} color={colors.primaryBlue} />
          <Text style={styles.label} numberOfLines={2}>
            {item.label}
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
    flexGrow: 1,
    flexBasis: "46%",
    minWidth: "46%",
    minHeight: tapTarget,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.mdSm,
    paddingHorizontal: spacing.base,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  cardPressed: {
    backgroundColor: colors.iceBlue,
  },
  label: {
    flex: 1,
    fontFamily: fontFamily.bodyMedium,
    fontSize: 13,
    lineHeight: 18,
    color: colors.primaryBlue,
  },
});
