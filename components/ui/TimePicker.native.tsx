import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useState } from "react";
import { Platform, Pressable, View } from "react-native";

import { BodySmall, BodyText, ErrorText } from "@/components/ui/Typography";
import { COPY } from "@/lib/copy";
import {
  dateToHHmm,
  formatDisplayDuration,
  hhmmToDate,
  isHHmm,
  type TimePickerFieldProps,
} from "@/lib/datetime";
import { colors } from "@/lib/design-tokens";

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
      <BodyText>{label}</BodyText>
      {hint ? <BodySmall className="mt-1" style={{ color: colors.charcoal }}>{hint}</BodySmall> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={() => setOpen((current) => !current)}
        className="mt-2 rounded-xl border border-border bg-white px-4 py-3"
      >
        <BodyText>
          {isHHmm(value)
            ? `${value} (${formatDisplayDuration(value)})`
            : COPY.pickTime}
        </BodyText>
      </Pressable>
      {leftoverText ? (
        <ErrorText className="mt-1">
          {COPY.timePickerLegacy.replace("{value}", leftoverText)}
        </ErrorText>
      ) : null}
      {open ? (
        <View className="mt-2 items-center rounded-2xl bg-white px-2 py-2">
          <DateTimePicker
            value={selected}
            mode="time"
            display={Platform.OS === "ios" ? "spinner" : "clock"}
            is24Hour
            minuteInterval={5}
            onChange={onPickerChange}
            themeVariant="light"
            accentColor={colors.primaryBlue}
          />
          {Platform.OS === "ios" ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => setOpen(false)}
              className="mt-2 items-center px-4 py-2"
            >
              <BodyText style={{ color: colors.primaryBlue }}>{COPY.pickerDone}</BodyText>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      {error ? <ErrorText className="mt-1">{error}</ErrorText> : null}
    </View>
  );
}
