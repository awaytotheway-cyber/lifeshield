import type { ReactNode } from "react";
import { StyleSheet } from "react-native";

import { Sheet } from "@/components/specimen/Sheet";
import { Measure } from "@/lib/specimen-tokens";

export function Card({ children }: { children: ReactNode }) {
  return (
    <Sheet style={styles.card}>
      {children}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: Measure.base,
    padding: Measure.base,
  },
});
