import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { TextInput } from "@/components/ui/TextInput";
import { colors, radius, tapTarget } from "@/lib/design-tokens";
import { fontFamily } from "@/lib/typography";

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
          <Feather name="minus" size={18} color={colors.deepTeal} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Increase ${label}`}
          onPress={() => nudge(1)}
          style={styles.stepBtn}
        >
          <Feather name="plus" size={18} color={colors.deepTeal} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  steppers: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 8,
  },
  stepBtn: {
    minWidth: tapTarget,
    minHeight: tapTarget,
    borderRadius: radius.input,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
});
