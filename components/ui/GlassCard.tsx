import type { ReactNode } from "react";
import {
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { BlurView } from "expo-blur";

import { Colors, Radii, Shadows, Spacing, radius } from "@/lib/design-tokens";
import {
  GLASS_BLUR_INTENSITY,
  GlassOnGradient,
  GlassOnWhite,
  GlassTint,
} from "@/lib/glass";

/** v2 variant API — pick where the card lives. */
export type GlassVariant = "onGradient" | "onWhite" | "tint";

/** Legacy intensity names kept so older screens keep compiling. */
export type GlassIntensity = "card" | "chrome" | "sheet" | "button";
export type GlassTintStyle = "light" | "dark";

type GlassCardProps = {
  children?: ReactNode;
  /** v2 preferred. */
  variant?: GlassVariant;
  /** Legacy — mapped to a sensible variant. */
  intensity?: GlassIntensity;
  /** Legacy; "dark" still forces a navy tint for chrome strips. */
  tint?: GlassTintStyle;
  /** Override border-radius. Default picked from variant. */
  radius?: number;
  /** Override inner padding. Default Spacing.card. */
  padding?: number;
  style?: StyleProp<ViewStyle>;
};

const RADIUS_FOR_INTENSITY: Record<GlassIntensity, number> = {
  card: radius.card,
  chrome: 0,
  sheet: radius.sheet,
  button: radius.button,
};

function resolveVariant(
  variant: GlassVariant | undefined,
  intensity: GlassIntensity | undefined,
  tint: GlassTintStyle | undefined,
): GlassVariant {
  if (variant) return variant;
  if (tint === "dark") return "onGradient";
  if (intensity === "chrome") return "onGradient";
  if (intensity === "button") return "tint";
  return "onWhite";
}

/**
 * Frosted glass surface. Three v2 variants:
 *   onGradient — sits on the orange hero (strong blur, 0.18 white, white border)
 *   onWhite    — sits on softWhite (moderate blur, 0.85 white, orange glass border)
 *   tint       — subtle orange tint (no blur needed, orange glass border)
 *
 * Legacy prop surface (`intensity`, `tint`) is preserved so screens built
 * before v2 keep working without edits.
 */
export function GlassCard({
  children,
  variant,
  intensity,
  tint,
  radius: radiusOverride,
  padding = Spacing.card,
  style,
}: GlassCardProps) {
  const resolved = resolveVariant(variant, intensity, tint);
  const effectiveRadius =
    radiusOverride ??
    (intensity ? RADIUS_FOR_INTENSITY[intensity] : Radii.card);

  const base =
    resolved === "onGradient"
      ? GlassOnGradient.card
      : resolved === "onWhite"
        ? GlassOnWhite.card
        : GlassTint.card;

  const shadow =
    resolved === "onGradient"
      ? Shadows.floatingCard
      : resolved === "tint"
        ? Shadows.cardSubtle
        : Shadows.card;

  // tint variant has no real transparency, so BlurView is unnecessary.
  if (resolved === "tint") {
    return (
      <View
        style={[
          { borderRadius: effectiveRadius, overflow: "hidden" },
          base,
          shadow,
          style,
        ]}
      >
        <View style={{ padding }}>{children}</View>
      </View>
    );
  }

  return (
    <View style={[{ borderRadius: effectiveRadius }, shadow, style]}>
      <BlurView
        intensity={
          resolved === "onGradient"
            ? GLASS_BLUR_INTENSITY.onGradient
            : GLASS_BLUR_INTENSITY.onWhite
        }
        tint="light"
        style={[
          { borderRadius: effectiveRadius, overflow: "hidden" },
          base,
          tint === "dark" ? styles.dark : null,
        ]}
      >
        <View style={{ padding }}>{children}</View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  dark: {
    backgroundColor: Colors.glassDark,
  },
});
