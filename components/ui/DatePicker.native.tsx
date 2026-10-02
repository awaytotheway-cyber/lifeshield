import { useState } from "react";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { PressScale } from "@/components/ui/PressScale";
import { COPY } from "@/lib/copy";
import {
  formatDisplayDate,
  isoToLocalDate,
  localDateToIso,
  todayLocalDate,
  type DatePickerFieldProps,
} from "@/lib/datetime";
import { isValidIsoCalendarDate } from "@/lib/questionnaire/numbers";
import {
  Colors,
  Gap,
  Radius,
  Shadow,
  Size,
  Space,
  typeStyle,
} from "@/lib/theme";

/**
 * Native date field. Opens a bottom sheet (iOS) or the system calendar (Android).
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
      <PressScale
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={() => setOpen((current) => !current)}
        haptic="light"
        style={[styles.field, error ? styles.fieldError : null]}
      >
        <Text style={hasCalendarValue ? styles.value : styles.placeholder}>
          {hasCalendarValue ? formatDisplayDate(value) : COPY.pickDate}
        </Text>
        <Feather name="calendar" size={20} color={Colors.muted} />
      </PressScale>
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
                <View style={styles.sheetHandle} />
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
  field: {
    minHeight: Size.input,
    borderRadius: Radius.input,
    borderWidth: 1.5,
    borderColor: Colors.line,
    backgroundColor: Colors.white,
    paddingHorizontal: Space.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  fieldError: {
    borderColor: Colors.red,
  },
  value: {
    ...typeStyle("body"),
    color: Colors.ink,
    flex: 1,
  },
  placeholder: {
    ...typeStyle("body"),
    color: Colors.faint,
    flex: 1,
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
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(31,27,24,0.35)",
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius.sheet,
    borderTopRightRadius: Radius.sheet,
    paddingHorizontal: Space.md,
    paddingTop: Space.sm,
    ...Shadow.lift,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.line,
    marginBottom: Space.md,
  },
  done: {
    minHeight: Size.tap,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Space.sm,
    marginBottom: Space.sm,
  },
  doneText: {
    ...typeStyle("cardTitle"),
    color: Colors.orange,
  },
});
