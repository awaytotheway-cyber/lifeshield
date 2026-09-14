import type { ReactNode } from "react";
import { StyleSheet } from "react-native";

import { GlassCard } from "@/components/ui/GlassCard";
import { spacing } from "@/lib/design-tokens";

export function Card({ children }: { children: ReactNode }) {
  return (
    <GlassCard intensity="card" style={styles.card}>
      {children}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.base,
    padding: spacing.base,
  },
});
