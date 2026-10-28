import assert from "node:assert/strict";

import {
  factsFromSavedAnswers,
  hasActiveMedicationCode,
  type MedicationFact,
} from "./rules-facts";
import {
  PHASE1_LABS,
  mapResultsToInterventions,
  shouldOrderDUTCH,
  shouldOrderStoolAnalysis,
} from "./rules-engine";

function med(over: Partial<MedicationFact> = {}): MedicationFact {
  return { contraindication_codes: ["hormones"], active: true, ...over };
}

function facts(
  sections: Record<string, Record<string, unknown> | null>,
  medications?: MedicationFact[],
) {
  return factsFromSavedAnswers({ bmi: null, sections, medications });
}

// ---------- hasActiveMedicationCode ----------
assert.equal(hasActiveMedicationCode(undefined, "hormones"), false, "no list");
assert.equal(hasActiveMedicationCode([], "hormones"), false, "empty list");
assert.equal(hasActiveMedicationCode([med()], "hormones"), true);
assert.equal(
  hasActiveMedicationCode([med({ active: false })], "hormones"),
  false,
  "a stopped medication must not keep gating",
);
assert.equal(
  hasActiveMedicationCode([med({ contraindication_codes: ["HORMONES"] })], "hormones"),
  true,
  "codes match case-insensitively",
);
assert.equal(
  hasActiveMedicationCode([med({ contraindication_codes: ["  hormones "] })], "hormones"),
  true,
  "codes are trimmed",
);
assert.equal(
  hasActiveMedicationCode([med({ contraindication_codes: ["blood_thinners"] })], "hormones"),
  false,
  "unrelated code does not match",
);

// ---------- hrtUse ----------
// Previously hardcoded false; both routes must now set it.
assert.equal(facts({}).hrtUse, false, "nothing reported");
assert.equal(
  facts({ reproductive_menstrual: { hrt_use: true } }).hrtUse,
  true,
  "questionnaire answer sets HRT",
);
assert.equal(
  facts({ reproductive_menstrual: { hrt_use: "yes" } }).hrtUse,
  true,
  "string yes also counts",
);
assert.equal(
  facts({ reproductive_menstrual: { hrt_use: false } }, [med()]).hrtUse,
  true,
  "an active hormones medication sets HRT even when the question said no — covers the skipped reproductive path",
);
assert.equal(
  facts({ reproductive_menstrual: { hrt_use: false } }, [med({ active: false })]).hrtUse,
  false,
  "inactive hormone medication does not",
);

// ---------- bloodThinners ----------
assert.equal(facts({}).bloodThinners, false, "no medications");
assert.equal(
  facts({}, [med({ contraindication_codes: ["blood_thinners"] })]).bloodThinners,
  true,
);
assert.equal(
  facts({}, [med({ contraindication_codes: ["blood_thinners"], active: false })])
    .bloodThinners,
  false,
);
// Blood thinners must never be inferred from the hormone answer.
assert.equal(
  facts({ reproductive_menstrual: { hrt_use: true } }).bloodThinners,
  false,
);

// ---------- the rules these facts unblock ----------
// DUTCH Rule C: HRT or oral contraceptives. Previously only contraceptives
// could fire it, because hrtUse was pinned false.
const hrtOnly = facts({
  reproductive_menstrual: { contraceptive_use: false, hrt_use: true },
  stress: { stress_level: "low" },
  diet_environment: { iodine_sources: ["seafood"] },
});
assert.equal(hrtOnly.hormonalContraceptionRecent, false, "contraceptive is not the trigger here");
assert.equal(
  shouldOrderDUTCH(hrtOnly).recommended,
  true,
  "HRT alone now triggers DUTCH",
);
assert.equal(
  shouldOrderStoolAnalysis(hrtOnly).recommended,
  true,
  "HRT alone now triggers stool analysis",
);

// Same user, HRT reported only via their medication list.
const hrtViaMeds = facts(
  {
    reproductive_menstrual: { contraceptive_use: false, hrt_use: false },
    stress: { stress_level: "low" },
    diet_environment: { iodine_sources: ["seafood"] },
  },
  [med()],
);
assert.equal(shouldOrderDUTCH(hrtViaMeds).recommended, true);

// A user on neither must not trigger either rule via these facts.
const neither = facts({
  reproductive_menstrual: { contraceptive_use: false, hrt_use: false },
  stress: { stress_level: "low" },
  diet_environment: { iodine_sources: ["seafood"] },
});
assert.equal(shouldOrderDUTCH(neither).recommended, false);
assert.equal(shouldOrderStoolAnalysis(neither).recommended, false);


// ---------- the practitioner interaction check ----------
// Rows flagged needsInteractionCheck (DIM/I3C, high-dose omega-3) must be
// marked for a clinician when the user is on hormones or anticoagulants.
// Before this change bloodThinners was pinned false, so the anticoagulant
// half of that gate could never fire for anyone.
const onBloodThinners = facts({}, [
  med({ contraindication_codes: ["blood_thinners"] }),
]);
assert.equal(onBloodThinners.bloodThinners, true);

const dimRows = mapResultsToInterventions(onBloodThinners, {
  ...PHASE1_LABS,
  snpComtImpaired: true,
});
const dim = dimRows.find(
  (row) => row.trigger_finding === "Impaired oestrogen-detoxification (SNP/DUTCH)",
);
assert.ok(dim, "DIM/I3C row generated");
assert.equal(
  dim.clinician_interaction_check,
  true,
  "anticoagulant use now flags the DIM/I3C row for a practitioner check",
);

const cleanRows = mapResultsToInterventions(neither, {
  ...PHASE1_LABS,
  snpComtImpaired: true,
});
const cleanDim = cleanRows.find(
  (row) => row.trigger_finding === "Impaired oestrogen-detoxification (SNP/DUTCH)",
);
assert.ok(cleanDim);
assert.equal(
  cleanDim.clinician_interaction_check,
  false,
  "a user on neither hormones nor anticoagulants is not flagged",
);

console.log("rules-facts.test.ts passed");
