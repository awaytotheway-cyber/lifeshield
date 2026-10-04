import { useRef } from "react";
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import { Feather } from "@/components/specimen/Icon";
import * as Haptics from "expo-haptics";

import { Colors, Radii, Spacing, Typography } from "@/lib/design-tokens";

type ChoiceCardProps = {
  label: string;
  sublabel?: string;
  selected?: boolean;
  onPress: () => void;
  /** 'default' = full-width stacked; 'yes-no' = sized for horizontal row. */
  variant?: "default" | "yes-no";
  style?: ViewStyle;
};

/**
 * Full-width tappable option. Replaces radios + checkboxes everywhere.
 * Selected = orange tint + orange border + inline checkmark.
 */
export function ChoiceCard({
  label,
  sublabel,
  selected = false,
  onPress,
  variant = "default",
  style,
}: ChoiceCardProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const press = async () => {
    if (Platform.OS !== "web") {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {
        // non-fatal
      }
    }
    onPress();
  };

  return (
    <Animated.View style={{ transform: [{ scale }], flex: variant === "yes-no" ? 1 : undefined }}>
      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ selected }}
        accessibilityLabel={label}
        onPressIn={() =>
          Animated.timing(scale, {
            toValue: 0.98,
            duration: 90,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }).start()
        }
        onPressOut={() =>
          Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start()
        }
        onPress={press}
        style={[
          styles.card,
          selected ? styles.selected : styles.idle,
          style,
        ]}
      >
        <View style={{ flex: 1 }}>
          <Text style={[styles.label, selected && styles.labelSelected]}>
            {label}
          </Text>
          {sublabel ? (
            <Text style={styles.sublabel}>{sublabel}</Text>
          ) : null}
        </View>
        {selected ? (
          <Feather name="check" size={18} color={Colors.orangeDark} />
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 58,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radii.card,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  idle: {
    backgroundColor: Colors.pureWhite,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
  },
  selected: {
    backgroundColor: Colors.orangeTint,
    borderWidth: 2,
    borderColor: Colors.orangeDark,
  },
  label: {
    fontFamily: Typography.semibold,
    fontSize: Typography.bodyLarge,
    color: Colors.darkText,
  },
  labelSelected: {
    color: Colors.orangeDark,
  },
  sublabel: {
    marginTop: 2,
    fontFamily: Typography.regular,
    fontSize: Typography.secondary,
    color: Colors.bodyText,
  },
});
