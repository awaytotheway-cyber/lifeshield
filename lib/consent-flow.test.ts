/**
 * Consent flow: BRCA -> CTC -> SNP must each be DECIDED before the
 * questionnaire — decided, not agreed.
 *
 *   npm run test:consent-flow
 *
 * The protocol is explicit that each test is the patient's choice: BRCA is
 * offered and "the patient may decline", CTC is "if desired", and the pathway
 * moves on once BRCA and CTC are "completed or actively declined". The flow
 * used to require all three to be agreed, so declining any one of them
 * stranded the patient on Home with no questionnaire, Tests, plan or follow-up.
 */
import assert from "node:assert/strict";

import {
  allConsentsDecided,
  emptyConsentFlags,
  firstUndecidedConsent,
  foldConsentRows,
  hrefAfterConsent,
  hrefForConsent,
  redirectIfConsentOutOfOrder,
  type ConsentFlags,
} from "./consent-flow";
import { routes } from "./routes";

let passed = 0;

function check(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`ok  ${name}`);
}

const flags = (brca: boolean, ctc: boolean, snp: boolean): ConsentFlags => ({
  brca,
  ctc,
  snp,
});

// ---------------------------------------------------------------------------
// foldConsentRows: one row per decision. A row means decided; `consented` says
// which way. No row means the patient has not been asked yet.
// ---------------------------------------------------------------------------

check("no rows: nothing agreed, nothing decided", () => {
  const { agreed, decided } = foldConsentRows([]);
  assert.deepEqual(agreed, emptyConsentFlags);
  assert.deepEqual(decided, emptyConsentFlags);
});

check("null rows (a failed load) fails closed: nothing decided", () => {
  const { agreed, decided } = foldConsentRows(null);
  assert.deepEqual(agreed, emptyConsentFlags);
  assert.deepEqual(decided, emptyConsentFlags);
});

check("a declined row is decided but not agreed", () => {
  const { agreed, decided } = foldConsentRows([
    { consent_type: "brca", consented: false },
  ]);
  assert.equal(agreed.brca, false);
  assert.equal(decided.brca, true);
  assert.equal(decided.ctc, false);
});

check("an agreed row is both agreed and decided", () => {
  const { agreed, decided } = foldConsentRows([
    { consent_type: "ctc", consented: true },
  ]);
  assert.equal(agreed.ctc, true);
  assert.equal(decided.ctc, true);
});

check("the latest row for a type wins when someone changed their mind", () => {
  // Rows arrive oldest-first; a later agree overrides an earlier decline.
  const { agreed } = foldConsentRows([
    { consent_type: "snp", consented: false },
    { consent_type: "snp", consented: true },
  ]);
  assert.equal(agreed.snp, true);
  const reversed = foldConsentRows([
    { consent_type: "snp", consented: true },
    { consent_type: "snp", consented: false },
  ]);
  assert.equal(reversed.agreed.snp, false);
});

check("rows for other consent types are ignored", () => {
  const { agreed, decided } = foldConsentRows([
    { consent_type: "terms_privacy", consented: true },
  ]);
  assert.deepEqual(agreed, emptyConsentFlags);
  assert.deepEqual(decided, emptyConsentFlags);
});

// ---------------------------------------------------------------------------
// The gate: all three decided, in any combination of yes and no.
// ---------------------------------------------------------------------------

check("the questionnaire opens once all three are decided, however they were decided", () => {
  assert.equal(allConsentsDecided(flags(true, true, true)), true); // all agreed
  assert.equal(allConsentsDecided(flags(true, true, true)), true);
  // The case that used to lock the patient out: they decided, "no".
  const allDeclined = foldConsentRows([
    { consent_type: "brca", consented: false },
    { consent_type: "ctc", consented: false },
    { consent_type: "snp", consented: false },
  ]).decided;
  assert.equal(allConsentsDecided(allDeclined), true);
});

check("one consent still pending keeps the gate shut", () => {
  assert.equal(allConsentsDecided(flags(true, true, false)), false);
  assert.equal(allConsentsDecided(flags(false, false, false)), false);
});

check("firstUndecidedConsent walks BRCA, CTC, SNP and skips ones already decided", () => {
  assert.equal(firstUndecidedConsent(flags(false, false, false)), "brca");
  // BRCA was declined (decided) — the next thing to ask about is CTC.
  assert.equal(firstUndecidedConsent(flags(true, false, false)), "ctc");
  assert.equal(firstUndecidedConsent(flags(true, true, false)), "snp");
  assert.equal(firstUndecidedConsent(flags(true, true, true)), null);
  // An earlier gap is found first even if a later one is decided.
  assert.equal(firstUndecidedConsent(flags(false, true, true)), "brca");
});

// ---------------------------------------------------------------------------
// Ordering is still enforced WHILE consents are being decided.
// ---------------------------------------------------------------------------

check("while deciding, the first pending screen is allowed and later ones bounce back", () => {
  const none = flags(false, false, false);
  assert.equal(redirectIfConsentOutOfOrder("brca", none), null);
  assert.equal(redirectIfConsentOutOfOrder("ctc", none), routes.consentBrca);
  assert.equal(redirectIfConsentOutOfOrder("snp", none), routes.consentBrca);
});

check("while deciding, a screen already decided skips forward to the first pending one", () => {
  const brcaDone = flags(true, false, false);
  assert.equal(redirectIfConsentOutOfOrder("ctc", brcaDone), null);
  assert.equal(redirectIfConsentOutOfOrder("brca", brcaDone), routes.consentCtc);
  assert.equal(redirectIfConsentOutOfOrder("snp", brcaDone), routes.consentCtc);
});

check("once everything is decided, any consent screen can be revisited to change a decision", () => {
  // This used to redirect to the questionnaire. Declining is no longer a dead
  // end, which only works if a decline can later be reversed.
  const all = flags(true, true, true);
  assert.equal(redirectIfConsentOutOfOrder("brca", all), null);
  assert.equal(redirectIfConsentOutOfOrder("ctc", all), null);
  assert.equal(redirectIfConsentOutOfOrder("snp", all), null);
});

check("the sequence order and hand-off targets are unchanged", () => {
  assert.equal(hrefForConsent("brca"), routes.consentBrca);
  assert.equal(hrefForConsent("ctc"), routes.consentCtc);
  assert.equal(hrefForConsent("snp"), routes.consentSnp);
  assert.equal(hrefAfterConsent("brca"), routes.consentCtc);
  assert.equal(hrefAfterConsent("ctc"), routes.consentSnp);
  assert.equal(hrefAfterConsent("snp"), routes.questionnaire);
});

console.log(`\n${passed} checks passed`);
