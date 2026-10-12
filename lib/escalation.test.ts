import assert from "node:assert/strict";

import { NO_ESCALATION, escalationFromResults } from "./escalation";
import type { TestResultRow } from "./test-results";

function row(over: Partial<TestResultRow> = {}): TestResultRow {
  return {
    id: "r1",
    user_id: "u1",
    test_order_id: null,
    test_name: "brca",
    plain_name: null,
    result_value: null,
    result_unit: null,
    reference_range: null,
    flag: "positive",
    lab_report_url: null,
    clinician_reviewed: null,
    created_at: "2026-10-12T00:00:00Z",
    ...over,
  };
}

// ---------- nothing to escalate ----------
assert.deepEqual(escalationFromResults([]), NO_ESCALATION, "no results");
assert.deepEqual(
  escalationFromResults([row({ flag: "negative" })]),
  NO_ESCALATION,
  "a negative BRCA does not escalate",
);
assert.deepEqual(
  escalationFromResults([row({ test_name: "ctc", flag: "negative" })]),
  NO_ESCALATION,
  "a negative CTC does not escalate",
);
assert.deepEqual(
  escalationFromResults([row({ test_name: "thyroid", flag: "positive" })]),
  NO_ESCALATION,
  "an unrelated positive result is not a Tier 1 escalation",
);

// ---------- BRCA: referral, not a stop ----------
const brca = escalationFromResults([row()]);
assert.equal(brca.brcaPositive, true);
assert.equal(brca.ctcPositive, false);
assert.equal(brca.level, "brca_referral", "BRCA positive must not hard-stop");

// ---------- CTC: hard stop ----------
const ctc = escalationFromResults([row({ test_name: "ctc" })]);
assert.equal(ctc.ctcPositive, true);
assert.equal(ctc.level, "ctc_stop");

// ---------- CTC outranks BRCA ----------
const both = escalationFromResults([row(), row({ id: "r2", test_name: "ctc" })]);
assert.equal(both.brcaPositive, true);
assert.equal(both.ctcPositive, true);
assert.equal(both.level, "ctc_stop", "a hard stop wins over a referral");

// ---------- flag handling ----------
assert.equal(
  escalationFromResults([row({ flag: "POSITIVE" })]).brcaPositive,
  true,
  "flags match case-insensitively",
);
assert.equal(
  escalationFromResults([row({ flag: " positive " })]).brcaPositive,
  true,
  "flags are trimmed",
);
assert.equal(
  escalationFromResults([row({ test_name: "ctc", flag: "critical" })]).ctcPositive,
  true,
  "critical counts as positive so an escalation is never silently dropped",
);
// "high" is quantitative and meaningless for a binary result; accepting it
// would escalate on a mis-keyed numeric row.
assert.equal(
  escalationFromResults([row({ flag: "high" })]).brcaPositive,
  false,
  "high does not escalate",
);
assert.equal(
  escalationFromResults([row({ flag: null })]).brcaPositive,
  false,
  "a missing flag does not escalate",
);
assert.equal(
  escalationFromResults([row({ flag: "normal" })]).brcaPositive,
  false,
);

// ---------- term matching ----------
assert.equal(
  escalationFromResults([row({ test_name: " BRCA " })]).brcaPositive,
  true,
  "term keys are trimmed and case-insensitive",
);
// A later negative row must not clear an earlier positive one: results are
// append-only and a positive stands until a clinician acts on it.
assert.equal(
  escalationFromResults([
    row({ id: "a", test_name: "ctc", flag: "positive" }),
    row({ id: "b", test_name: "ctc", flag: "negative" }),
  ]).ctcPositive,
  true,
  "a positive is not undone by another row",
);

console.log("escalation.test.ts passed");
