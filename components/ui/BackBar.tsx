import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@/components/specimen/Icon";
import * as Haptics from "expo-haptics";

import { Colors, Spacing, Typography, tapTarget } from "@/lib/design-tokens";

type BackBarProps = {
  onPress: () => void;
  /** Visible text next to the chevron. Default "Back". */
  label?: string;
  accessibilityLabel?: string;
};

/**
 * Lightweight back affordance for screens that are not fronted by a
 * GradientHero. Left-aligned chevron + label, full 44pt tap target.
 */
export function BackBar({
  onPress,
  label = "Back",
  accessibilityLabel,
}: BackBarProps) {
  const press = () => {
    if (Platform.OS !== "web") {
      void Haptics.selectionAsync().catch(() => {});
    }
    onPress();
  };

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        onPress={press}
        hitSlop={8}
        style={({ pressed }) => [styles.hit, pressed ? { opacity: 0.6 } : null]}
      >
        <Feather name="chevron-left" size={22} color={Colors.orangeDark} />
        <Text style={styles.label}>{label}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  hit: {
    minHeight: tapTarget,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingRight: Spacing.md,
  },
  label: {
    fontFamily: Typography.semibold,
    fontSize: Typography.body,
    color: Colors.orangeDark,
  },
});
