import { useState } from "react";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { COPY } from "@/lib/copy";
import {
  colors,
  controlHeight,
  radius,
  status,
  tapTarget,
} from "@/lib/design-tokens";
import {
  dateToHHmm,
  formatDisplayDuration,
  hhmmToDate,
  isHHmm,
  type TimePickerFieldProps,
} from "@/lib/datetime";
import { typography } from "@/lib/typography";

/** Clay, borrowed from `worthDiscussing` — Moss has no red for errors. */
const CLAY = status.worthDiscussing.text;

/**
 * iOS: spinning wheels (same idea as setting an alarm).
 * Android: the round clock face.
 *
 * The closed field takes the same no-box, ink-rule shape as every other
 * control; the wheels sit on a plain white panel with no shadow.
 */
export function TimePicker({
  label,
  value,
  onChange,
  error,
  hint,
}: TimePickerFieldProps) {
  const [open, setOpen] = useState(false);
  const selected = hhmmToDate(isHHmm(value) ? value : "00:20");
  const leftoverText = value && !isHHmm(value) ? value : null;

  const onPickerChange = (event: DateTimePickerEvent, next?: Date) => {
    if (Platform.OS === "android") {
      setOpen(false);
    }
    if (event.type === "dismissed" || !next) {
      return;
    }
    onChange(dateToHHmm(next));
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={() => setOpen((current) => !current)}
        style={styles.field}
      >
        <Text style={isHHmm(value) ? styles.value : styles.placeholder}>
          {isHHmm(value)
            ? `${value} (${formatDisplayDuration(value)})`
            : COPY.pickTime}
        </Text>
      </Pressable>
      {leftoverText ? (
        <Text style={styles.warn}>
          {COPY.timePickerLegacy.replace("{value}", leftoverText)}
        </Text>
      ) : null}
      {open ? (
        <View style={styles.panel}>
          <DateTimePicker
            value={selected}
            mode="time"
            display={Platform.OS === "ios" ? "spinner" : "clock"}
            is24Hour
            minuteInterval={5}
            onChange={onPickerChange}
            themeVariant="light"
            accentColor={colors.ink}
          />
          {Platform.OS === "ios" ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={COPY.pickerDone}
              onPress={() => setOpen(false)}
              style={styles.done}
            >
              <Text style={styles.doneText}>{COPY.pickerDone}</Text>
            </Pressable>
          ) : null}
        </View>
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
    color: colors.inkFaint,
    marginBottom: 4,
  },
  // Same rule as TextInput: no box, just the ink line under the control.
  field: {
    minHeight: controlHeight,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.ink,
    backgroundColor: "transparent",
    flexDirection: "row",
    alignItems: "center",
  },
  value: {
    ...typography.body,
    color: colors.ink,
    flex: 1,
  },
  placeholder: {
    ...typography.body,
    color: colors.inkFaint,
    flex: 1,
  },
  panel: {
    marginTop: 8,
    alignItems: "center",
    borderRadius: radius.surface,
    backgroundColor: colors.white,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  done: {
    minHeight: tapTarget,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  // The panel's only action is tertiary, so it is an underlined link.
  doneText: {
    ...typography.body,
    color: colors.ink,
    textDecorationLine: "underline",
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
