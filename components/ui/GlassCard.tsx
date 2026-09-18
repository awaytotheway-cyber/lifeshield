import type { ReactNode } from "react";
import {
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { BlurView } from "expo-blur";

import {
  colors,
  glassBlurIntensity,
  radius,
  shadows,
} from "@/lib/design-tokens";

export type GlassIntensity = "card" | "chrome" | "sheet" | "button";
export type GlassTint = "light" | "dark";

type GlassCardProps = {
  children?: ReactNode;
  intensity?: GlassIntensity;
  /** light = white frosted fill; dark = navy tint (rare chrome). */
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
 * Frosted glass panel — BlurView + semi-transparent fill.
 * Prefer this public API on new screens. GlassSurface re-exports the same look.
 * Never place on a plain white background; Screen provides the dark LifeShield atmosphere.
 *
 * Children sit above the blur layers so padding / alignItems on `style` still work.
 */
export function GlassCard({
  children,
  intensity = "card",
  tint = "light",
  style,
}: GlassCardProps) {
  const isDark = tint === "dark";
  const fill = isDark ? colors.glassFillDark : colors.glassFill;
  // The whole app now sits on a dark canvas, so the native blur always wants
  // the "dark" iOS tint; `tint` here only swaps how heavy the overlay fill is.
  const blurTint = "dark";
  const corner = radiusFor[intensity];

  const shape: ViewStyle = {
    borderRadius: intensity === "sheet" ? undefined : corner,
    borderTopLeftRadius: intensity === "sheet" ? radius.sheet : corner,
    borderTopRightRadius: intensity === "sheet" ? radius.sheet : corner,
    borderWidth: intensity === "chrome" ? StyleSheet.hairlineWidth : 1,
    borderColor: colors.glassBorder,
    overflow: "hidden",
    ...(intensity === "card" || intensity === "sheet" ? shadows.card : {}),
  };

  return (
    <View style={[shape, style]}>
      <BlurView
        intensity={glassBlurIntensity}
        tint={blurTint}
        style={StyleSheet.absoluteFill}
      />
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: fill }]}
      />
      {children}
    </View>
  );
}
