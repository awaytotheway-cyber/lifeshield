import { StyleSheet, Text, View } from "react-native";

import { IconButton } from "@/components/ui/Button";
import { colors, hairline, spacing } from "@/lib/design-tokens";
import { fontFamily } from "@/lib/typography";

type ScreenHeaderProps = {
  title: string;
  onBack?: () => void;
  backLabel?: string;
};

/**
 * SwimClub screen header — thin typographic strip, left-aligned title in
 * bold grotesque, a hairline divider below. No centered heading (too
 * decorative for the clinical-dossier tone).
 */
export function ScreenHeader({
  title,
  onBack,
  backLabel = "Go back",
}: ScreenHeaderProps) {
  return (
    <View style={styles.wrap}>
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
        <Text
          style={styles.title}
          accessibilityRole="header"
          numberOfLines={1}
        >
          {title}
        </Text>
        <View style={styles.spacer} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderBottomWidth: hairline,
    borderBottomColor: colors.inkBlack,
    marginBottom: spacing.base,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  title: {
    flex: 1,
    fontFamily: fontFamily.groteskBold,
    fontSize: 21,
    lineHeight: 27,
    letterSpacing: -0.2,
    color: colors.inkBlack,
  },
  spacer: {
    width: 44,
    height: 44,
  },
});
