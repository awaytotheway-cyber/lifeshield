import assert from "node:assert/strict";

import {
  EMPTY_CONTENT,
  customAnswerKey,
  customFieldsFor,
  indexContentFields,
  resolveCopy,
  resolveHelpText,
  resolveLabel,
  resolveOptionLabel,
  type AppContent,
  type ContentField,
} from "./app-content";

function field(over: Partial<ContentField>): ContentField {
  return {
    section: "comorbidities",
    field_key: "gallstones",
    label: "Gallstones",
    help_text: null,
    field_type: "yes_no",
    options: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" },
    ],
    sort_order: 10,
    required: true,
    is_locked: true,
    is_active: true,
    ...over,
  };
}

function content(rows: ContentField[], copy: Record<string, string> = {}): AppContent {
  return { fields: indexContentFields(rows), copy, revision: 1 };
}

// ---- indexing ----
const indexed = indexContentFields([
  field({}),
  field({ field_key: "diabetes", label: "Diabetes" }),
  field({ field_key: "hidden", is_active: false }),
]);
assert.equal(Object.keys(indexed.comorbidities).length, 2, "inactive rows dropped");
assert.equal(indexed.comorbidities.gallstones.label, "Gallstones");

// ---- resolveLabel ----
const c = content([field({ label: "Have you had gallstones?" })]);
assert.equal(
  resolveLabel(c, "comorbidities", "gallstones", "Gallstones"),
  "Have you had gallstones?",
  "admin wording wins",
);
assert.equal(
  resolveLabel(c, "comorbidities", "unknown_key", "Fallback"),
  "Fallback",
  "unknown key falls back",
);
assert.equal(
  resolveLabel(EMPTY_CONTENT, "comorbidities", "gallstones", "Gallstones"),
  "Gallstones",
  "empty content falls back",
);
// A blank override must not wipe the shipped label.
assert.equal(
  resolveLabel(content([field({ label: "   " })]), "comorbidities", "gallstones", "Gallstones"),
  "Gallstones",
  "blank override ignored",
);

// ---- help text ----
assert.equal(
  resolveHelpText(content([field({ help_text: "Stones in the gallbladder." })]), "comorbidities", "gallstones"),
  "Stones in the gallbladder.",
);
assert.equal(resolveHelpText(EMPTY_CONTENT, "comorbidities", "gallstones"), null);

// ---- option labels ----
const withOptions = content([
  field({
    options: [
      { value: "yes", label: "Yes, diagnosed" },
      { value: "no", label: "No" },
    ],
  }),
]);
assert.equal(
  resolveOptionLabel(withOptions, "comorbidities", "gallstones", "yes", "Yes"),
  "Yes, diagnosed",
);
// Value the admin cannot remove on a locked row, but guard anyway.
assert.equal(
  resolveOptionLabel(withOptions, "comorbidities", "gallstones", "maybe", "Maybe"),
  "Maybe",
);
assert.equal(
  resolveOptionLabel(EMPTY_CONTENT, "comorbidities", "gallstones", "yes", "Yes"),
  "Yes",
);

// ---- custom (admin-added) fields ----
const mixed = content([
  field({}),
  field({ field_key: "b_extra", label: "B", is_locked: false, sort_order: 20 }),
  field({ field_key: "a_extra", label: "A", is_locked: false, sort_order: 5 }),
  field({ field_key: "off_extra", label: "Off", is_locked: false, is_active: false }),
]);
const custom = customFieldsFor(mixed, "comorbidities");
assert.deepEqual(
  custom.map((f) => f.field_key),
  ["a_extra", "b_extra"],
  "locked rows excluded, inactive excluded, sorted by sort_order",
);
assert.deepEqual(customFieldsFor(EMPTY_CONTENT, "comorbidities"), []);

// Namespacing keeps admin answers away from rules-engine keys.
assert.equal(customAnswerKey("gallstones"), "custom:gallstones");
assert.notEqual(customAnswerKey("gallstones"), "gallstones");

// ---- copy ----
const copyContent = content([], { welcomeTitle: "Hello there" });
assert.equal(resolveCopy(copyContent, "welcomeTitle", "Welcome"), "Hello there");
assert.equal(resolveCopy(copyContent, "missing", "Welcome"), "Welcome");
assert.equal(resolveCopy(content([], { welcomeTitle: "  " }), "welcomeTitle", "Welcome"), "Welcome");

console.log("app-content.test.ts passed");
