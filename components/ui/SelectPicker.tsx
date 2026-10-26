import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { LabelRow } from "@/components/ui/WhyAskSheet";
import { colors, controlHeight, radius, status } from "@/lib/design-tokens";
import { COPY } from "@/lib/copy";
import { typography } from "@/lib/typography";

type Option = { value: string; label: string };

type SelectPickerProps = {
  label: string;
  options: readonly Option[];
  value?: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  whyAsk?: string;
};

/** Clay, borrowed from `worthDiscussing` — Moss has no red for errors. */
const CLAY = status.worthDiscussing.text;

/**
 * Bottom-sheet list (not a native dropdown). Tap the chosen row again to
 * clear it.
 *
 * The closed control is a text field by another name, so it wears the same
 * 56pt-and-a-rule shape; the sheet is a plain white panel with 52pt rows.
 */
export function SelectPicker({
  label,
  options,
  value,
  onChange,
  error,
  placeholder,
  whyAsk,
}: SelectPickerProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <View style={styles.wrap}>
      <LabelRow label={label} whyAsk={whyAsk} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={() => setOpen(true)}
        style={styles.field}
      >
        <Text style={selected ? styles.value : styles.placeholder}>
          {selected?.label ?? placeholder ?? COPY.pickOption}
        </Text>
        <Feather name="chevron-down" size={20} color={colors.inkSoft} />
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}

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
              <Text style={styles.sheetTitle}>{label}</Text>
              <ScrollView style={styles.sheetScroll}>
                {options.map((option) => {
                  const isOn = option.value === value;
                  return (
                    <Pressable
                      key={option.value}
                      accessibilityRole="button"
                      accessibilityLabel={option.label}
                      onPress={() => {
                        onChange(isOn ? "" : option.value);
                        setOpen(false);
                      }}
                      style={[styles.row, isOn ? styles.rowOn : null]}
                    >
                      <Text style={styles.rowLabel}>{option.label}</Text>
                      {isOn ? (
                        <Feather name="check" size={20} color={colors.mossDeep} />
                      ) : null}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </SafeAreaView>
          </Pressable>
        </Pressable>
      </Modal>
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
    paddingHorizontal: 20,
    paddingTop: 8,
    maxHeight: "70%",
  },
  sheetHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.hairline,
    marginBottom: 12,
  },
  sheetTitle: {
    ...typography.title,
    color: colors.ink,
    marginBottom: 8,
  },
  sheetScroll: {
    maxHeight: 360,
  },
  row: {
    minHeight: 52,
    borderRadius: radius.control,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowOn: {
    backgroundColor: colors.mossTint,
  },
  rowLabel: {
    ...typography.body,
    color: colors.ink,
  },
});
