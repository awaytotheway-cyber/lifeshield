import { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput as RNTextInput,
  View,
  type TextInputProps as RNTextInputProps,
} from "react-native";

import { IconButton } from "@/components/ui/Button";
import { Accent, Edge, Ink, inputHeight, Paper, Rule, SpecimenType, TRACK } from "@/lib/specimen-tokens";

type FieldProps = RNTextInputProps & {
  label: string;
  error?: string;
  hint?: string;
};

/**
 * Standard text field: label above, 56px box, the rule darkens on focus.
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
          placeholderTextColor={Ink.ghost}
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
    fontFamily: SpecimenType.mono,
    fontSize: SpecimenType.annotation,
    letterSpacing: TRACK.label,
    color: Ink.faint,
    marginBottom: 7,
  },
  hint: {
    fontFamily: SpecimenType.mono,
    fontSize: SpecimenType.annotation,
    lineHeight: 17,
    color: Ink.faint,
    marginBottom: 8,
  },
  input: {
    minHeight: inputHeight,
    borderRadius: 0,
    borderWidth: 0,
    borderBottomWidth: Rule.medium,
    borderBottomColor: Ink.ruleStrong,
    backgroundColor: Paper.mount,
    paddingHorizontal: 12,
    fontFamily: SpecimenType.mono,
    fontSize: SpecimenType.body,
    color: Ink.full,
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
    borderBottomColor: Ink.full,
    backgroundColor: Paper.sheetDeep,
  },
  inputError: {
    borderBottomColor: Accent.tag,
  },
  error: {
    marginTop: 7,
    fontFamily: SpecimenType.mono,
    fontSize: SpecimenType.annotation,
    color: Accent.tag,
  },
});
