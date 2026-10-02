import { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput as RNTextInput,
  View,
  type TextInputProps as RNTextInputProps,
} from "react-native";

import { IconButton } from "@/components/ui/Button";
import { Colors, Gap, Radius, Size, Space, typeStyle } from "@/lib/theme";

type FieldProps = RNTextInputProps & {
  label: string;
  error?: string;
  hint?: string;
};

/**
 * Standard text field: label above, 56px box with a 16px radius, warm border
 * that turns orange on focus.
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
          placeholderTextColor={Colors.faint}
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
              accessibilityLabel={
                passwordHidden ? "Show password" : "Hide password"
              }
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
    marginTop: Space.lg,
    width: "100%",
  },
  label: {
    ...typeStyle("cardTitle"),
    color: Colors.ink,
    marginBottom: Gap.labelToField,
  },
  hint: {
    ...typeStyle("secondary"),
    color: Colors.muted,
    marginBottom: Gap.labelToField,
  },
  input: {
    minHeight: Size.input,
    borderRadius: Radius.input,
    borderWidth: 1.5,
    borderColor: Colors.line,
    backgroundColor: Colors.white,
    paddingHorizontal: Space.md,
    ...typeStyle("body"),
    color: Colors.ink,
  },
  inputWithEye: {
    paddingRight: 60,
  },
  eye: {
    position: "absolute",
    right: 4,
    top: 4,
  },
  inputFocus: {
    borderColor: Colors.orange,
  },
  inputError: {
    borderColor: Colors.red,
  },
  error: {
    ...typeStyle("secondary"),
    marginTop: Space.sm,
    color: Colors.red,
  },
});
