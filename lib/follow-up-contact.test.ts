/**
 * What happens before a follow-up can be marked done.
 *
 *   npm run test:follow-up-contact
 *
 * The protocol re-triages for symptoms at EVERY follow-up contact, and
 * documents consent status at each review. So completing a retest, a coaching
 * item or a review always starts with the symptom question, and a review then
 * also confirms the three consents. The scheduled symptom re-check is itself
 * the question, so it has no step in front of it.
 */
import assert from "node:assert/strict";
import {
  clearSymptomChecked,
  markSymptomChecked,
  wasSymptomChecked,
  consentSnapshotNote,
  contactStepsFor,
  nextContactStep,
} from "./follow-up-contact";

// Every non-symptom contact starts with the symptom question.
for (const type of ["retest", "coaching", "review", "something_new"]) {
  assert.equal(contactStepsFor(type)[0], "symptom", type);
}
assert.deepEqual(contactStepsFor("symptom_check"), []);

// A review also confirms consents, after the symptom question.
assert.deepEqual(contactStepsFor("review"), ["symptom", "consents"]);
assert.deepEqual(contactStepsFor("retest"), ["symptom"]);

// Walking the steps.
assert.equal(nextContactStep("review", []), "symptom");
assert.equal(nextContactStep("review", ["symptom"]), "consents");
assert.equal(nextContactStep("review", ["symptom", "consents"]), null);
assert.equal(nextContactStep("retest", []), "symptom");
assert.equal(nextContactStep("retest", ["symptom"]), null);
assert.equal(nextContactStep("symptom_check", []), null);
// Steps cannot be skipped by claiming a later one is done.
assert.equal(nextContactStep("review", ["consents"]), "symptom");

// The consent record names each test and what the patient said, with the date.
{
  const note = consentSnapshotNote(
    { brca: true, ctc: false, snp: true },
    { brca: true, ctc: true, snp: true },
    "2026-10-27",
  );
  assert.match(note, /2026-10-27/);
  assert.match(note, /BRCA agreed/);
  assert.match(note, /CTC declined/);
  assert.match(note, /SNP agreed/);
}
{
  const note = consentSnapshotNote(
    { brca: false, ctc: false, snp: false },
    { brca: true, ctc: false, snp: false },
    "2026-10-27",
  );
  assert.match(note, /BRCA declined/);
  assert.match(note, /CTC not answered/);
  assert.match(note, /SNP not answered/);
}

// The symptom answer is remembered per contact, and only until cleared.
assert.equal(wasSymptomChecked("a"), false);
markSymptomChecked("a");
assert.equal(wasSymptomChecked("a"), true);
assert.equal(wasSymptomChecked("b"), false);
clearSymptomChecked("a");
assert.equal(wasSymptomChecked("a"), false);

console.log("follow-up-contact.test.ts OK");
