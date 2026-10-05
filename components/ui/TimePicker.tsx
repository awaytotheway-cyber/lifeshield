import { View } from "react-native";

import { BodySmall, BodyText, ErrorText } from "@/components/ui/Typography";
import { COPY } from "@/lib/copy";
import {
  formatDisplayDuration,
  isHHmm,
  toInputHHmm,
  type TimePickerFieldProps,
} from "@/lib/datetime";
import { colors } from "@/lib/design-tokens";

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
      <BodyText>{label}</BodyText>
      {hint ? <BodySmall className="mt-1" style={{ color: colors.charcoal }}>{hint}</BodySmall> : null}
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
          borderColor: colors.border,
          backgroundColor: colors.white,
          color: colors.charcoal,
          fontSize: 16,
        }}
      />
      {isHHmm(clockValue) ? (
        <BodySmall className="mt-1" style={{ color: colors.primaryBlue }}>
          {formatDisplayDuration(clockValue)}
        </BodySmall>
      ) : null}
      {leftoverText ? (
        <ErrorText className="mt-1">
          {COPY.timePickerLegacy.replace("{value}", leftoverText)}
        </ErrorText>
      ) : null}
      {error ? <ErrorText className="mt-1">{error}</ErrorText> : null}
    </View>
  );
}
