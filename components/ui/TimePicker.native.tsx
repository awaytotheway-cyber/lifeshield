import { useState } from "react";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { Platform, StyleSheet, Text, View } from "react-native";

import { PressScale } from "@/components/ui/PressScale";
import { TextButton } from "@/components/ui/Button";
import { COPY } from "@/lib/copy";
import {
  dateToHHmm,
  formatDisplayDuration,
  hhmmToDate,
  isHHmm,
  type TimePickerFieldProps,
} from "@/lib/datetime";
import {
  Colors,
  Gap,
  Radius,
  Size,
  Space,
  typeStyle,
} from "@/lib/theme";

/**
 * iOS: spinning wheels (same idea as setting an alarm).
 * Android: the round clock face.
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
      <PressScale
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((current) => !current)}
        haptic="light"
        style={[styles.field, error ? styles.fieldError : null]}
      >
        <Text style={styles.fieldText}>
          {isHHmm(value)
            ? `${value} (${formatDisplayDuration(value)})`
            : COPY.pickTime}
        </Text>
      </PressScale>
      {leftoverText ? (
        <Text style={styles.warning}>
          {COPY.timePickerLegacy.replace("{value}", leftoverText)}
        </Text>
      ) : null}
      {open ? (
        <View style={styles.sheet}>
          <DateTimePicker
            value={selected}
            mode="time"
            display={Platform.OS === "ios" ? "spinner" : "clock"}
            is24Hour
            minuteInterval={5}
            onChange={onPickerChange}
            themeVariant="light"
            accentColor={Colors.orange}
          />
          {Platform.OS === "ios" ? (
            <TextButton title={COPY.pickerDone} onPress={() => setOpen(false)} />
          ) : null}
        </View>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: Space.lg,
    width: "100%",
    gap: Gap.labelToField,
  },
  label: {
    ...typeStyle("cardTitle"),
    color: Colors.ink,
  },
  hint: {
    ...typeStyle("secondary"),
    color: Colors.muted,
  },
  field: {
    minHeight: Size.input,
    justifyContent: "center",
    borderRadius: Radius.input,
    borderWidth: 1.5,
    borderColor: Colors.line,
    backgroundColor: Colors.white,
    paddingHorizontal: Space.md,
  },
  fieldError: {
    borderColor: Colors.red,
  },
  fieldText: {
    ...typeStyle("body"),
    color: Colors.ink,
  },
  sheet: {
    alignItems: "center",
    borderRadius: Radius.input,
    backgroundColor: Colors.white,
    paddingVertical: Space.sm,
    paddingHorizontal: Space.sm,
  },
  warning: {
    ...typeStyle("secondary"),
    color: Colors.amber,
  },
  error: {
    ...typeStyle("secondary"),
    color: Colors.red,
  },
});
