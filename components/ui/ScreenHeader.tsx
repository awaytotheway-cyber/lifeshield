import { StyleSheet, Text, View } from "react-native";

import { IconButton } from "@/components/ui/Button";
import { COPY } from "@/lib/copy";
import { colors, spacing, tapTarget } from "@/lib/design-tokens";
import { typography } from "@/lib/typography";

type ScreenHeaderProps = {
  title: string;
  onBack?: () => void;
  backLabel?: string;
};

/** Stack-style heading with an optional back arrow. */
export function ScreenHeader({
  title,
  onBack,
  backLabel = COPY.goBack,
}: ScreenHeaderProps) {
  return (
    <View style={styles.row}>
      {onBack ? (
        <IconButton
          icon="arrow-left"
          accessibilityLabel={backLabel}
          onPress={onBack}
        />
      ) : (
        <View style={styles.spacer} />
      )}
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      <View style={styles.spacer} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: spacing.sm,
  },
  title: {
    ...typography.h1,
    flex: 1,
    // A stack title sits centred between the back arrow and its spacer.
    // Headings may be centred; body copy may not.
    textAlign: "center",
    fontSize: 26,
    lineHeight: 31,
    // Headline colour, not the action blue the old deepTeal alias gave it.
    color: colors.deepNavy,
  },
  spacer: {
    width: tapTarget,
    height: tapTarget,
  },
});
