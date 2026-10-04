import type { ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";

import { Accent, Edge, Ink, Measure, Paper, Rule } from "@/lib/specimen-tokens";

/**
 * A mounted sheet — SPECIMEN.
 *
 * Formerly a frosted-glass panel. There is no glass in this system: a
 * surface is paper with a hairline border and square-ish corners. The
 * component keeps its old name and full prop surface so the ~40 screens
 * that import it convert without edits.
 */

export type GlassVariant = "onGradient" | "onWhite" | "tint";
export type GlassIntensity = "card" | "chrome" | "sheet" | "button";
export type GlassTintStyle = "light" | "dark";
/** Legacy export name kept for older imports. */
export type GlassTint = GlassTintStyle;

type GlassCardProps = {
  children?: ReactNode;
  variant?: GlassVariant;
  intensity?: GlassIntensity;
  tint?: GlassTintStyle;
  radius?: number;
  padding?: number;
  style?: StyleProp<ViewStyle>;
};

export function GlassCard({
  children,
  variant,
  intensity,
  tint,
  radius,
  padding = Measure.base,
  style,
}: GlassCardProps) {
  // Dark chrome strips stay dark; everything else is paper.
  const isDark = tint === "dark";
  // "chrome" was the full-bleed nav/footer surface — no border, no radius.
  const isChrome = intensity === "chrome";

  const fill = isDark
    ? "rgba(27,26,23,0.72)"
    : variant === "tint"
      ? Accent.tagWash
      : intensity === "sheet"
        ? Paper.sheetDeep
        : Paper.mount;

  const border = isDark
    ? "rgba(255,255,255,0.14)"
    : variant === "tint"
      ? "#E3C8C1"
      : Ink.rule;

  return (
    <View
      style={[
        {
          backgroundColor: fill,
          borderWidth: isChrome ? 0 : Rule.hair,
          borderColor: border,
          borderRadius: radius ?? (isChrome ? Edge.none : Edge.mount),
          padding,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
