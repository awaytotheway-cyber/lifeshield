import type { ReactNode } from "react";
import { StyleSheet } from "react-native";

import { Surface } from "@/components/ui/Surface";
import { spacing } from "@/lib/design-tokens";

/**
 * A card is a `Surface` — white, one radius, no border and no shadow. This
 * wrapper exists only so the screens that already say `Card` keep their 16pt
 * lead; reach for `Surface` directly in new code.
 */
export function Card({ children }: { children: ReactNode }) {
  return <Surface style={styles.card}>{children}</Surface>;
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.base,
  },
});
