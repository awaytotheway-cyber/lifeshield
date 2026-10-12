import assert from "node:assert/strict";

import { labsFromGeneticStructured } from "./labs-from-genetic";
import {
  PHASE1_LABS,
  collectRecommendations,
  mapResultsToInterventions,
  shouldOrderCYP450,
  type LabInputs,
} from "./rules-engine";
import { EMPTY_RULES_FACTS } from "./rules-facts";

const facts = EMPTY_RULES_FACTS;
const labs = (over: Partial<LabInputs> = {}): LabInputs => ({
  ...PHASE1_LABS,
  ...over,
});

// ---------- before a SNP panel exists ----------
const deferred = shouldOrderCYP450(facts, PHASE1_LABS);
assert.equal(deferred.recommended, false, "no panel yet, no recommendation");
assert.match(
  deferred.reason,
  /SNP panel/,
  "reason says it is waiting on the panel rather than claiming a negative",
);

// ---------- panel back, nothing altered ----------
const clean = shouldOrderCYP450(
  facts,
  labs({
    snpCyp1a2: false,
    snpCyp2c9: false,
    snpCyp2c19: false,
    snpCyp2d6: false,
    snpCyp3a4: false,
  }),
);
assert.equal(clean.recommended, false);
assert.match(clean.reason, /No altered-function/);

// ---------- each gene triggers on its own ----------
for (const field of [
  "snpCyp1a2",
  "snpCyp2c9",
  "snpCyp2c19",
  "snpCyp2d6",
  "snpCyp3a4",
] as const) {
  const result = shouldOrderCYP450(facts, labs({ [field]: true }));
  assert.equal(result.recommended, true, `${field} alone triggers CYP450`);
}

// Names the genes it found, so a clinician sees why.
const named = shouldOrderCYP450(
  facts,
  labs({ snpCyp2c19: true, snpCyp2d6: true }),
);
assert.match(named.reason, /CYP2C19/);
assert.match(named.reason, /CYP2D6/);

// Oestrogen-metabolism genes must NOT trigger the pharmacokinetic rule.
assert.equal(
  shouldOrderCYP450(facts, labs({ snpCyp1a1: true, snpCyp1b1: true })).recommended,
  false,
  "CYP1A1/CYP1B1 are oestrogen genes, not phase I pharmacokinetics",
);

// ---------- it reaches the recommendation list ----------
const recs = collectRecommendations(facts, labs({ snpCyp2d6: true }));
const cyp = recs.find((r) => r.test_name === "cyp450");
assert.ok(cyp, "cyp450 now appears in collectRecommendations");
assert.equal(cyp.test_tier, 4);
// It was previously absent entirely: 4 of 5 Tier 4 tests had triggers.
assert.equal(
  collectRecommendations(facts, PHASE1_LABS).some(
    (r) => r.test_name === "cyp450",
  ),
  false,
  "and stays absent until the panel says something",
);

// ---------- the pharmacokinetic warning ----------
// Source automation note: warn before DIM, I3C or high-dose botanicals.
const flagged = mapResultsToInterventions(
  facts,
  labs({ snpComtImpaired: true, snpCyp2c9: true }),
);
const dim = flagged.find(
  (row) => row.trigger_finding === "Impaired oestrogen-detoxification (SNP/DUTCH)",
);
assert.ok(dim);
assert.equal(
  dim.clinician_interaction_check,
  true,
  "an altered phase I CYP allele flags DIM/I3C for a practitioner check",
);

const unflagged = mapResultsToInterventions(
  facts,
  labs({ snpComtImpaired: true, snpCyp2c9: false }),
);
const cleanDim = unflagged.find(
  (row) => row.trigger_finding === "Impaired oestrogen-detoxification (SNP/DUTCH)",
);
assert.ok(cleanDim);
assert.equal(
  cleanDim.clinician_interaction_check,
  false,
  "a clean phase I panel does not flag it",
);

// ---------- genetic payload mapping ----------
const mapped = labsFromGeneticStructured({
  CYP2C19: { impaired: true },
  CYP3A5: "variant",
});
assert.equal(mapped.snpCyp2c19, true);
assert.equal(
  mapped.snpCyp3a4,
  true,
  "CYP3A5 lands on the same field as CYP3A4 — panels report them together",
);

console.log("cyp450.test.ts passed");
