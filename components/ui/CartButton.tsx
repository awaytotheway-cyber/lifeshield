import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { PressScale } from "@/components/ui/PressScale";
import { COPY } from "@/lib/copy";
import { colors, radius, tapTarget } from "@/lib/design-tokens";
import { typography } from "@/lib/typography";

type CartButtonProps = {
  count: number;
  onPress: () => void;
};

/**
 * Cart affordance for a screen header.
 *
 * The cart belongs at the top: it is a persistent destination, not the
 * primary action of the store screen, and a full-width button at the bottom
 * competed with "Add" on every product row.
 */
export function CartButton({ count, onPress }: CartButtonProps) {
  const label =
    count > 0
      ? COPY.storeViewCartWithCount.replace("{count}", String(count))
      : COPY.storeViewCart;

  return (
    <PressScale
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={styles.hit}
    >
      <Feather name="shopping-bag" size={24} color={colors.primaryBlue} />
      {count > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText} numberOfLines={1}>
            {count > 99 ? "99+" : count}
          </Text>
        </View>
      ) : null}
    </PressScale>
  );
}

const styles = StyleSheet.create({
  hit: {
    width: tapTarget,
    height: tapTarget,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: 4,
    right: 2,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: radius.chip,
    backgroundColor: colors.riskHigh,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    ...typography.micro,
    fontSize: 10,
    lineHeight: 13,
    color: colors.white,
  },
});
