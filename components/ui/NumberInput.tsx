import { Pressable, StyleSheet, Text, View } from "react-native";
import { Icon } from "@/components/specimen/Icon";

import { TextInput } from "@/components/ui/TextInput";
import { Accent, Edge, Ink, Paper, tapTarget } from "@/lib/specimen-tokens";

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
          <Icon name="minus" size={18} color={Accent.tag} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Increase ${label}`}
          onPress={() => nudge(1)}
          style={styles.stepBtn}
        >
          <Icon name="plus" size={18} color={Accent.tag} />
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
    borderRadius: Edge.none,
    borderWidth: 1.5,
    borderColor: Ink.rule,
    backgroundColor: Paper.mount,
    alignItems: "center",
    justifyContent: "center",
  },
});
