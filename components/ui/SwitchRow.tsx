import { StyleSheet, Switch, Text, View } from "react-native";

import { colors, controlHeight } from "@/lib/design-tokens";
import { fontFamily, typography } from "@/lib/typography";

type SwitchRowProps = {
  title: string;
  /** Sits under the label, inside the row, and grows the row past 56pt. */
  subtitle?: string;
  value: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
  divided?: boolean;
};

/**
 * A row that is a switch. The whole row is the label — the switch is
 * right-aligned and the hit area is the switch itself, so a mis-tap on a
 * privacy control cannot flip it.
 */
export function SwitchRow({
  title,
  subtitle,
  value,
  disabled = false,
  onChange,
  divided = true,
}: SwitchRowProps) {
  return (
    <View style={[styles.row, divided ? styles.rowDivided : null]}>
      <View style={styles.textCol}>
        <Text style={styles.label}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <Switch
        value={value}
        disabled={disabled}
        onValueChange={onChange}
        accessibilityLabel={title}
        accessibilityHint={subtitle}
        // The board's switch accent is ink. Off is the hairline, the one
        // divider colour, so an off switch reads as absent rather than grey.
        trackColor={{ false: colors.hairline, true: colors.ink }}
        thumbColor={colors.white}
        ios_backgroundColor={colors.hairline}
        // A platform switch is about 31pt tall, under the 44pt floor. The row
        // is 56, so the slop costs nothing and nothing else is near enough to
        // steal.
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    minHeight: controlHeight,
    paddingVertical: 10,
  },
  // The one divider in the system: a 1px hairline between rows of a block,
  // never a border around the block itself.
  rowDivided: {
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  textCol: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 16,
    lineHeight: 22,
    color: colors.ink,
  },
  subtitle: {
    marginTop: 2,
    ...typography.label,
    color: colors.inkSoft,
  },
});
