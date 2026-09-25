/**
 *   npx --yes tsx --tsconfig tsconfig.json lib/intervention-templates.test.ts
 *
 * Pure-parse tests only — the Supabase-facing loadTemplateForTriggerFinding
 * is integration-tested against the real DB later.
 */
import assert from "node:assert/strict";
import { parseActionSteps, parseResources } from "./intervention-templates-parse";

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

// eslint-disable-next-line no-console
console.log("intervention-templates.test.ts OK");
