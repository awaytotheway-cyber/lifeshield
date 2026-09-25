import { StyleSheet, Text, type StyleProp, type TextStyle } from "react-native";

import { colors } from "@/lib/design-tokens";
import { fontFamily } from "@/lib/typography";

type MonoLabelProps = {
  children: string;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
};

/**
 * SwimClub uppercase mono micro-copy — used for section labels, nav
 * items, stat captions, ingredient tokens. Force-uppercased in code so
 * callsites don't have to shout in the string literal.
 */
export function MonoLabel({
  children,
  size = 12,
  color = colors.inkBlack,
  style,
}: MonoLabelProps) {
  return (
    <Text
      style={[
        styles.text,
        { fontSize: size, color },
        style,
      ]}
    >
      {children.toUpperCase()}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    fontFamily: fontFamily.mono,
    letterSpacing: 0.6,
    lineHeight: 16,
  },
});
