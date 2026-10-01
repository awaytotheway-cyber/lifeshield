import { useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  type ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

import {
  Colors,
  Radii,
  Shadows,
  Typography,
  primaryButtonHeight,
} from "@/lib/design-tokens";

type PrimaryButtonProps = {
  label: string;
  onPress: () => void | Promise<void>;
  disabled?: boolean;
  loading?: boolean;
  /** Default 'full'. */
  size?: "full" | "auto";
  style?: ViewStyle;
  accessibilityLabel?: string;
};

/**
 * The orange-gradient primary button. 58px tall, orange-tinted shadow,
 * medium haptic on press. Never a flat colour — the gradient is the
 * brand signature.
 */
export function PrimaryButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  size = "full",
  style,
  accessibilityLabel,
}: PrimaryButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const press = async () => {
    if (disabled || loading) return;
    if (Platform.OS !== "web") {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {
        // Haptics unavailable (simulator, old devices) — not fatal.
      }
    }
    await onPress();
  };

  const isDisabled = disabled || loading;

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        accessibilityLabel={accessibilityLabel ?? label}
        onPressIn={() =>
          Animated.timing(scale, {
            toValue: 0.97,
            duration: 90,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }).start()
        }
        onPressOut={() =>
          Animated.spring(scale, {
            toValue: 1,
            useNativeDriver: true,
          }).start()
        }
        onPress={press}
        disabled={isDisabled}
        style={[
          styles.wrap,
          size === "full" && styles.full,
          isDisabled ? styles.disabledShadow : Shadows.button,
          style,
        ]}
      >
        {isDisabled && !loading ? (
          <>
            <Text style={[styles.text, styles.textDisabled]}>{label}</Text>
          </>
        ) : (
          <LinearGradient
            colors={[Colors.orangeDark, Colors.orangeBright]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFillObject}
          />
        )}
        {!isDisabled || loading ? (
          <Text style={styles.text}>
            {loading ? "" : label}
          </Text>
        ) : null}
        {loading ? (
          <ActivityIndicator color={Colors.pureWhite} size="small" />
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: primaryButtonHeight,
    borderRadius: Radii.button,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    backgroundColor: Colors.borderLight,
  },
  full: {
    alignSelf: "stretch",
  },
  text: {
    fontFamily: Typography.semibold,
    fontSize: Typography.bodyLarge,
    color: Colors.pureWhite,
    letterSpacing: 0.1,
  },
  textDisabled: {
    color: "#C0A898",
  },
  disabledShadow: {
    shadowOpacity: 0,
    elevation: 0,
  },
});
