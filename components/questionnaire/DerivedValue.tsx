import { StyleSheet, Text, View } from "react-native";

import { Card } from "@/components/ui/Card";
import { Colors, Gap, Space, typeStyle } from "@/lib/theme";

type DerivedValueProps = {
  label: string;
  /** Already-formatted value, or “—” when the inputs are incomplete. */
  value: string;
  /** One short line explaining what the number means. */
  hint?: string;
  /** True while the inputs above are still blank. Quietens the placeholder. */
  pending?: boolean;
};

/**
 * A read-only number the app works out for you — age, BMI, waist-to-hip
 * ratio, pack-years.
 *
 * PLAIN ENGLISH: a small white card with the label on the left and the figure
 * in big orange type on the right. Numbers are the one place the redesign
 * always uses orange.
 */
export function DerivedValue({
  label,
  value,
  hint,
  pending = false,
}: DerivedValueProps) {
  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.value, pending ? styles.valuePending : null]}>
          {value}
        </Text>
      </View>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: Gap.cards,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Space.sm,
  },
  label: {
    flex: 1,
    ...typeStyle("cardTitle"),
    color: Colors.ink,
  },
  value: {
    ...typeStyle("dataBig"),
    color: Colors.orange,
  },
  // An empty figure should read as “waiting for you”, not as a loud orange bar.
  valuePending: {
    ...typeStyle("cardTitle"),
    color: Colors.faint,
  },
  hint: {
    ...typeStyle("secondary"),
    marginTop: Space.sm,
    color: Colors.muted,
  },
});
