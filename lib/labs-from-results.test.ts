/**
 * Phase 2 Day 5 — map saved test_results into LabInputs.
 * Run: npm run test:plan
 */
import assert from "node:assert/strict";

import { THRESHOLDS } from "./clinical-thresholds";
import { labsFromTestResults } from "./labs-from-results";
import { mapResultsToInterventions } from "./rules-engine";
import { EMPTY_RULES_FACTS } from "./rules-facts";
import type { TestResultRow } from "./test-results";

function row(partial: Partial<TestResultRow>): TestResultRow {
  return {
    id: "id",
    user_id: "user",
    test_order_id: null,
    test_name: "fastingInsulin",
    plain_name: null,
    result_value: null,
    result_unit: null,
    reference_range: null,
    flag: null,
    lab_report_url: null,
    clinician_reviewed: true,
    created_at: "2026-01-01T00:00:00Z",
    ...partial,
  };
}

let passed = 0;

function check(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`ok  ${name}`);
}

check("raised fasting insulin value maps to a number", () => {
  const labs = labsFromTestResults([
    row({ test_name: "fastingInsulin", result_value: "10.4" }),
  ]);
  assert.equal(labs.fastingInsulin, 10.4);
});

check("high fasting insulin flag without a number still fires the diet pairing", () => {
  const labs = labsFromTestResults([
    row({ test_name: "fastingInsulin", flag: "high" }),
  ]);
  assert.ok(
    labs.fastingInsulin !== null &&
      labs.fastingInsulin > THRESHOLDS.fastingInsulin_elevated,
  );
  const plan = mapResultsToInterventions(EMPTY_RULES_FACTS, labs);
  assert.ok(plan.some((item) => item.trigger_finding === "Raised fasting insulin"));
});

check("low urinary iodine maps, and antibodies block iodine", () => {
  const low = labsFromTestResults([
    row({ test_name: "urinaryIodine", flag: "low" }),
  ]);
  assert.equal(low.urinaryIodineLow, true);
  const withIodine = mapResultsToInterventions(EMPTY_RULES_FACTS, low);
  assert.ok(
    withIodine.some((item) =>
      item.trigger_finding.includes("Low urinary iodine"),
    ),
  );

  const blocked = labsFromTestResults([
    row({ test_name: "urinaryIodine", flag: "low" }),
    row({
      test_name: "thyroid",
      plain_name: "TPO antibodies",
      flag: "positive",
    }),
  ]);
  assert.equal(blocked.thyroidAntibodiesPositive, true);
  const noIodine = mapResultsToInterventions(EMPTY_RULES_FACTS, blocked);
  assert.equal(
    noIodine.some((item) => item.trigger_finding.includes("iodine")),
    false,
  );
});

check("stool keywords map without treating every stool row as every finding", () => {
  const labs = labsFromTestResults([
    row({
      test_name: "stool",
      result_value: "dysbiosis; zonulin positive",
    }),
  ]);
  assert.equal(labs.stoolDysbiosis, true);
  assert.equal(labs.zonulinPositive, true);
  assert.equal(labs.stoolBetaGlucuronidaseRaised, null);
});

console.log(`\n${passed} checks passed`);
