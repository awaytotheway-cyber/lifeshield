import { StyleSheet, Text, View, type TextStyle } from "react-native";
import { Ink, SpecimenType } from "@/lib/specimen-tokens";

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
      fontFamily: SpecimenType.monoBold,
      fontSize: SpecimenType.dataHero,
      lineHeight: SpecimenType.dataHero + 4,
      color: Ink.full,
    },
    unit: {
      fontFamily: SpecimenType.regular,
      fontSize: SpecimenType.secondary,
      color: Ink.soft,
    },
  },
  card: {
    value: {
      fontFamily: SpecimenType.monoBold,
      fontSize: SpecimenType.dataCard,
      lineHeight: SpecimenType.dataCard + 4,
      color: Ink.full,
    },
    unit: {
      fontFamily: SpecimenType.regular,
      fontSize: SpecimenType.label,
      color: Ink.faint,
    },
  },
  inline: {
    value: {
      fontFamily: SpecimenType.mono,
      fontSize: SpecimenType.dataInline,
      color: Ink.full,
    },
    unit: {
      fontFamily: SpecimenType.regular,
      fontSize: SpecimenType.secondary,
      color: Ink.faint,
    },
  },
  small: {
    value: {
      fontFamily: SpecimenType.mono,
      fontSize: SpecimenType.dataSmall,
      color: Ink.full,
    },
    unit: {
      fontFamily: SpecimenType.regular,
      fontSize: SpecimenType.micro,
      color: Ink.faint,
    },
  },
};
