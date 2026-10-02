import type { ReactNode } from "react";
import {
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { Colors, Radius, Shadow } from "@/lib/theme";

export type GlassIntensity = "card" | "chrome" | "sheet" | "button";
export type GlassTint = "light" | "dark";

type GlassCardProps = {
  children?: ReactNode;
  intensity?: GlassIntensity;
  /** light = white card; dark = warm ink scrim (rare chrome). */
  tint?: GlassTint;
  style?: StyleProp<ViewStyle>;
};

/**
 * ⚠️ LEGACY NAME, NEW LOOK. Prefer `Card` from components/ui/Card.tsx.
 *
 * PLAIN ENGLISH: this used to be a frosted-glass panel. The orange redesign is
 * flat and premium, so it now renders as a plain white card with the soft
 * orange-tinted shadow. The name and props are unchanged so the ~80 screens
 * that still import it keep working and instantly pick up the new look.
 */
export function GlassCard({
  children,
  intensity = "card",
  tint = "light",
  style,
}: GlassCardProps) {
  const isDark = tint === "dark";

  const shape: ViewStyle = {
    backgroundColor: isDark
      ? "rgba(31,27,24,0.45)"
      : intensity === "chrome"
        ? Colors.background
        : Colors.white,
    ...radiusFor(intensity),
    ...(intensity === "card" || intensity === "sheet" ? Shadow.soft : {}),
    ...(intensity === "chrome"
      ? {
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: Colors.line,
        }
      : {}),
  };

  return <View style={[shape, style]}>{children}</View>;
}

function radiusFor(intensity: GlassIntensity): ViewStyle {
  if (intensity === "chrome") {
    return { borderRadius: 0 };
  }
  if (intensity === "sheet") {
    return {
      borderTopLeftRadius: Radius.sheet,
      borderTopRightRadius: Radius.sheet,
    };
  }
  return {
    borderRadius: intensity === "button" ? Radius.button : Radius.card,
  };
}
