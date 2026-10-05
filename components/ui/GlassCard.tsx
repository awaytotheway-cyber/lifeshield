import type { ReactNode } from "react";
import {
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { colors, radius, shadows } from "@/lib/design-tokens";

export type GlassIntensity = "card" | "chrome" | "sheet" | "button";
export type GlassTint = "light" | "dark";

type GlassCardProps = {
  children?: ReactNode;
  intensity?: GlassIntensity;
  /** light = white surface; dark = navy surface (rare chrome). */
  tint?: GlassTint;
  style?: StyleProp<ViewStyle>;
};

const radiusFor: Record<GlassIntensity, number> = {
  card: radius.card,
  chrome: 0,
  sheet: radius.sheet,
  button: radius.button,
};

/**
 * Standard surface: solid fill, 1px neutral border, shallow shadow.
 *
 * This used to be a frosted BlurView panel, which only worked because Screen
 * painted a tinted gradient behind every page. With the background flattened
 * to a near-white #FAFBFC there is nothing to frost: a translucent white fill
 * on near-white made cards disappear, and the blur cost a layer per card for
 * no visible effect. A solid surface with a real border is both clearer and
 * cheaper, and gives every card the same edge.
 *
 * The name is kept because it is imported in ~40 places; the API is unchanged.
 */
export function GlassCard({
  children,
  intensity = "card",
  tint = "light",
  style,
}: GlassCardProps) {
  const isDark = tint === "dark";
  const corner = radiusFor[intensity];

  const shape: ViewStyle = {
    backgroundColor: isDark ? colors.deepNavy : colors.white,
    borderRadius: intensity === "sheet" ? undefined : corner,
    borderTopLeftRadius: intensity === "sheet" ? radius.sheet : corner,
    borderTopRightRadius: intensity === "sheet" ? radius.sheet : corner,
    borderWidth: intensity === "chrome" ? StyleSheet.hairlineWidth : 1,
    borderColor: isDark ? colors.deepNavy : colors.cardBorder,
    overflow: "hidden",
    ...(intensity === "card" || intensity === "sheet" ? shadows.card : {}),
  };

  return <View style={[shape, style]}>{children}</View>;
}
