/**
 * Phase 2 Day 6 — follow-up seeding helpers.
 * Run: npm run test:followup
 */
import assert from "node:assert/strict";

import { FOLLOW_UP_TIMING } from "./clinical-thresholds";
import {
  addDaysToIsoDate,
  hasAnyWithTitle,
  hasPendingDuplicate,
  nextSymptomDueDays,
  retestTitleForTest,
  sameFollowUpTitle,
  todayIsoDate,
} from "./follow-ups";

let passed = 0;

function check(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`ok  ${name}`);
}

check("adds days without using UTC midnight surprises", () => {
  assert.equal(addDaysToIsoDate("2026-09-06", 0), "2026-09-06");
  assert.equal(addDaysToIsoDate("2026-09-06", 90), "2026-12-05");
  assert.equal(addDaysToIsoDate("2026-01-31", 1), "2026-02-01");
});

check("first symptom check uses the visible demo days", () => {
  assert.equal(nextSymptomDueDays(false), FOLLOW_UP_TIMING.visibleDueDays);
  assert.equal(nextSymptomDueDays(true), FOLLOW_UP_TIMING.symptomRecheckDays);
});

check("treats the same title as a duplicate even if spacing differs", () => {
  assert.equal(sameFollowUpTitle("Symptom re-check", " symptom re-check "), true);
  assert.equal(
    hasPendingDuplicate(
      [
        {
          type: "symptom_check",
          title: "Symptom re-check",
          status: "pending",
        },
      ],
      "symptom_check",
      "Symptom re-check",
    ),
    true,
  );
  assert.equal(
    hasPendingDuplicate(
      [
        {
          type: "symptom_check",
          title: "Symptom re-check",
          status: "completed",
        },
      ],
      "symptom_check",
      "Symptom re-check",
    ),
    false,
  );
});

check("completed retests are not seeded again", () => {
  assert.equal(
    hasAnyWithTitle(
      [{ type: "retest", title: "Re-test: Blood sugar handling" }],
      "retest",
      "Re-test: Blood sugar handling",
    ),
    true,
  );
});

check("retest titles use the plain-language name", () => {
  assert.equal(
    retestTitleForTest("fastingInsulin"),
    "Re-test: Blood sugar handling",
  );
});

check("todayIsoDate is YYYY-MM-DD", () => {
  assert.match(todayIsoDate(new Date(2026, 8, 6)), /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(todayIsoDate(new Date(2026, 8, 6)), "2026-09-06");
});

console.log(`\n${passed} checks passed`);
