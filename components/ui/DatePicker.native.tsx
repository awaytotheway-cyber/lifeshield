import { useState } from "react";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Icon } from "@/components/specimen/Icon";
import { SafeAreaView } from "react-native-safe-area-context";

import { COPY } from "@/lib/copy";
import {
  formatDisplayDate,
  isoToLocalDate,
  localDateToIso,
  todayLocalDate,
  type DatePickerFieldProps,
} from "@/lib/datetime";
import { isValidIsoCalendarDate } from "@/lib/questionnaire/numbers";
import { Accent, Edge, Ink, inputHeight, Paper, SpecimenType } from "@/lib/specimen-tokens";

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
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={() => setOpen((current) => !current)}
        style={styles.field}
      >
        <Text style={hasCalendarValue ? styles.value : styles.placeholder}>
          {hasCalendarValue ? formatDisplayDate(value) : COPY.pickDate}
        </Text>
        <Icon name="calendar" size={18} color={Ink.soft} />
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
    fontFamily: SpecimenType.mono,
    fontSize: 14,
    letterSpacing: 0.2,
    color: Ink.soft,
    marginBottom: 8,
  },
  hint: {
    fontFamily: SpecimenType.mono,
    fontSize: 15,
    color: Ink.soft,
    marginBottom: 8,
  },
  field: {
    minHeight: inputHeight,
    borderRadius: Edge.none,
    borderWidth: 1.5,
    borderColor: Ink.rule,
    backgroundColor: Paper.mount,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  value: {
    fontFamily: SpecimenType.mono,
    fontSize: 17,
    color: Ink.full,
    flex: 1,
  },
  placeholder: {
    fontFamily: SpecimenType.mono,
    fontSize: 17,
    color: Ink.faint,
    flex: 1,
  },
  warn: {
    marginTop: 8,
    fontFamily: SpecimenType.mono,
    fontSize: 15,
    color: Accent.tag,
  },
  error: {
    marginTop: 8,
    fontFamily: SpecimenType.mono,
    fontSize: 15,
    color: Accent.tag,
  },
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: Ink.scrim,
  },
  sheet: {
    backgroundColor: Paper.mount,
    borderTopLeftRadius: Edge.mount,
    borderTopRightRadius: Edge.mount,
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  done: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    marginBottom: 8,
  },
  doneText: {
    fontFamily: SpecimenType.monoBold,
    fontSize: 17,
    color: Accent.tag,
  },
});
