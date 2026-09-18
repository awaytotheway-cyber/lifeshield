import { useState } from "react";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { COPY } from "@/lib/copy";
import { colors, inputHeight, radius, shadows } from "@/lib/design-tokens";
import {
  formatDisplayDate,
  isoToLocalDate,
  localDateToIso,
  todayLocalDate,
  type DatePickerFieldProps,
} from "@/lib/datetime";
import { isValidIsoCalendarDate } from "@/lib/questionnaire/numbers";
import { fontFamily } from "@/lib/typography";

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
        <Feather name="calendar" size={18} color={colors.inkOnLightMuted} />
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
  field: {
    minHeight: inputHeight,
    borderRadius: radius.input,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  value: {
    fontFamily: fontFamily.body,
    fontSize: 15,
    color: colors.inkOnLight,
    flex: 1,
  },
  placeholder: {
    fontFamily: fontFamily.body,
    fontSize: 15,
    color: colors.inkOnLightMuted,
    flex: 1,
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
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(13,74,92,0.28)",
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingHorizontal: 12,
    paddingTop: 12,
    ...shadows.modal,
  },
  done: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    marginBottom: 8,
  },
  doneText: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 15,
    color: colors.midTeal,
  },
});
