import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { MossPattern } from "@/components/ui/MossPattern";
import { Surface } from "@/components/ui/Surface";
import { colors, spacing } from "@/lib/design-tokens";
import { typography } from "@/lib/typography";

type EmptyStateProps = {
  /**
   * @deprecated Accepted so the screens that still pass it compile. The Moss
   * empty state is the pattern band and the words — it draws no glyph, so
   * this value is ignored. Each screen task drops the prop as it lands.
   */
  icon?: keyof typeof Feather.glyphMap;
  heading: string;
  explanation: string;
};

/**
 * Designed empty state — never “No data found”.
 *
 * The illustration prop is gone: a figure drawn into an empty screen gives it
 * a subject, and an empty screen has none. In its place is a band of
 * `MossPattern`, which is a motif rather than a picture, so the two lines of
 * copy stay the only thing with meaning on the card.
 */
export function EmptyState({ heading, explanation }: EmptyStateProps) {
  return (
    // Unpadded so the band runs to the card's edges; `overflow: hidden` is
    // what rounds its top corners to the surface radius.
    <Surface padded={false} style={styles.wrap}>
      <MossPattern height={96} />
      <View style={styles.body}>
        <Text style={styles.heading}>{heading}</Text>
        <Text style={styles.explanation}>{explanation}</Text>
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: spacing.md,
    overflow: "hidden",
  },
  body: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: spacing.md,
  },
  heading: {
    ...typography.title,
    color: colors.ink,
    textAlign: "center",
  },
  explanation: {
    marginTop: spacing.sm,
    ...typography.body,
    color: colors.inkSoft,
    textAlign: "center",
  },
});
