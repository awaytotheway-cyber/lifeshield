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
import { COPY } from "@/lib/copy";
import {
  Colors,
  Gap,
  Radius,
  Shadow,
  Size,
  Space,
  typeStyle,
} from "@/lib/theme";

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
        style={({ pressed }) => [
          styles.field,
          pressed ? styles.fieldPressed : null,
        ]}
      >
        <Text style={selected ? styles.value : styles.placeholder}>
          {selected?.label ?? placeholder ?? COPY.pickOption}
        </Text>
        <Feather name="chevron-down" size={20} color={Colors.muted} />
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
                        <Feather name="check" size={22} color={Colors.orange} />
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
    marginTop: Space.lg,
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
  fieldPressed: {
    borderColor: Colors.orange,
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
    paddingHorizontal: Space.cardPad,
    paddingTop: Space.sm,
    maxHeight: "70%",
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
  sheetTitle: {
    ...typeStyle("section"),
    color: Colors.ink,
    marginBottom: Space.sm,
  },
  sheetScroll: {
    maxHeight: 380,
  },
  row: {
    minHeight: Size.input,
    paddingVertical: Gap.rowY - 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.line,
  },
  rowOn: {
    backgroundColor: Colors.orangeTint,
    marginHorizontal: -Space.cardPad,
    paddingHorizontal: Space.cardPad,
  },
  rowLabel: {
    ...typeStyle("body"),
    color: Colors.ink,
    flex: 1,
    paddingRight: Space.sm,
  },
});
