import { StyleSheet, View, type ViewStyle } from "react-native";
import { Feather } from "@/components/specimen/Icon";

import { Colors, Radii } from "@/lib/design-tokens";

type Size = "sm" | "md" | "lg";
type Variant = "orange" | "white" | "dark" | "glass";

type IconContainerProps = {
  icon: keyof typeof Feather.glyphMap;
  size?: Size;
  variant?: Variant;
  color?: string;
  style?: ViewStyle;
};

const SPEC: Record<
  Size,
  { box: number; radius: number; icon: number }
> = {
  sm: { box: 36, radius: Radii.icon, icon: 18 },
  md: { box: 44, radius: Radii.icon + 2, icon: 22 },
  lg: { box: 52, radius: Radii.iconLarge, icon: 24 },
};

const VARIANT_STYLE: Record<Variant, { bg: string; iconColor: string }> = {
  orange: { bg: Colors.orangeTint, iconColor: Colors.orangeDark },
  white: { bg: Colors.pureWhite, iconColor: Colors.charcoal },
  dark: { bg: Colors.charcoal, iconColor: Colors.pureWhite },
  glass: { bg: "rgba(255,255,255,0.20)", iconColor: Colors.pureWhite },
};

export function IconContainer({
  icon,
  size = "md",
  variant = "orange",
  color,
  style,
}: IconContainerProps) {
  const spec = SPEC[size];
  const v = VARIANT_STYLE[variant];
  return (
    <View
      style={[
        styles.box,
        {
          width: spec.box,
          height: spec.box,
          borderRadius: spec.radius,
          backgroundColor: v.bg,
        },
        style,
      ]}
    >
      <Feather name={icon} size={spec.icon} color={color ?? v.iconColor} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: "center",
    justifyContent: "center",
  },
});
