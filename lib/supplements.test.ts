/**
 *   npx --yes tsx --tsconfig tsconfig.json lib/supplements.test.ts
 */
import assert from "node:assert/strict";
import {
  contraindicationWarnings,
  isSubscribable,
  parseSubscriptionOptions,
  parseSupportingStudies,
  validateMedicationDraft,
  type MedicationDraft,
  type MedicationLite,
} from "./supplements";

function med(
  overrides: Partial<MedicationLite> & { name: string; codes?: string[] },
): MedicationLite {
  return {
    id: overrides.id ?? `m-${overrides.name}`,
    name: overrides.name,
    contraindication_codes: overrides.codes ?? [],
    active: overrides.active ?? true,
  };
}

// ---------- contraindicationWarnings ----------

// No product codes → no warnings, regardless of medications.
{
  const warnings = contraindicationWarnings([], [
    med({ name: "OCP", codes: ["hormones"] }),
  ]);
  assert.deepEqual(warnings, []);
}

// Single overlap.
{
  const warnings = contraindicationWarnings(
    ["hormones", "blood_thinners"],
    [med({ name: "OCP", codes: ["hormones"] })],
  );
  assert.equal(warnings.length, 1);
  assert.equal(warnings[0].code, "hormones");
  assert.deepEqual(warnings[0].medication_names, ["OCP"]);
}

// Case-insensitive both sides.
{
  const warnings = contraindicationWarnings(
    ["HORMONES"],
    [med({ name: "OCP", codes: ["Hormones"] })],
  );
  assert.equal(warnings.length, 1);
  assert.equal(warnings[0].code, "hormones");
}

// Multiple medications hitting the same code collect into medication_names.
{
  const warnings = contraindicationWarnings(
    ["hormones"],
    [
      med({ name: "OCP", codes: ["hormones"] }),
      med({ name: "HRT patch", codes: ["hormones"] }),
    ],
  );
  assert.equal(warnings.length, 1);
  assert.deepEqual(warnings[0].medication_names, ["OCP", "HRT patch"]);
}

// Duplicate medication name deduped.
{
  const warnings = contraindicationWarnings(
    ["hormones"],
    [
      med({ id: "a", name: "OCP", codes: ["hormones"] }),
      med({ id: "b", name: "OCP", codes: ["hormones"] }),
    ],
  );
  assert.equal(warnings[0].medication_names.length, 1);
}

// Inactive medications don't warn.
{
  const warnings = contraindicationWarnings(
    ["hormones"],
    [med({ name: "Old OCP", codes: ["hormones"], active: false })],
  );
  assert.deepEqual(warnings, []);
}

// Multiple product codes with mixed matches — output is sorted by code.
{
  const warnings = contraindicationWarnings(
    ["hormones", "blood_thinners"],
    [
      med({ name: "OCP", codes: ["hormones"] }),
      med({ name: "Warfarin", codes: ["blood_thinners"] }),
    ],
  );
  assert.equal(warnings.length, 2);
  assert.equal(warnings[0].code, "blood_thinners");
  assert.equal(warnings[1].code, "hormones");
}

// ---------- parseSubscriptionOptions ----------

// Well-formed value.
{
  const options = parseSubscriptionOptions({
    intervals: ["monthly", "quarterly"],
    discount_percent: 15,
  });
  assert.deepEqual(options.intervals, ["monthly", "quarterly"]);
  assert.equal(options.discount_percent, 15);
}

// Casing normalises.
{
  const options = parseSubscriptionOptions({
    intervals: ["Monthly", "QUARTERLY"],
    discount_percent: 10,
  });
  assert.deepEqual(options.intervals, ["monthly", "quarterly"]);
}

// Unknown interval values dropped.
{
  const options = parseSubscriptionOptions({
    intervals: ["monthly", "weekly", "banana"],
  });
  assert.deepEqual(options.intervals, ["monthly"]);
}

// Discount clamped to 0..100.
{
  assert.equal(
    parseSubscriptionOptions({ intervals: [], discount_percent: 150 })
      .discount_percent,
    100,
  );
  assert.equal(
    parseSubscriptionOptions({ intervals: [], discount_percent: -5 })
      .discount_percent,
    0,
  );
}

// Non-numeric discount → null (not 0 — "unknown discount", not "no discount").
assert.equal(
  parseSubscriptionOptions({ intervals: [], discount_percent: "20%" })
    .discount_percent,
  null,
);

// String-encoded JSON path (some Supabase clients).
{
  const options = parseSubscriptionOptions(
    JSON.stringify({ intervals: ["monthly"], discount_percent: 5 }),
  );
  assert.equal(options.intervals.length, 1);
  assert.equal(options.discount_percent, 5);
}

// Empty / bad shapes → safe defaults.
assert.deepEqual(parseSubscriptionOptions(null), {
  intervals: [],
  discount_percent: null,
});
assert.deepEqual(parseSubscriptionOptions("garbage"), {
  intervals: [],
  discount_percent: null,
});
assert.deepEqual(parseSubscriptionOptions([1, 2]), {
  intervals: [],
  discount_percent: null,
});

// ---------- isSubscribable ----------
assert.equal(
  isSubscribable({ intervals: [], discount_percent: 10 }),
  false,
);
assert.equal(
  isSubscribable({ intervals: ["monthly"], discount_percent: null }),
  true,
);

// ---------- parseSupportingStudies ----------

// Fully-populated + minimal shapes both accepted.
{
  const rows = parseSupportingStudies([
    {
      title: "Trial A",
      url: "https://…",
      source: "NEJM",
      year: 2019,
    },
    { title: "Trial B", url: "https://…" },
    { title: "  ", url: "https://…" }, // blank title → dropped
    { title: "No URL" }, // missing url → dropped
    "not an object", // dropped
    null,
  ]);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].source, "NEJM");
  assert.equal(rows[0].year, 2019);
  assert.equal(rows[1].source, undefined);
}

// String-encoded JSON path.
{
  const rows = parseSupportingStudies(
    JSON.stringify([{ title: "X", url: "https://…" }]),
  );
  assert.equal(rows.length, 1);
}

// Empty / bad shapes.
assert.deepEqual(parseSupportingStudies(null), []);
assert.deepEqual(parseSupportingStudies("garbage"), []);
assert.deepEqual(parseSupportingStudies({ not: "array" }), []);

// ---------- validateMedicationDraft ----------

const validMed: MedicationDraft = {
  name: "Vitamin D",
  dosage: "2000 IU",
  frequency: "Daily",
  start_date: null,
  end_date: null,
  notes: null,
  contraindication_codes: [],
  active: true,
};

assert.deepEqual(validateMedicationDraft(validMed), []);

// Blank name.
{
  const errs = validateMedicationDraft({ ...validMed, name: "  " });
  assert.equal(errs.some((e) => e.field === "name"), true);
}

// Bad start_date format.
{
  const errs = validateMedicationDraft({
    ...validMed,
    start_date: "25/09/2026",
  });
  assert.equal(errs.some((e) => e.field === "start_date"), true);
}

// End before start.
{
  const errs = validateMedicationDraft({
    ...validMed,
    start_date: "2026-09-25",
    end_date: "2026-09-24",
  });
  assert.equal(errs.some((e) => e.field === "end_date"), true);
}

// Dates in the right order pass.
assert.deepEqual(
  validateMedicationDraft({
    ...validMed,
    start_date: "2026-09-25",
    end_date: "2026-10-25",
  }),
  [],
);

// Bad end_date format alone.
{
  const errs = validateMedicationDraft({
    ...validMed,
    end_date: "not a date",
  });
  assert.equal(errs.some((e) => e.field === "end_date"), true);
}

// eslint-disable-next-line no-console
console.log("supplements.test.ts OK");
