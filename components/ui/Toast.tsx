import { useEffect, useRef } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { colors, radius, spacing } from "@/lib/design-tokens";
import { fontFamily } from "@/lib/typography";

type ToastProps = {
  message: string | null;
  /** success = teal, danger = coral (destructive confirms only). */
  tone?: "success" | "danger" | "info";
  style?: StyleProp<ViewStyle>;
  onHide?: () => void;
};

/** Lightweight in-screen toast — no extra dependency. */
export function Toast({
  message,
  tone = "success",
  style,
  onHide,
}: ToastProps) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!message) {
      opacity.setValue(0);
      return;
    }
    opacity.setValue(0);
    Animated.sequence([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.delay(2200),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        onHide?.();
      }
    });
  }, [message, opacity, onHide]);

  if (!message) {
    return null;
  }

  const bg =
    tone === "danger"
      ? colors.riskHigh
      : tone === "info"
        ? colors.deepNavy
        : colors.riskLow;

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      style={[styles.wrap, { backgroundColor: bg, opacity }, style]}
    >
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: spacing.screenX,
    right: spacing.screenX,
    bottom: spacing.lg,
    borderRadius: radius.alert,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.mdSm,
    zIndex: 50,
  },
  text: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 14,
    lineHeight: 20,
    color: colors.white,
    textAlign: "center",
  },
});
