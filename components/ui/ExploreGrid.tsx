import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { PressScale } from "@/components/ui/PressScale";
import { colors, radius, spacing, tapTarget } from "@/lib/design-tokens";
import { typography } from "@/lib/typography";

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
 * Two-column grid of secondary destinations. Each cell takes the secondary
 * button treatment — a 1px ink outline on nothing — because that is what
 * every non-primary action in the system looks like.
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
          <Feather name={item.icon} size={18} color={colors.ink} />
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
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.ink,
    backgroundColor: "transparent",
  },
  cardPressed: {
    backgroundColor: colors.paper,
  },
  label: {
    flex: 1,
    ...typography.label,
    color: colors.ink,
  },
});
