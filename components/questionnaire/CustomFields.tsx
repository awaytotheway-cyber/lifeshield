import { useCallback, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { CheckboxGroup } from "@/components/ui/CheckboxGroup";
import { RadioGroup } from "@/components/ui/RadioGroup";
import { TextField } from "@/components/ui/TextField";
import {
  CUSTOM_ANSWER_PREFIX,
  customAnswerKey,
  customFieldsFor,
  type ContentField,
} from "@/lib/app-content";
import { useAppContent } from "@/lib/content-context";
import { colors, spacing } from "@/lib/design-tokens";
import { fontFamily } from "@/lib/typography";

export type CustomAnswers = Record<string, unknown>;

/**
 * Holds answers to admin-added questions for one section.
 *
 * Answers live in the same section JSONB as the built-in ones but under a
 * "custom:" prefix, so an admin can never pick a key that shadows something
 * lib/rules-facts.ts reads.
 */
export function useCustomAnswers(initial?: CustomAnswers | null) {
  const [answers, setAnswers] = useState<CustomAnswers>({});
  const [hydrated, setHydrated] = useState(false);

  const hydrate = useCallback((json: CustomAnswers | null | undefined) => {
    const next: CustomAnswers = {};
    if (json) {
      for (const [key, value] of Object.entries(json)) {
        if (key.startsWith(CUSTOM_ANSWER_PREFIX)) {
          next[key] = value;
        }
      }
    }
    setAnswers(next);
    setHydrated(true);
  }, []);

  const setAnswer = useCallback((fieldKey: string, value: unknown) => {
    setAnswers((prev) => ({ ...prev, [customAnswerKey(fieldKey)]: value }));
  }, []);

  // Spread into the section payload right before save.
  const toJson = useCallback((): CustomAnswers => ({ ...answers }), [answers]);

  useMemo(() => {
    if (!hydrated && initial) {
      hydrate(initial);
    }
  }, [hydrated, initial, hydrate]);

  return { answers, setAnswer, hydrate, toJson };
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: ContentField;
  value: unknown;
  onChange: (next: unknown) => void;
}) {
  const options = field.options.map((option) => ({
    value: option.value,
    label: option.label,
  }));

  switch (field.field_type) {
    case "yes_no":
    case "yes_no_unsure":
    case "single_select":
      return (
        <RadioGroup
          label={field.label}
          options={options}
          value={typeof value === "string" ? value : undefined}
          onChange={onChange}
        />
      );
    case "multi_select":
      return (
        <CheckboxGroup
          label={field.label}
          options={options}
          values={Array.isArray(value) ? (value as string[]) : []}
          onChange={onChange}
        />
      );
    case "number":
      return (
        <TextField
          label={field.label}
          value={value == null ? "" : String(value)}
          onChangeText={onChange}
          keyboardType="numeric"
        />
      );
    case "text":
    default:
      return (
        <TextField
          label={field.label}
          value={value == null ? "" : String(value)}
          onChangeText={onChange}
        />
      );
  }
}

/**
 * Renders the questions an admin added to this section. Nothing here is read
 * by the rules engine, so these are plain inputs with no clinical validation
 * beyond "required".
 */
export function CustomFields({
  section,
  answers,
  setAnswer,
}: {
  section: string;
  answers: CustomAnswers;
  setAnswer: (fieldKey: string, value: unknown) => void;
}) {
  const content = useAppContent();
  const fields = customFieldsFor(content, section);

  if (fields.length === 0) {
    return null;
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>Additional questions</Text>
      {fields.map((field) => (
        <View key={field.field_key} style={styles.field}>
          <FieldInput
            field={field}
            value={answers[customAnswerKey(field.field_key)]}
            onChange={(next) => setAnswer(field.field_key, next)}
          />
          {field.help_text ? (
            <Text style={styles.help}>{field.help_text}</Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: spacing.md,
    gap: spacing.base,
  },
  heading: {
    fontFamily: fontFamily.displaySemi,
    fontSize: 16,
    lineHeight: 22,
    color: colors.deepNavy,
  },
  field: {
    gap: 4,
  },
  help: {
    fontFamily: fontFamily.body,
    fontSize: 12,
    lineHeight: 16,
    color: colors.slate,
  },
});
