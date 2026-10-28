/**
 * Eligibility gate: who may start the screening pathway.
 *
 *   npm run test:eligibility
 *
 * The protocol excludes women under 18 and sets no floor for men. Age is
 * counted in whole years on the calendar, so the boundary cases are the 18th
 * birthday itself, the day before it, and a 29 February birth date. Missing,
 * malformed or future details are "needs_details", never a guess either way.
 */
import assert from "node:assert/strict";
import { ageOn, eligibilityFor, MINIMUM_AGE } from "./eligibility";

const NOW = new Date(2026, 9, 27); // 27 Oct 2026, local time

assert.equal(MINIMUM_AGE, 18);

// ---------- ageOn ----------

assert.equal(ageOn("2008-10-27", NOW), 18, "exact 18th birthday counts as 18");
assert.equal(ageOn("2008-10-28", NOW), 17, "day before the 18th birthday is 17");
assert.equal(ageOn("2008-10-26", NOW), 18);
assert.equal(ageOn("1990-01-01", NOW), 36);
assert.equal(ageOn("2026-10-27", NOW), 0, "born today is age 0");
assert.equal(ageOn("2026-10-28", NOW), null, "future date is invalid");
assert.equal(ageOn("2027-01-01", NOW), null);
assert.equal(ageOn("1850-01-01", NOW), null, "implausibly old is invalid");
assert.equal(ageOn("not-a-date", NOW), null);
assert.equal(ageOn("2008-02-30", NOW), null, "30 Feb does not exist");
assert.equal(ageOn("", NOW), null);

// 29 February: a leap-day birthday turns 18 on 1 March in a non-leap year.
assert.equal(ageOn("2008-02-29", new Date(2026, 1, 28)), 17);
assert.equal(ageOn("2008-02-29", new Date(2026, 2, 1)), 18);

// ---------- eligibilityFor ----------

const eligible = { status: "eligible" } as const;

// Women: 18 and over are eligible, under 18 are not.
assert.deepEqual(eligibilityFor({ sex: "female", dateOfBirth: "1990-05-05" }, NOW), eligible);
assert.deepEqual(eligibilityFor({ sex: "female", dateOfBirth: "2008-10-27" }, NOW), eligible);
assert.deepEqual(eligibilityFor({ sex: "female", dateOfBirth: "2008-10-28" }, NOW), {
  status: "under_age",
});
assert.deepEqual(eligibilityFor({ sex: "female", dateOfBirth: "2015-01-01" }, NOW), {
  status: "under_age",
});

// "Other" is not read as male: the floor applies unless sex is exactly male.
assert.deepEqual(eligibilityFor({ sex: "other", dateOfBirth: "2012-01-01" }, NOW), {
  status: "under_age",
});

// Men: the protocol sets no age floor.
assert.deepEqual(eligibilityFor({ sex: "male", dateOfBirth: "2012-01-01" }, NOW), eligible);
assert.deepEqual(eligibilityFor({ sex: "male", dateOfBirth: "1970-01-01" }, NOW), eligible);

// Missing or unusable details are never decided either way.
for (const input of [
  { sex: null, dateOfBirth: "1990-05-05" },
  { sex: "", dateOfBirth: "1990-05-05" },
  { sex: "unknown", dateOfBirth: "1990-05-05" },
  { sex: "female", dateOfBirth: null },
  { sex: "female", dateOfBirth: "" },
  { sex: "female", dateOfBirth: "garbage" },
  { sex: "female", dateOfBirth: "2027-01-01" },
  { sex: "male", dateOfBirth: "2027-01-01" },
  { sex: null, dateOfBirth: null },
]) {
  assert.deepEqual(
    eligibilityFor(input, NOW),
    { status: "needs_details" },
    `${JSON.stringify(input)} must need details`,
  );
}

// Under-age is decided on the date alone once sex is known; a missing sex on
// a minor does not slip through as eligible.
assert.deepEqual(eligibilityFor({ sex: null, dateOfBirth: "2015-01-01" }, NOW), {
  status: "needs_details",
});

console.log("eligibility.test.ts OK");
