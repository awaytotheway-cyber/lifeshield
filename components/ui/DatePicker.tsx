import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { COPY } from "@/lib/copy";
import { colors, inputHeight, radius } from "@/lib/design-tokens";
import {
  localDateToIso,
  type DatePickerFieldProps,
} from "@/lib/datetime";
import { isValidIsoCalendarDate } from "@/lib/questionnaire/numbers";
import { fontFamily } from "@/lib/typography";

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
          minHeight: inputHeight,
          padding: 12,
          borderRadius: radius.input,
          borderWidth: 1.5,
          borderStyle: "solid",
          borderColor: colors.border,
          backgroundColor: colors.white,
          color: colors.inkOnLight,
          fontSize: 15,
          fontFamily: "Manrope, system-ui, sans-serif",
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
    marginTop: 16,
  },
  label: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 12,
    letterSpacing: 0.2,
    color: colors.slate,
    marginBottom: 8,
  },
  hint: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.slate,
    marginBottom: 8,
  },
  warn: {
    marginTop: 8,
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.coral,
  },
  error: {
    marginTop: 8,
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.coral,
  },
});
