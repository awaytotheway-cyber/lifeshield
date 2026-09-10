import { useState } from "react";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { Platform, Pressable, Text, View } from "react-native";

import { COPY } from "@/lib/copy";
import {
  dateToHHmm,
  formatDisplayDuration,
  hhmmToDate,
  isHHmm,
  type TimePickerFieldProps,
} from "@/lib/datetime";

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
    <View className="mt-4">
      <Text className="text-charcoal">{label}</Text>
      {hint ? <Text className="mt-1 text-sm text-charcoal">{hint}</Text> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={() => setOpen((current) => !current)}
        className="mt-2 rounded-xl border border-sage bg-white px-4 py-3"
      >
        <Text className="text-charcoal">
          {isHHmm(value)
            ? `${value} (${formatDisplayDuration(value)})`
            : COPY.pickTime}
        </Text>
      </Pressable>
      {leftoverText ? (
        <Text className="mt-1 text-sm text-coral">
          {COPY.timePickerLegacy.replace("{value}", leftoverText)}
        </Text>
      ) : null}
      {open ? (
        <View className="mt-2 items-center rounded-xl bg-white px-2 py-2">
          <DateTimePicker
            value={selected}
            mode="time"
            display={Platform.OS === "ios" ? "spinner" : "clock"}
            is24Hour
            minuteInterval={5}
            onChange={onPickerChange}
            themeVariant="light"
            accentColor="#1A535C"
          />
          {Platform.OS === "ios" ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => setOpen(false)}
              className="mt-2 items-center px-4 py-2"
            >
              <Text className="text-teal">{COPY.pickerDone}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      {error ? <Text className="mt-1 text-coral">{error}</Text> : null}
    </View>
  );
}
