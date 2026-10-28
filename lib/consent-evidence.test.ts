/**
 * Evidence-status note on the consent screens.
 *
 *   npm run test:consent-evidence
 */
import assert from "node:assert/strict";
import { SEQUENTIAL_CONSENTS } from "./consent-flow";
import {
  CONSENT_EVIDENCE_NOT_A_REPLACEMENT,
  consentEvidenceFor,
  consentEvidenceKey,
} from "./consent-evidence";

const useFallback = (_key: string, fallback: string) => fallback;

// Every consent carries the explicit off-guideline note and a reason.
for (const type of SEQUENTIAL_CONSENTS) {
  const note = consentEvidenceFor(type, useFallback);
  assert.match(note.label, /standard national screening guidelines/i, type);
  assert.ok(note.body.trim().length > 40, `${type} needs a real explanation`);
  assert.equal(note.footnote, CONSENT_EVIDENCE_NOT_A_REPLACEMENT);
  // Never promises detection or diagnosis.
  assert.doesNotMatch(note.body, /\b(detects?|diagnoses|prevents?|guarantee)/i, type);
}

// An admin edit wins over the draft, per key.
{
  const calls: string[] = [];
  const note = consentEvidenceFor("ctc", (key, fallback) => {
    calls.push(key);
    return key === "consent_evidence_ctc_body" ? "Edited by clinician." : fallback;
  });
  assert.equal(note.body, "Edited by clinician.");
  assert.match(note.label, /national screening/i);
  assert.deepEqual(calls, [
    "consent_evidence_ctc_label",
    "consent_evidence_ctc_body",
    "consent_evidence_footnote",
  ]);
}

assert.equal(consentEvidenceKey("brca", "label"), "consent_evidence_brca_label");

console.log("consent-evidence.test.ts OK");
