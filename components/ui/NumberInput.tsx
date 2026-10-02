import { Pressable, StyleSheet, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { TextInput } from "@/components/ui/TextInput";
import { Colors, Radius, Size, Space } from "@/lib/theme";

type NumberInputProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  onBlur?: () => void;
  error?: string;
  placeholder?: string;
  hint?: string;
  step?: number;
};

function parseSafe(text: string): number | null {
  const n = Number(text);
  if (!Number.isFinite(n)) {
    return null;
  }
  return n;
}

/**
 * Number field that still stores text so a half-typed value never becomes NaN.
 * +/- buttons nudge by `step` (default 1). Validation happens with zod on save.
 */
export function NumberInput({
  label,
  value,
  onChangeText,
  onBlur,
  error,
  placeholder,
  hint,
  step = 1,
}: NumberInputProps) {
  const nudge = (direction: 1 | -1) => {
    const current = parseSafe(value) ?? 0;
    const next = current + direction * step;
    onChangeText(String(next));
  };

  return (
    <View>
      <TextInput
        label={label}
        value={value}
        onChangeText={onChangeText}
        onBlur={onBlur}
        error={error}
        hint={hint}
        placeholder={placeholder}
        keyboardType="decimal-pad"
        autoCapitalize="none"
        accessibilityLabel={label}
      />
      <View style={styles.steppers}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Decrease ${label}`}
          onPress={() => nudge(-1)}
          style={styles.stepBtn}
        >
          <Feather name="minus" size={18} color={Colors.orange} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Increase ${label}`}
          onPress={() => nudge(1)}
          style={styles.stepBtn}
        >
          <Feather name="plus" size={18} color={Colors.orange} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  steppers: {
    flexDirection: "row",
    justifyContent: "flex-end",
    // Section 10: never two interactive elements closer than 12px.
    gap: Space.sm,
    marginTop: Space.sm,
  },
  stepBtn: {
    minWidth: Size.tap,
    minHeight: Size.tap,
    borderRadius: Radius.input,
    borderWidth: 1.5,
    borderColor: Colors.line,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
});
