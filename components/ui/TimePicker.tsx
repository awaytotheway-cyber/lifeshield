import { StyleSheet, Text, View } from "react-native";

import { COPY } from "@/lib/copy";
import {
  formatDisplayDuration,
  isHHmm,
  toInputHHmm,
  type TimePickerFieldProps,
} from "@/lib/datetime";
import {
  Colors,
  Font,
  Gap,
  Radius,
  Size,
  Space,
  Type,
  typeStyle,
} from "@/lib/theme";

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
          width: "100%",
          minHeight: Size.input,
          padding: Space.md,
          borderRadius: Radius.input,
          borderWidth: 1.5,
          borderStyle: "solid",
          borderColor: error ? Colors.red : Colors.line,
          backgroundColor: Colors.white,
          color: Colors.ink,
          fontFamily: Font.regular,
          fontSize: Type.body.size,
        }}
      />
      {isHHmm(clockValue) ? (
        <Text style={styles.readout}>{formatDisplayDuration(clockValue)}</Text>
      ) : null}
      {leftoverText ? (
        <Text style={styles.warning}>
          {COPY.timePickerLegacy.replace("{value}", leftoverText)}
        </Text>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: Space.lg,
    width: "100%",
    // The raw <input> cannot take a RN gap, so the label carries the 10px.
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
  readout: {
    ...typeStyle("label"),
    color: Colors.orange,
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
