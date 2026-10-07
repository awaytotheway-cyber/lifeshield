import { StyleSheet, View, type ViewStyle } from "react-native";
import { Icon, type IconName } from "@/components/specimen/Icon";
import { Accent, Edge, Ink, Paper } from "@/lib/specimen-tokens";

type Size = "sm" | "md" | "lg";
type Variant = "tag" | "paper" | "ink";

type IconContainerProps = {
  icon: IconName;
  size?: Size;
  variant?: Variant;
  color?: string;
  style?: ViewStyle;
};

const SPEC: Record<
  Size,
  { box: number; radius: number; icon: number }
> = {
  sm: { box: 36, radius: Edge.hair, icon: 18 },
  md: { box: 44, radius: Edge.hair + 2, icon: 22 },
  lg: { box: 52, radius: Edge.hair, icon: 24 },
};

const VARIANT_STYLE: Record<Variant, { bg: string; iconColor: string }> = {
  tag: { bg: Accent.tagWash, iconColor: Accent.tag },
  paper: { bg: Paper.mount, iconColor: Ink.full },
  ink: { bg: Ink.full, iconColor: Paper.sheet },
};

export function IconContainer({
  icon,
  size = "md",
  variant = "tag",
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
      <Icon name={icon} size={spec.icon} color={color ?? v.iconColor} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: "center",
    justifyContent: "center",
  },
});
