import { StyleSheet, Text, View } from "react-native";

import { COPY } from "@/lib/copy";
import { colors, controlHeight, status } from "@/lib/design-tokens";
import {
  formatDisplayDuration,
  isHHmm,
  toInputHHmm,
  type TimePickerFieldProps,
} from "@/lib/datetime";
import { typography } from "@/lib/typography";

/** Clay, borrowed from `worthDiscussing` — Moss has no red for errors. */
const CLAY = status.worthDiscussing.text;

/**
 * Default (web) time field. On iPhone Safari this is the alarm-style clock.
 * Phones use TimePicker.native.tsx instead.
 *
 * Styled to the same rule as every other control: a 13px `inkSoft` label,
 * 56pt of room, and a 1.5px ink rule underneath instead of a box.
 */
export function TimePicker({
  label,
  value,
  onChange,
  error,
  hint,
}: TimePickerFieldProps) {
  const clockValue = toInputHHmm(value);
  const leftoverText = value && !clockValue ? value : null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      <input
        type="time"
        aria-label={label}
        value={clockValue}
        step={300}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        style={{
          marginTop: 0,
          width: "100%",
          minHeight: controlHeight,
          paddingLeft: 0,
          paddingRight: 0,
          borderRadius: 0,
          borderStyle: "solid",
          borderWidth: 0,
          borderBottomWidth: 1.5,
          borderBottomColor: colors.ink,
          backgroundColor: "transparent",
          color: colors.ink,
          fontSize: 15,
          fontFamily: typography.body.fontFamily,
        }}
      />
      {isHHmm(clockValue) ? (
        <Text style={styles.duration}>{formatDisplayDuration(clockValue)}</Text>
      ) : null}
      {leftoverText ? (
        <Text style={styles.warn}>
          {COPY.timePickerLegacy.replace("{value}", leftoverText)}
        </Text>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 16,
  },
  label: {
    ...typography.label,
    color: colors.inkSoft,
    marginBottom: 4,
  },
  hint: {
    ...typography.label,
    color: colors.inkSoft,
    marginBottom: 4,
  },
  duration: {
    marginTop: 8,
    ...typography.label,
    color: colors.mossDeep,
  },
  warn: {
    marginTop: 8,
    ...typography.label,
    color: CLAY,
  },
  error: {
    marginTop: 8,
    ...typography.label,
    color: CLAY,
  },
});
