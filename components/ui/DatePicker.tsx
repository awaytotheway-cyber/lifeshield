import { StyleSheet, Text, View } from "react-native";

import { COPY } from "@/lib/copy";
import {
  localDateToIso,
  type DatePickerFieldProps,
} from "@/lib/datetime";
import { isValidIsoCalendarDate } from "@/lib/questionnaire/numbers";
import { Colors, Font, Gap, Radius, Size, Space, Type, typeStyle } from "@/lib/theme";

/**
 * Default (web) date field. On iPhone Safari this is the system calendar.
 * Phones use DatePicker.native.tsx instead.
 */
export function DatePicker({
  label,
  value,
  onChange,
  error,
  hint,
  maximumDate,
  minimumDate,
}: DatePickerFieldProps) {
  const calendarValue = isValidIsoCalendarDate(value) ? value : "";
  const leftoverText = value && !calendarValue ? value : null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      <input
        type="date"
        aria-label={label}
        value={calendarValue}
        max={maximumDate ? localDateToIso(maximumDate) : undefined}
        min={minimumDate ? localDateToIso(minimumDate) : undefined}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        style={{
          marginTop: 0,
          width: "100%",
          minHeight: Size.input,
          padding: Space.md,
          borderRadius: Radius.input,
          borderWidth: 1.5,
          borderStyle: "solid",
          borderColor: error ? Colors.red : Colors.line,
          backgroundColor: Colors.white,
          color: Colors.ink,
          fontSize: Type.body.size,
          lineHeight: `${Type.body.lineHeight}px`,
          fontFamily: `${Font.regular}, Inter, system-ui, sans-serif`,
          boxSizing: "border-box",
        }}
      />
      {leftoverText ? (
        <Text style={styles.warn}>
          {COPY.datePickerLegacy.replace("{value}", leftoverText)}
        </Text>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: Space.lg,
  },
  label: {
    ...typeStyle("cardTitle"),
    color: Colors.ink,
    marginBottom: Gap.labelToField,
  },
  hint: {
    ...typeStyle("secondary"),
    color: Colors.muted,
    marginBottom: Gap.labelToField,
  },
  warn: {
    ...typeStyle("secondary"),
    marginTop: Space.sm,
    color: Colors.red,
  },
  error: {
    ...typeStyle("secondary"),
    marginTop: Space.sm,
    color: Colors.red,
  },
});
