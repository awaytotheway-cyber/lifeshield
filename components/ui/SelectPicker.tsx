import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Icon } from "@/components/specimen/Icon";
import { SafeAreaView } from "react-native-safe-area-context";

import { LabelRow } from "@/components/ui/WhyAskSheet";
import { COPY } from "@/lib/copy";
import { Accent, Edge, Ink, inputHeight, Paper, SpecimenType } from "@/lib/specimen-tokens";

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

/**
 * Bottom-sheet list (not a native dropdown). Tap the chosen row again to clear it.
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
        <Icon name="chevron-down" size={20} color={Ink.soft} />
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
                        <Icon name="check" size={20} color={Accent.tag} />
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
    fontFamily: SpecimenType.mono,
    fontSize: 14,
    letterSpacing: 0.2,
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
    paddingHorizontal: 20,
    paddingTop: 8,
    maxHeight: "70%",
  },
  sheetHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Ink.rule,
    marginBottom: 12,
  },
  sheetTitle: {
    fontFamily: SpecimenType.monoBold,
    fontSize: 19,
    color: Ink.full,
    marginBottom: 8,
  },
  sheetScroll: {
    maxHeight: 360,
  },
  row: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: Ink.rule,
  },
  rowOn: {
    backgroundColor: Accent.tagWash,
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  rowLabel: {
    fontFamily: SpecimenType.mono,
    fontSize: 17,
    color: Ink.full,
  },
});
