/**
 * Structured findings: the contract between the rules engine, the dictionary
 * and the result-entry screen.
 *
 *   npm run test:findings
 */
import assert from "node:assert/strict";

import { TERMS } from "./plain-language";
import { RESULT_ENTRY_TERM_KEYS } from "./result-entry-terms";
import { FINDING_KEYS, FINDINGS, findingState, isFindingKey } from "./result-findings";

let passed = 0;

function check(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`ok  ${name}`);
}

check("every finding the engine reads can be recorded on the entry screen", () => {
  for (const key of FINDING_KEYS) {
    assert.ok(
      (RESULT_ENTRY_TERM_KEYS as readonly string[]).includes(key),
      `${key} is missing from RESULT_ENTRY_TERM_KEYS`,
    );
  }
});

check("every finding key has plain-language wording", () => {
  for (const key of FINDING_KEYS) {
    const term = (TERMS as Record<string, { plainName: string; plainExplanation: string; medicalName: string } | undefined>)[key];
    assert.ok(term, `${key} has no TERMS entry`);
    assert.ok(term.plainName.trim() && term.plainExplanation.trim() && term.medicalName.trim());
  }
});

check("medicalName is unique across the dictionary", () => {
  // lib/lab-provider.ts maps catalogue product names to keys by medicalName,
  // so a duplicate would silently route a product to the wrong test.
  const seen = new Map<string, string>();
  for (const [key, term] of Object.entries(TERMS)) {
    const name = term.medicalName.trim().toLowerCase();
    assert.equal(seen.has(name), false, `"${term.medicalName}" is used by both ${seen.get(name)} and ${key}`);
    seen.set(name, key);
  }
});

check("findingState reads present, absent and unknown from the flag", () => {
  const binary = FINDINGS.stoolDysbiosis.presentFlags;
  assert.equal(findingState("positive", binary), "present");
  assert.equal(findingState("critical", binary), "present");
  assert.equal(findingState("negative", binary), "absent");
  assert.equal(findingState("normal", binary), "absent");
  assert.equal(findingState("POSITIVE ", binary), "present"); // tolerant of case and spaces
  assert.equal(findingState("high", binary), "unknown");
  assert.equal(findingState("low", binary), "unknown");
  assert.equal(findingState(null, binary), "unknown");
  assert.equal(findingState(undefined, binary), "unknown");
  assert.equal(findingState("", binary), "unknown");
});

check("isFindingKey rejects names that are not own keys", () => {
  assert.equal(isFindingKey("stoolZonulin"), true);
  assert.equal(isFindingKey("stool"), false);
  assert.equal(isFindingKey("toString"), false); // not inherited from Object.prototype
  assert.equal(isFindingKey("__proto__"), false);
  assert.equal(isFindingKey(""), false);
});

check("only the thyroid antibodies are sticky-positive", () => {
  const sticky = FINDING_KEYS.filter(
    (key) => (FINDINGS[key] as { positiveIsSticky?: boolean }).positiveIsSticky,
  );
  assert.deepEqual(sticky, ["thyroidAntibodies"]);
});

console.log(`\n${passed} checks passed`);
