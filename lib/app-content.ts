/**
 * Types and pure helpers for admin-editable questionnaire wording and
 * onboarding copy.
 *
 * Two kinds of row come back from `content_fields`:
 *   locked  — a question the app renders from code. Admin edits the label,
 *             help text, and option labels; the key, type, and option values
 *             are frozen (enforced by a DB trigger). Screens look these up
 *             with resolveLabel() and fall back to their hardcoded string.
 *   unlocked — a question an admin added. Nothing in code knows about it, so
 *             it is rendered generically and stored in the section's JSONB
 *             under CUSTOM_ANSWER_PREFIX. The rules engine never reads these.
 */

export type ContentFieldType =
  | "yes_no"
  | "yes_no_unsure"
  | "single_select"
  | "multi_select"
  | "text"
  | "number";

export type ContentOption = {
  value: string;
  label: string;
};

export type ContentField = {
  section: string;
  field_key: string;
  label: string;
  help_text: string | null;
  field_type: ContentFieldType;
  options: ContentOption[];
  sort_order: number;
  required: boolean;
  is_locked: boolean;
  is_active: boolean;
};

/** section -> field_key -> field */
export type ContentFieldIndex = Record<string, Record<string, ContentField>>;

export type AppContent = {
  fields: ContentFieldIndex;
  copy: Record<string, string>;
  revision: number;
};

export const EMPTY_CONTENT: AppContent = {
  fields: {},
  copy: {},
  revision: 0,
};

/**
 * Admin-added answers are namespaced inside the existing section JSONB so
 * they cannot collide with a key the rules engine reads.
 */
export const CUSTOM_ANSWER_PREFIX = "custom:";

export function customAnswerKey(fieldKey: string): string {
  return `${CUSTOM_ANSWER_PREFIX}${fieldKey}`;
}

/** Shape rows from Supabase into the section/key index screens look up. */
export function indexContentFields(
  rows: readonly ContentField[],
): ContentFieldIndex {
  const index: ContentFieldIndex = {};
  for (const row of rows) {
    if (!row.is_active) {
      continue;
    }
    const section = index[row.section] ?? {};
    section[row.field_key] = row;
    index[row.section] = section;
  }
  return index;
}

/**
 * Admin wording for a question, or the string the screen already hardcodes.
 * Blank overrides are ignored so an empty admin field cannot wipe a label.
 */
export function resolveLabel(
  content: AppContent,
  section: string,
  fieldKey: string,
  fallback: string,
): string {
  const override = content.fields[section]?.[fieldKey]?.label;
  return typeof override === "string" && override.trim() !== ""
    ? override
    : fallback;
}

export function resolveHelpText(
  content: AppContent,
  section: string,
  fieldKey: string,
  fallback: string | null = null,
): string | null {
  const override = content.fields[section]?.[fieldKey]?.help_text;
  return typeof override === "string" && override.trim() !== ""
    ? override
    : fallback;
}

/** Admin wording for one option of a select, else the hardcoded label. */
export function resolveOptionLabel(
  content: AppContent,
  section: string,
  fieldKey: string,
  optionValue: string,
  fallback: string,
): string {
  const options = content.fields[section]?.[fieldKey]?.options;
  if (!Array.isArray(options)) {
    return fallback;
  }
  const match = options.find((option) => option.value === optionValue);
  return match && match.label.trim() !== "" ? match.label : fallback;
}

/** Questions an admin added to this section, in display order. */
export function customFieldsFor(
  content: AppContent,
  section: string,
): ContentField[] {
  const bySection = content.fields[section];
  if (!bySection) {
    return [];
  }
  return Object.values(bySection)
    .filter((field) => !field.is_locked && field.is_active)
    .sort((a, b) => a.sort_order - b.sort_order);
}

export function resolveCopy(
  content: AppContent,
  key: string,
  fallback: string,
): string {
  const override = content.copy[key];
  return typeof override === "string" && override.trim() !== ""
    ? override
    : fallback;
}
