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
import { colors, inputHeight, radius, shadows } from "@/lib/design-tokens";
import { COPY } from "@/lib/copy";
import { fontFamily } from "@/lib/typography";

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
        <Feather name="chevron-down" size={20} color={colors.inkOnLightMuted} />
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
                        <Feather name="check" size={20} color={colors.midTeal} />
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
    fontFamily: fontFamily.bodyMedium,
    fontSize: 12,
    letterSpacing: 0.2,
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
    paddingHorizontal: 20,
    paddingTop: 8,
    maxHeight: "70%",
    ...shadows.modal,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderOnLight,
    marginBottom: 12,
  },
  sheetTitle: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 17,
    color: colors.inkOnLight,
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
    borderBottomColor: colors.borderOnLight,
  },
  rowOn: {
    backgroundColor: colors.lightTeal,
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  rowLabel: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 15,
    color: colors.inkOnLight,
  },
});
