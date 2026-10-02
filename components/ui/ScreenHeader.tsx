import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { BackButton } from "@/components/ui/BackButton";
import { Colors, Gap, Size, Space, typeStyle } from "@/lib/theme";

type ScreenHeaderProps = {
  title: string;
  /** Omit to use the default router.back() behaviour. */
  onBack?: () => void;
  backLabel?: string;
  /** Hide the back button (Home and other root screens). */
  hideBack?: boolean;
  /** Small warm grey line under the title. */
  subtitle?: string;
  /** Right-hand control (menu button, chip, action). */
  right?: ReactNode;
  /** Left-align the serif title under the back button instead of centring it. */
  align?: "left" | "center";
};

/**
 * Sub-screen heading: a 48px circular white back button top-left and a serif
 * title. Every screen that is not Home gets one of these, so the back button
 * is inherited rather than rebuilt per screen.
 */
export function ScreenHeader({
  title,
  onBack,
  backLabel = "Go back",
  hideBack = false,
  subtitle,
  right,
  align = "left",
}: ScreenHeaderProps) {
  const centred = align === "center";

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {hideBack ? (
          <View style={styles.spacer} />
        ) : (
          <BackButton onPress={onBack} accessibilityLabel={backLabel} />
        )}
        {centred ? (
          <Text
            style={[styles.title, styles.titleCentred]}
            accessibilityRole="header"
            numberOfLines={1}
          >
            {title}
          </Text>
        ) : null}
        <View style={styles.rightSlot}>{right}</View>
      </View>
      {centred ? null : (
        <Text style={styles.titleBelow} accessibilityRole="header">
          {title}
        </Text>
      )}
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    // Section 10: 32px of air between the title and the first content.
    paddingBottom: Gap.afterTitle,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: Size.circleButton,
  },
  spacer: {
    width: Size.circleButton,
    height: Size.circleButton,
  },
  rightSlot: {
    minWidth: Size.circleButton,
    alignItems: "flex-end",
  },
  title: {
    flex: 1,
    ...typeStyle("section"),
    color: Colors.ink,
  },
  titleCentred: {
    textAlign: "center",
    paddingHorizontal: Space.sm,
  },
  titleBelow: {
    ...typeStyle("title"),
    marginTop: Space.lg,
    color: Colors.ink,
  },
  subtitle: {
    ...typeStyle("body"),
    marginTop: Space.sm,
    color: Colors.body,
  },
});
