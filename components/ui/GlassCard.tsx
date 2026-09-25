import type { ReactNode } from "react";
import {
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { colors, hairline } from "@/lib/design-tokens";

export type GlassIntensity = "card" | "chrome" | "sheet" | "button";
export type GlassTint = "light" | "dark";

type GlassCardProps = {
  children?: ReactNode;
  intensity?: GlassIntensity;
  /**
   * "light" (default) renders as a white paper card with a 1px black
   * outline. "dark" renders on the capsule-black hero surface with a
   * white outline — used for the hero product bands and the outlined
   * CTA on dark.
   */
  tint?: GlassTint;
  style?: StyleProp<ViewStyle>;
};

/**
 * SwimClub flat card — same public API as the old GlassCard so existing
 * screens keep compiling, but the rendered chrome is now hairline paper
 * (or hairline dark for tint="dark"). No blur, no shadow, no radius.
 *
 * The old "intensity" prop is kept for callsite compatibility but no
 * longer changes the visual — every intensity is a flat paper panel with
 * the same hairline outline. The "chrome" intensity (used by legacy
 * footer bars) skips the border so it can sit flush against a Screen
 * edge without doubling up the divider.
 */
export function GlassCard({
  children,
  intensity = "card",
  tint = "light",
  style,
}: GlassCardProps) {
  const isDark = tint === "dark";
  const bg = isDark ? colors.capsuleBlack : colors.paperWhite;
  const borderColor = isDark ? colors.paperWhite : colors.inkBlack;

  const shape: ViewStyle = {
    backgroundColor: bg,
    borderWidth: intensity === "chrome" ? 0 : hairline,
    borderColor,
    borderRadius: 0,
    overflow: "hidden",
  };

  return <View style={[shape, style]}>{children}</View>;
}
