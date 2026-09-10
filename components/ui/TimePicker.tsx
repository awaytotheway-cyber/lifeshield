import { Text, View } from "react-native";

import { COPY } from "@/lib/copy";
import {
  formatDisplayDuration,
  isHHmm,
  toInputHHmm,
  type TimePickerFieldProps,
} from "@/lib/datetime";

/**
 * Default (web) time field. On iPhone Safari this is the alarm-style clock.
 * Phones use TimePicker.native.tsx instead.
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
    <View className="mt-4">
      <Text className="text-charcoal">{label}</Text>
      {hint ? <Text className="mt-1 text-sm text-charcoal">{hint}</Text> : null}
      <input
        type="time"
        aria-label={label}
        value={clockValue}
        step={300}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        style={{
          marginTop: 8,
          width: "100%",
          minHeight: 48,
          padding: 12,
          borderRadius: 12,
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: "#A8C5A0",
          backgroundColor: "#FFFFFF",
          color: "#2D3436",
          fontSize: 16,
        }}
      />
      {isHHmm(clockValue) ? (
        <Text className="mt-1 text-sm text-teal">
          {formatDisplayDuration(clockValue)}
        </Text>
      ) : null}
      {leftoverText ? (
        <Text className="mt-1 text-sm text-coral">
          {COPY.timePickerLegacy.replace("{value}", leftoverText)}
        </Text>
      ) : null}
      {error ? <Text className="mt-1 text-coral">{error}</Text> : null}
    </View>
  );
}
