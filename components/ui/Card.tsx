import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { colors, radius, shadows, spacing } from "@/lib/design-tokens";

export function Card({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.base,
    borderRadius: radius.card,
    backgroundColor: colors.white,
    padding: spacing.base,
    ...shadows.card,
  },
});
