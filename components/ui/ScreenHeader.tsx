import { StyleSheet, Text, View } from "react-native";

import { IconButton } from "@/components/ui/Button";
import { colors, spacing } from "@/lib/design-tokens";
import { fontFamily } from "@/lib/typography";

type ScreenHeaderProps = {
  title: string;
  onBack?: () => void;
  backLabel?: string;
};

/** Stack-style heading with an optional back arrow. */
export function ScreenHeader({
  title,
  onBack,
  backLabel = "Go back",
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
    flex: 1,
    textAlign: "center",
    fontFamily: fontFamily.display,
    fontSize: 26,
    lineHeight: 31,
    letterSpacing: -0.5,
    color: colors.deepTeal,
  },
  spacer: {
    width: 44,
    height: 44,
  },
});
