import { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput as RNTextInput,
  View,
  type TextInputProps as RNTextInputProps,
} from "react-native";

import { IconButton } from "@/components/ui/Button";
import { colors, inputHeight, radius, shadows } from "@/lib/design-tokens";
import { fontFamily } from "@/lib/typography";

type FieldProps = RNTextInputProps & {
  label: string;
  error?: string;
  hint?: string;
};

/**
 * Standard text field: label above, 56px box, teal glow when focused.
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
          placeholderTextColor={colors.mist}
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
    fontFamily: fontFamily.bodyMedium,
    fontSize: 12,
    letterSpacing: 0.2,
    color: colors.slate,
    marginBottom: 8,
  },
  hint: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.midTeal,
    marginBottom: 8,
  },
  input: {
    minHeight: inputHeight,
    borderRadius: radius.input,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    fontFamily: fontFamily.body,
    fontSize: 15,
    color: colors.charcoal,
  },
  inputWithEye: {
    paddingRight: 52,
  },
  eye: {
    position: "absolute",
    right: 4,
    top: 6,
  },
  inputFocus: {
    borderColor: colors.midTeal,
    ...shadows.focusGlow,
  },
  inputError: {
    borderColor: colors.coral,
  },
  error: {
    marginTop: 8,
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.coral,
  },
});
