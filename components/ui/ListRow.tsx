import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { PressScale } from "@/components/ui/PressScale";
import {
  Colors,
  Font,
  Gap,
  Motion,
  Radius,
  Size,
  Space,
  typeStyle,
} from "@/lib/theme";

type ListRowProps = {
  label: string;
  /** Small grey line under the label. */
  subtitle?: string;
  /** Right-hand value text (shown left of the chevron). */
  value?: string;
  /** Feather icon shown in a 44px orange-tint rounded square on the left. */
  icon?: keyof typeof Feather.glyphMap;
  onPress?: () => void;
  /** Show the chevron. Defaults to true when the row is tappable. */
  chevron?: boolean;
  /** Hairline divider below the row. Pass false for the last row in a group. */
  divider?: boolean;
  /** Red label — used for destructive rows such as "Log out". */
  destructive?: boolean;
  /** Anything custom on the right (a switch, a chip). Replaces value/chevron. */
  right?: ReactNode;
  /** Highlights the row as the current section. */
  active?: boolean;
  /** Extra vertical padding — the drawer uses 20px instead of 18px. */
  paddingY?: number;
};

/**
 * Roomy settings / menu row: 18px vertical padding minimum, label left,
 * value or chevron right, hairline divider below.
 */
export function ListRow({
  label,
  subtitle,
  value,
  icon,
  onPress,
  chevron,
  divider = true,
  destructive = false,
  right,
  active = false,
  paddingY = Gap.rowY,
}: ListRowProps) {
  const showChevron = chevron ?? Boolean(onPress);
  const labelColor = destructive
    ? Colors.red
    : active
      ? Colors.orangeDeep
      : Colors.ink;

  const content = (
    <View style={[styles.row, { paddingVertical: paddingY }]}>
      {icon ? (
        <View
          style={[
            styles.iconSquare,
            destructive ? styles.iconSquareDanger : null,
          ]}
        >
          <Feather
            name={icon}
            size={20}
            color={destructive ? Colors.red : Colors.orange}
          />
        </View>
      ) : null}
      <View style={styles.textWrap}>
        <Text style={[styles.label, { color: labelColor }]}>{label}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {right ?? (
        <>
          {value ? <Text style={styles.value}>{value}</Text> : null}
          {showChevron ? (
            <Feather
              name="chevron-right"
              size={20}
              color={destructive ? Colors.red : Colors.faint}
            />
          ) : null}
        </>
      )}
    </View>
  );

  const wrapper = [styles.wrap, divider ? styles.divider : null];

  if (!onPress) {
    return <View style={wrapper}>{content}</View>;
  }

  return (
    <PressScale
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      scale={Motion.pressCard}
      haptic="light"
      style={({ pressed }) => [
        wrapper,
        pressed ? styles.pressed : null,
      ]}
    >
      {content}
    </PressScale>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: Radius.input,
  },
  pressed: {
    backgroundColor: Colors.orangeTint,
  },
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.line,
  },
  row: {
    minHeight: Size.tap,
    flexDirection: "row",
    alignItems: "center",
    gap: Space.md - 2,
  },
  iconSquare: {
    width: Size.iconSquare,
    height: Size.iconSquare,
    borderRadius: 14,
    backgroundColor: Colors.orangeTint,
    alignItems: "center",
    justifyContent: "center",
  },
  iconSquareDanger: {
    backgroundColor: Colors.redTint,
  },
  textWrap: {
    flex: 1,
  },
  label: {
    fontFamily: Font.medium,
    fontSize: 16,
    lineHeight: 22,
  },
  subtitle: {
    ...typeStyle("secondary"),
    marginTop: 2,
    color: Colors.muted,
  },
  value: {
    ...typeStyle("secondary"),
    color: Colors.muted,
    maxWidth: 140,
    textAlign: "right",
  },
});
