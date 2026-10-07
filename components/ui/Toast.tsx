import { Accent, Edge, Ink, Measure, Paper, SpecimenType } from "@/lib/specimen-tokens";
import { useEffect, useRef } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

type ToastProps = {
  message: string | null;
  /** success = sage, danger = tag (destructive confirms only). */
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
      ? Accent.tag
      : tone === "info"
        ? Ink.full
        : Accent.sage;

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
    left: Measure.gutter,
    right: Measure.gutter,
    bottom: Measure.section,
    borderRadius: Edge.hair,
    paddingHorizontal: Measure.base,
    paddingVertical: Measure.snug,
    zIndex: 50,
  },
  text: {
    fontFamily: SpecimenType.mono,
    fontSize: 16,
    lineHeight: 22,
    color: Paper.mount,
    textAlign: "center",
  },
});
