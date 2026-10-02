import { useEffect, useRef } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { Colors, Radius, Shadow, Space, typeStyle } from "@/lib/theme";

type ToastProps = {
  message: string | null;
  /** success = green, danger = red (destructive confirms only), info = ink. */
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
      ? Colors.red
      : tone === "info"
        ? Colors.ink
        : Colors.green;

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      style={[
        styles.wrap,
        Shadow.lift,
        { backgroundColor: bg, opacity },
        style,
      ]}
    >
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: Space.screenH,
    right: Space.screenH,
    bottom: Space.xl,
    borderRadius: Radius.button,
    paddingHorizontal: Space.md,
    paddingVertical: Space.md - 2,
    zIndex: 50,
  },
  text: {
    ...typeStyle("secondary"),
    color: Colors.white,
    textAlign: "center",
  },
});
