import type { ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Feather } from "@expo/vector-icons";

import { colors, spacing } from "@/lib/design-tokens";
import { fontFamily } from "@/lib/typography";

type DashedFeatureCardProps = {
  icon?: keyof typeof Feather.glyphMap;
  heading: string;
  subLabel?: string;
  /**
   * When set, the whole card is pressable and renders a right-side chevron
   * / collapse indicator. Omit for a display-only card.
   */
  onPress?: () => void;
  trailing?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * SwimClub dashed-border feature card — white background, 1px dashed
 * smoke border (0px radius), 32px padding. Left icon, center heading
 * plus sub-label, right chevron. Reads as "diagram entry" rather than
 * "product card".
 *
 * Dashed borders on React Native only render reliably when
 * borderStyle is set on ALL sides of a single view; we honour that
 * here so it looks right on both iOS and Android.
 */
export function DashedFeatureCard({
  icon,
  heading,
  subLabel,
  onPress,
  trailing,
  style,
}: DashedFeatureCardProps) {
  const content = (
    <View style={styles.row}>
      {icon ? (
        <View style={styles.iconWrap}>
          <Feather name={icon} size={20} color={colors.inkBlack} />
        </View>
      ) : null}
      <View style={styles.text}>
        <Text style={styles.heading}>{heading}</Text>
        {subLabel ? <Text style={styles.subLabel}>{subLabel}</Text> : null}
      </View>
      <View style={styles.trailing}>
        {trailing ??
          (onPress ? (
            <Feather name="minus" size={20} color={colors.inkBlack} />
          ) : null)}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={[styles.card, style]}>
        {content}
      </Pressable>
    );
  }
  return <View style={[styles.card, style]}>{content}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.smoke,
    borderRadius: 0,
    padding: spacing.lg,
    backgroundColor: colors.paperWhite,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.base,
  },
  iconWrap: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    flex: 1,
  },
  heading: {
    fontFamily: fontFamily.groteskBold,
    fontSize: 21,
    lineHeight: 26,
    color: colors.inkBlack,
  },
  subLabel: {
    fontFamily: fontFamily.grotesk,
    fontSize: 15,
    lineHeight: 22,
    color: colors.ironGray,
    marginTop: spacing.micro,
  },
  trailing: {
    width: 24,
    alignItems: "flex-end",
  },
});
