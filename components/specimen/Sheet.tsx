import type { ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";

import { Accent, Edge, Ink, Measure, Paper, Rule } from "@/lib/specimen-tokens";

/**
 * A mounted sheet — the surface every card in PRESCOPE sits on.
 *
 * There is no glass and no shadow in this system. A surface is paper
 * with a hairline border and near-square corners; depth is read from
 * the rule, not from a blur.
 *
 *   mount — a fresh sheet, the default card.
 *   sheet — pressed/aged stock, for insets and nested panels.
 *   tint  — the specimen-tag wash, for a flagged or attention item.
 */
export type SheetVariant = "mount" | "sheet" | "tint";

type SheetProps = {
  children?: ReactNode;
  variant?: SheetVariant;
  radius?: number;
  padding?: number;
  style?: StyleProp<ViewStyle>;
};

const FILL: Record<SheetVariant, string> = {
  mount: Paper.mount,
  sheet: Paper.sheetDeep,
  tint: Accent.tagWash,
};

const BORDER: Record<SheetVariant, string> = {
  mount: Ink.rule,
  sheet: Ink.rule,
  tint: Accent.tagEdge,
};

export function Sheet({
  children,
  variant = "mount",
  radius = Edge.mount,
  padding = Measure.base,
  style,
}: SheetProps) {
  return (
    <View
      style={[
        {
          backgroundColor: FILL[variant],
          borderWidth: Rule.hair,
          borderColor: BORDER[variant],
          borderRadius: radius,
          padding,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
