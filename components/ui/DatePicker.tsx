import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { COPY } from "@/lib/copy";
import { colors, controlHeight, status } from "@/lib/design-tokens";
import {
  localDateToIso,
  type DatePickerFieldProps,
} from "@/lib/datetime";
import { isValidIsoCalendarDate } from "@/lib/questionnaire/numbers";
import { typography } from "@/lib/typography";

/** Clay, borrowed from `worthDiscussing` — Moss has no red for errors. */
const CLAY = status.worthDiscussing.text;

/**
 * Default (web) date field. On iPhone Safari this is the system calendar.
 * Phones use DatePicker.native.tsx instead.
 *
 * The native control keeps its own calendar, but the closed field is styled
 * to the same rule as every other input: no box, a 1.5px ink rule underneath.
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
    ...typography.label,
    color: colors.inkSoft,
    marginBottom: 4,
  },
  hint: {
    ...typography.label,
    color: colors.inkFaint,
    marginBottom: 4,
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
