import { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput as RNTextInput,
  View,
  type TextInputProps as RNTextInputProps,
} from "react-native";

import { IconButton } from "@/components/ui/Button";
import { colors, controlHeight, status } from "@/lib/design-tokens";
import { fontFamily, typography } from "@/lib/typography";

type FieldProps = RNTextInputProps & {
  label: string;
  error?: string;
  hint?: string;
};

/** Errors borrow the clay of `worthDiscussing`. Moss has no red. */
const CLAY = status.worthDiscussing.text;

/**
 * The Moss text field: a 13px label, 56px of room, and a rule underneath.
 *
 * There is no box. A field is marked by the 1.5px ink rule along its bottom
 * edge, which thickens to 2px while focused and turns clay on an error — so
 * focus and error read without a border, a shadow or a glow anywhere.
 */
export function TextInput({
  label,
  error,
  hint,
  onFocus,
  onBlur,
  style,
  secureTextEntry,
  ...rest
}: FieldProps) {
  const [focused, setFocused] = useState(false);
  const [passwordHidden, setPasswordHidden] = useState(true);
  const hasError = Boolean(error);
  const showEye = Boolean(secureTextEntry);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      <View>
        <RNTextInput
          accessibilityLabel={label}
          placeholderTextColor={colors.inkSoft}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry={showEye ? passwordHidden : false}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          style={[
            styles.input,
            showEye ? styles.inputWithEye : null,
            focused && !hasError ? styles.inputFocus : null,
            hasError ? styles.inputError : null,
            style,
          ]}
          {...rest}
        />
        {showEye ? (
          <View style={styles.eye}>
            <IconButton
              icon={passwordHidden ? "eye-off" : "eye"}
              accessibilityLabel={passwordHidden ? "Show password" : "Hide password"}
              onPress={() => setPasswordHidden((current) => !current)}
            />
          </View>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

/** Older screens import this name. Same component. */
export function TextField(props: FieldProps) {
  return <TextInput {...props} />;
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 16,
    width: "100%",
  },
  label: {
    ...typography.label,
    color: colors.inkSoft,
    marginBottom: 4,
  },
  hint: {
    ...typography.label,
    color: colors.inkSoft,
    marginBottom: 4,
  },
  input: {
    minHeight: controlHeight,
    // No box: the rule under the field is the whole affordance. Keeping the
    // bottom border alone means focus can thicken it without the text ever
    // shifting sideways.
    borderBottomWidth: 1.5,
    borderBottomColor: colors.ink,
    backgroundColor: "transparent",
    paddingHorizontal: 0,
    fontFamily: fontFamily.body,
    fontSize: 15,
    color: colors.ink,
  },
  inputWithEye: {
    paddingRight: 52,
  },
  eye: {
    position: "absolute",
    right: 0,
    top: 6,
  },
  inputFocus: {
    borderBottomWidth: 2,
  },
  inputError: {
    borderBottomColor: CLAY,
  },
  error: {
    marginTop: 8,
    ...typography.label,
    color: CLAY,
  },
});
