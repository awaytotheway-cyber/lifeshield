/**
 *   npx --yes tsx --tsconfig tsconfig.json lib/intervention-templates.test.ts
 *
 * Pure-parse tests only — the Supabase-facing loadTemplateForTriggerFinding
 * is integration-tested against the real DB later.
 */
import assert from "node:assert/strict";
import {
  parseActionSteps,
  parseResources,
  toEngineTemplate,
} from "./intervention-templates-parse";

// Well-formed arrays pass through as-is.
{
  const steps = parseActionSteps([
    { text: "Take 2000 IU D3 with breakfast.", dose: "2000 IU" },
    { text: "Retest 25-OH-D in 12 weeks.", when: "12w" },
  ]);
  assert.equal(steps.length, 2);
  assert.equal(steps[0].dose, "2000 IU");
}

// String-encoded jsonb (some Supabase clients) is parsed.
{
  const steps = parseActionSteps(
    JSON.stringify([{ text: "Walk 20 min after dinner." }]),
  );
  assert.equal(steps.length, 1);
  assert.equal(steps[0].text, "Walk 20 min after dinner.");
}

// Entries missing required fields are dropped.
{
  const steps = parseActionSteps([
    { text: "Ok" },
    { dose: "no text field" },
    "not-an-object",
    null,
  ]);
  assert.equal(steps.length, 1);
}

// Empty / null / bad shapes return an empty array, not null.
assert.deepEqual(parseActionSteps(null), []);
assert.deepEqual(parseActionSteps(undefined), []);
assert.deepEqual(parseActionSteps("not json"), []);
assert.deepEqual(parseActionSteps({ not: "an array" }), []);

// Resources
{
  const res = parseResources([
    { title: "Vitamin D primer", url: "https://…", kind: "article" },
    { title: "Missing url" },
    { url: "https://…", kind: "study" },
  ]);
  assert.equal(res.length, 1);
  assert.equal(res[0].kind, "article");
}
assert.deepEqual(parseResources(null), []);

// ---------- toEngineTemplate ----------

// Full valid row round-trips cleanly.
{
  const row = {
    code: "dysbiosis",
    title: "Gut-bacteria balance and vagal-tone support",
    rationale_md: "Correct dysbiosis; improve vagal tone",
    trigger_findings: ["Dysbiosis on stool analysis"],
    plain_reason: "The stool analysis suggested the mix of gut bacteria is out of balance.",
    description: "Draft idea from the protocol pairing for dysbiosis. Not an instruction.",
    category: "supplement",
    needs_interaction_check: false,
  };
  const engine = toEngineTemplate(row);
  assert.notEqual(engine, null);
  assert.equal(engine?.id, "dysbiosis");
  assert.equal(engine?.trigger_finding, "Dysbiosis on stool analysis");
  assert.equal(engine?.title, "Gut-bacteria balance and vagal-tone support");
  assert.equal(engine?.category, "supplement");
  assert.equal(engine?.needsInteractionCheck, false);
  assert.equal(engine?.clinical_basis, "Correct dysbiosis; improve vagal tone");
  // Missing on the input row → empty array on the engine template.
  assert.deepEqual(engine?.contraindication_codes, []);
}

// needs_interaction_check true carries through.
{
  const engine = toEngineTemplate({
    code: "inflammatory",
    title: "Anti-inflammatory (draft)",
    rationale_md: "Resveratrol, turmeric, high-dose algal omega-3",
    trigger_findings: ["General inflammatory / oxidative burden"],
    plain_reason: "Results suggested a general inflammatory burden.",
    description: "Draft idea for inflammatory burden.",
    category: "supplement",
    needs_interaction_check: true,
  });
  assert.equal(engine?.needsInteractionCheck, true);
}

// Phase E: contraindication_codes round-trip on the engine template.
{
  const engine = toEngineTemplate({
    code: "inflammatory",
    title: "Anti-inflammatory (draft)",
    rationale_md: "Resveratrol, turmeric",
    trigger_findings: ["General inflammatory / oxidative burden"],
    plain_reason: "reason",
    description: "d",
    category: "supplement",
    needs_interaction_check: true,
    contraindication_codes: ["hormones", "blood_thinners", "", 42],
  });
  // Non-string / blank values dropped; the rest survives.
  assert.deepEqual(engine?.contraindication_codes, [
    "hormones",
    "blood_thinners",
  ]);
}

// Missing any required field → null (in-progress admin edit must not leak).
for (const field of [
  "code",
  "title",
  "rationale_md",
  "plain_reason",
  "description",
] as const) {
  const row: Record<string, unknown> = {
    code: "x",
    title: "T",
    rationale_md: "R",
    trigger_findings: ["F"],
    plain_reason: "P",
    description: "D",
    category: "supplement",
    needs_interaction_check: false,
  };
  row[field] = "";
  assert.equal(
    toEngineTemplate(row),
    null,
    `missing ${field} must return null`,
  );
}

// trigger_findings must contain at least one non-empty string.
assert.equal(
  toEngineTemplate({
    code: "x",
    title: "T",
    rationale_md: "R",
    trigger_findings: [],
    plain_reason: "P",
    description: "D",
    category: "supplement",
    needs_interaction_check: false,
  }),
  null,
);

// Unknown category → null (never write an intervention row with a category
// the engine's downstream code doesn't accept).
assert.equal(
  toEngineTemplate({
    code: "x",
    title: "T",
    rationale_md: "R",
    trigger_findings: ["F"],
    plain_reason: "P",
    description: "D",
    category: "wildcard",
    needs_interaction_check: false,
  }),
  null,
);

// Non-object input.
assert.equal(toEngineTemplate(null), null);
assert.equal(toEngineTemplate("not a row"), null);

// eslint-disable-next-line no-console
console.log("intervention-templates.test.ts OK");
