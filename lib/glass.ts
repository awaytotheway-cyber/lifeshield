/**
 * Glassmorphism helper for PRESCOPE v2.
 * Three variants — pick the one that matches where the card sits.
 *
 * Pair every "onGradient" / "onWhite" card with an <BlurView intensity={…}
 * tint="light"> wrapper. Without actual BlurView it is only a transparent
 * rectangle — not glassmorphism.
 */
import { StyleSheet } from "react-native";

import { Colors } from "@/lib/design-tokens";

export const GlassOnGradient = StyleSheet.create({
  card: {
    backgroundColor: Colors.glassWhiteLight,
    borderWidth: 1,
    borderColor: Colors.borderGlass,
  },
});

export const GlassOnWhite = StyleSheet.create({
  card: {
    backgroundColor: Colors.glassWhiteStrong,
    borderWidth: 1,
    borderColor: Colors.borderOrangeGlass,
  },
});

export const GlassTint = StyleSheet.create({
  card: {
    backgroundColor: Colors.glassOrangeTint,
    borderWidth: 1,
    borderColor: "rgba(200,75,17,0.10)",
  },
});

export const GLASS_BLUR_INTENSITY = {
  onGradient: 80,
  onWhite: 40,
} as const;
