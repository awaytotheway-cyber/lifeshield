/**
 * Phase 4 Day 3 — threshold merge + fallback checks (no React Native imports).
 *
 * Run from the project folder:
 *   npx --yes tsx --tsconfig tsconfig.json lib/load-thresholds.test.ts
 */
import assert from "node:assert/strict";

import { THRESHOLDS } from "./clinical-thresholds";
import { mergeThresholdRowsFromDb } from "./threshold-merge";

let passed = 0;

function check(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`ok  ${name}`);
}

check("empty DB rows returns all hard-coded fallback numbers", () => {
  const merged = mergeThresholdRowsFromDb([]);
  assert.equal(merged.fastingInsulin_elevated, THRESHOLDS.fastingInsulin_elevated);
  assert.equal(merged.bmi_obesityThreshold, THRESHOLDS.bmi_obesityThreshold);
  assert.equal(merged.tsh_subclinicalHypo, THRESHOLDS.tsh_subclinicalHypo);
  assert.equal(
    merged.liverEnzyme_altAstElevated,
    THRESHOLDS.liverEnzyme_altAstElevated,
  );
});

check("null rows still returns fallback numbers", () => {
  const merged = mergeThresholdRowsFromDb(null);
  assert.deepEqual(merged, THRESHOLDS);
});

check("partial DB rows override only known keys", () => {
  const merged = mergeThresholdRowsFromDb([
    { key: "bmi_obesityThreshold", value: 25 },
    { key: "unknown_key", value: 999 },
  ]);
  assert.equal(merged.bmi_obesityThreshold, 25);
  assert.equal(merged.tsh_subclinicalHypo, THRESHOLDS.tsh_subclinicalHypo);
  assert.equal(merged.fastingInsulin_elevated, THRESHOLDS.fastingInsulin_elevated);
});

check("invalid numeric values are ignored (stay on fallback)", () => {
  const merged = mergeThresholdRowsFromDb([
    { key: "tsh_subclinicalHypo", value: Number.NaN },
  ]);
  assert.equal(merged.tsh_subclinicalHypo, THRESHOLDS.tsh_subclinicalHypo);
});

check("FALLBACK copy matches THRESHOLDS export for tests", () => {
  assert.deepEqual({ ...THRESHOLDS }, THRESHOLDS);
});

console.log(`\n${passed} checks passed.`);
