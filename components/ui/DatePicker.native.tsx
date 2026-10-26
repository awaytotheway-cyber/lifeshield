import { useState } from "react";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { COPY } from "@/lib/copy";
import { colors, controlHeight, radius, status, tapTarget } from "@/lib/design-tokens";
import {
  formatDisplayDate,
  isoToLocalDate,
  localDateToIso,
  todayLocalDate,
  type DatePickerFieldProps,
} from "@/lib/datetime";
import { isValidIsoCalendarDate } from "@/lib/questionnaire/numbers";
import { typography } from "@/lib/typography";

/** Clay, borrowed from `worthDiscussing` — Moss has no red for errors. */
const CLAY = status.worthDiscussing.text;

/**
 * Native date field. Opens a bottom sheet (iOS) or the system calendar
 * (Android). The closed field takes the same no-box, ink-rule shape as every
 * other input; the sheet is a plain white panel with no blur or shadow.
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
  const [open, setOpen] = useState(false);
  const parsed = isoToLocalDate(value);
  const selected = parsed ?? todayLocalDate();
  const hasCalendarValue = parsed !== null;
  const leftoverText = value && !hasCalendarValue ? value : null;

  const onPickerChange = (event: DateTimePickerEvent, next?: Date) => {
    if (Platform.OS === "android") {
      setOpen(false);
    }
    if (event.type === "dismissed" || !next) {
      return;
    }
    onChange(localDateToIso(next));
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
        <Text style={hasCalendarValue ? styles.value : styles.placeholder}>
          {hasCalendarValue ? formatDisplayDate(value) : COPY.pickDate}
        </Text>
        <Feather name="calendar" size={18} color={colors.inkSoft} />
      </Pressable>
      {leftoverText ? (
        <Text style={styles.warn}>
          {COPY.datePickerLegacy.replace("{value}", leftoverText)}
        </Text>
      ) : null}

      {Platform.OS === "android" && open ? (
        <DateTimePicker
          value={selected}
          mode="date"
          display="calendar"
          onChange={onPickerChange}
          maximumDate={maximumDate}
          minimumDate={minimumDate}
        />
      ) : null}

      {Platform.OS === "ios" ? (
        <Modal
          visible={open}
          animationType="slide"
          transparent
          onRequestClose={() => setOpen(false)}
        >
          <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
            <Pressable style={styles.sheet} onPress={() => undefined}>
              <SafeAreaView edges={["bottom"]}>
                <DateTimePicker
                  value={selected}
                  mode="date"
                  display="inline"
                  onChange={onPickerChange}
                  maximumDate={maximumDate}
                  minimumDate={minimumDate}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={COPY.pickerDone}
                  onPress={() => setOpen(false)}
                  style={styles.done}
                >
                  <Text style={styles.doneText}>{COPY.pickerDone}</Text>
                </Pressable>
              </SafeAreaView>
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}

      {hasCalendarValue && !isValidIsoCalendarDate(value) ? (
        <Text style={styles.error}>{COPY.dateInvalid}</Text>
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
    color: colors.inkSoft,
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
    justifyContent: "space-between",
  },
  value: {
    ...typography.body,
    color: colors.ink,
    flex: 1,
  },
  placeholder: {
    ...typography.body,
    color: colors.inkSoft,
    flex: 1,
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
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    // Ink at 28% — the dim is the ground colour, not a tinted wash.
    backgroundColor: "rgba(12,12,10,0.28)",
  },
  // A plain white panel: no blur behind it and no shadow under it.
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.surface,
    borderTopRightRadius: radius.surface,
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  done: {
    minHeight: tapTarget,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    marginBottom: 8,
  },
  // The sheet's only action is tertiary, so it is an underlined link.
  doneText: {
    ...typography.body,
    color: colors.ink,
    textDecorationLine: "underline",
  },
});
