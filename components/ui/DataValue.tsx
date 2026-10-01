import { StyleSheet, Text, View, type TextStyle } from "react-native";

import { Colors, Typography } from "@/lib/design-tokens";

type Size = "hero" | "card" | "inline" | "small";

type DataValueProps = {
  value: string | number;
  unit?: string;
  size?: Size;
  color?: string;
  unitColor?: string;
  style?: TextStyle;
};

/**
 * Any numeric or clinical value in the app must go through this
 * component. The monospace font is what makes PRESCOPE feel clinically
 * credible instead of generic.
 */
export function DataValue({
  value,
  unit,
  size = "inline",
  color,
  unitColor,
  style,
}: DataValueProps) {
  const styles = STYLES[size];
  return (
    <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6 }}>
      <Text style={[styles.value, color ? { color } : null, style]}>{String(value)}</Text>
      {unit ? (
        <Text style={[styles.unit, unitColor ? { color: unitColor } : null]}>
          {unit}
        </Text>
      ) : null}
    </View>
  );
}

const STYLES: Record<Size, { value: TextStyle; unit: TextStyle }> = {
  hero: {
    value: {
      fontFamily: Typography.monoBold,
      fontSize: Typography.dataHero,
      lineHeight: Typography.dataHero + 4,
      color: Colors.charcoal,
    },
    unit: {
      fontFamily: Typography.regular,
      fontSize: Typography.secondary,
      color: Colors.bodyText,
    },
  },
  card: {
    value: {
      fontFamily: Typography.monoBold,
      fontSize: Typography.dataCard,
      lineHeight: Typography.dataCard + 4,
      color: Colors.charcoal,
    },
    unit: {
      fontFamily: Typography.regular,
      fontSize: Typography.label,
      color: Colors.mutedText,
    },
  },
  inline: {
    value: {
      fontFamily: Typography.mono,
      fontSize: Typography.dataInline,
      color: Colors.charcoal,
    },
    unit: {
      fontFamily: Typography.regular,
      fontSize: Typography.secondary,
      color: Colors.mutedText,
    },
  },
  small: {
    value: {
      fontFamily: Typography.mono,
      fontSize: Typography.dataSmall,
      color: Colors.charcoal,
    },
    unit: {
      fontFamily: Typography.regular,
      fontSize: Typography.micro,
      color: Colors.mutedText,
    },
  },
};
