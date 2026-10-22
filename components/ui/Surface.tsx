import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { colors, radius } from "@/lib/design-tokens";

type SurfaceProps = {
  children: ReactNode;
  /** 20px on all sides. Pass `false` for edge-to-edge content (media, bands). */
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * The Moss card: white, one radius, and nothing else.
 *
 * There is no border, no shadow, no elevation and no blur — a card is told
 * apart from the paper ground by its white fill alone. Anything that adds a
 * `borderWidth` or a `shadow*` style through `style` is fighting the design
 * language, not extending it.
 */
export function Surface({ children, padded = true, style }: SurfaceProps) {
  return (
    <View style={[styles.surface, padded && styles.padded, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  surface: {
    backgroundColor: colors.white,
    borderRadius: radius.surface,
  },
  padded: {
    // The card inset is 20 — between spacing.base and spacing.md, and the one
    // place the 8-point grid takes a half step.
    padding: 20,
  },
});
