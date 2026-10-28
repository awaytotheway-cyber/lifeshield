/**
 * Tier 1 ordering: BRCA1/2 and CTC.
 *
 *   npm run test:tier1-orders
 *
 * The protocol: BRCA is ordered "if indicated and consented", where indicated
 * means ethnicity and/or a BRCA-positive relative; CTC is ordered "if
 * consented". Anything unknown is not "indicated": a test is never ordered on
 * a guess. Ethnicities that count are a clinician-supplied list that ships
 * empty, so by default only a BRCA-positive relative indicates.
 */
import assert from "node:assert/strict";
import {
  BRCA_INDICATED_ETHNICITIES,
  brcaIndicated,
  tier1Orders,
} from "./tier1-orders";

// The shipped list is empty: no ethnicity is assumed to be an indication.
assert.deepEqual([...BRCA_INDICATED_ETHNICITIES], []);

// ---------- indication ----------
assert.equal(brcaIndicated({ brcaPositiveRelative: true, ethnicity: null }), true);
assert.equal(brcaIndicated({ brcaPositiveRelative: false, ethnicity: "mixed" }), false);
assert.equal(brcaIndicated({ brcaPositiveRelative: null, ethnicity: null }), null);
assert.equal(brcaIndicated({ brcaPositiveRelative: null, ethnicity: "mixed" }), null);

// A clinician-supplied ethnicity list indicates on its own, either way round.
const LIST = ["x_group"] as const;
assert.equal(brcaIndicated({ brcaPositiveRelative: false, ethnicity: "x_group" }, LIST), true);
assert.equal(brcaIndicated({ brcaPositiveRelative: null, ethnicity: "X_Group" }, LIST), true);
assert.equal(brcaIndicated({ brcaPositiveRelative: false, ethnicity: "mixed" }, LIST), false);
assert.equal(brcaIndicated({ brcaPositiveRelative: null, ethnicity: "mixed" }, LIST), null);

// ---------- orders ----------
const names = (o: ReturnType<typeof tier1Orders>) => o.map((x) => x.test_name);
const yes = { brca: true, ctc: true, snp: true };
const no = { brca: false, ctc: false, snp: false };

assert.deepEqual(names(tier1Orders({ agreed: yes, indicated: true })), ["brca", "ctc"]);
// BRCA needs both the indication and the consent.
assert.deepEqual(names(tier1Orders({ agreed: yes, indicated: false })), ["ctc"]);
assert.deepEqual(names(tier1Orders({ agreed: yes, indicated: null })), ["ctc"]);
assert.deepEqual(names(tier1Orders({ agreed: { ...yes, brca: false }, indicated: true })), ["ctc"]);
// CTC needs only the consent.
assert.deepEqual(names(tier1Orders({ agreed: { ...yes, ctc: false }, indicated: true })), ["brca"]);
assert.deepEqual(names(tier1Orders({ agreed: no, indicated: true })), []);
// SNP is a kit dispatch with its own flow, never a Tier 1 order.
assert.equal(names(tier1Orders({ agreed: yes, indicated: true })).includes("snp"), false);

for (const order of tier1Orders({ agreed: yes, indicated: true })) {
  assert.equal(order.test_tier, 1);
  assert.ok(order.trigger_reason.length > 10);
}

console.log("tier1-orders.test.ts OK");
