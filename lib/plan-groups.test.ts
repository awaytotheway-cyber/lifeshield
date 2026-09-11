/**
 * Phase 2 Day 5 — plan grouping and review labels.
 * Run: npm run test:plan
 */
import assert from "node:assert/strict";

import { COPY } from "./copy";
import {
  groupInterventions,
  groupKeyForCategory,
  reviewStatusLabel,
} from "./plan-groups";

let passed = 0;

function check(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`ok  ${name}`);
}

check("maps database categories to the five plain group labels", () => {
  assert.equal(groupKeyForCategory("diet"), "food");
  assert.equal(groupKeyForCategory("supplement"), "supplements");
  assert.equal(groupKeyForCategory("lifestyle"), "habits");
  assert.equal(groupKeyForCategory("coaching"), "habits");
  assert.equal(groupKeyForCategory("therapy"), "followup");
  assert.equal(groupKeyForCategory("referral"), "referrals");
});

check("groups rows and skips empty headings", () => {
  const groups = groupInterventions([
    { id: "1", category: "diet", trigger_finding: "Raised fasting insulin" },
    { id: "2", category: "supplement", trigger_finding: "Calcium-D-glucarate" },
    { id: "3", category: "coaching", trigger_finding: "Medium/high self-rated stress" },
  ]);
  assert.deepEqual(
    groups.map((group) => group.label),
    [COPY.planGroupFood, COPY.planGroupSupplements, COPY.planGroupHabits],
  );
});

check("review labels stay draft / pending, never an instruction", () => {
  assert.equal(reviewStatusLabel("draft"), COPY.planStatusDraft);
  assert.match(reviewStatusLabel("draft"), /pending practitioner review/i);
  assert.doesNotMatch(reviewStatusLabel("draft"), /take this|you must|do this/i);
});

console.log(`\n${passed} checks passed`);
