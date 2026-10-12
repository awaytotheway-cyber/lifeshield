import assert from "node:assert/strict";

import { shouldOrderHeavyMetals, shouldOrderStoolAnalysis } from "./rules-engine";
import { factsFromSavedAnswers } from "./rules-facts";

type Sections = Record<string, Record<string, unknown> | null>;

/** Baseline: nothing that would trigger either rule by another route. */
const QUIET: Sections = {
  reproductive_menstrual: { contraceptive_use: false, hrt_use: false },
  comorbidities: { gallstones: false, chronic_infections: ["none"] },
  radiation_occupational: { occupation: "librarian" },
  lifestyle: { pollutant_exposure: "no", vehicle_exhaust: false },
  diet_environment: { iodine_sources: ["seafood"] },
  stress: { stress_level: "low" },
};

function facts(over: Sections = {}) {
  return factsFromSavedAnswers({
    bmi: null,
    sections: { ...QUIET, ...over },
  });
}

function section(name: string, extra: Record<string, unknown>) {
  return { [name]: { ...(QUIET[name] ?? {}), ...extra } };
}

// ---------- baseline fires nothing ----------
assert.equal(
  shouldOrderStoolAnalysis(facts()).recommended,
  false,
  "quiet profile does not trigger stool analysis",
);
assert.equal(
  shouldOrderHeavyMetals(facts()).recommended,
  false,
  "quiet profile does not trigger heavy metals",
);

// ---------- Stool Rule A: oestrogen-dominant conditions ----------
for (const condition of ["severe_pms", "endometriosis", "fibroids"]) {
  const result = shouldOrderStoolAnalysis(
    facts(section("reproductive_menstrual", { estrogen_conditions: [condition] })),
  );
  assert.equal(result.recommended, true, `${condition} triggers stool analysis`);
  assert.match(result.reason, /oestrogen-dominant/);
}
// "None of these" must not count as a selection.
assert.equal(
  shouldOrderStoolAnalysis(
    facts(section("reproductive_menstrual", { estrogen_conditions: ["none"] })),
  ).recommended,
  false,
  "none-of-these does not trigger",
);
assert.equal(
  shouldOrderStoolAnalysis(
    facts(section("reproductive_menstrual", { estrogen_conditions: [] })),
  ).recommended,
  false,
  "an empty answer does not trigger",
);

// ---------- Stool Rule B: persistent digestive disturbance ----------
const digestive = shouldOrderStoolAnalysis(
  facts(section("comorbidities", { digestive_disturbance: ["bloating"] })),
);
assert.equal(digestive.recommended, true);
assert.match(digestive.reason, /digestive/);
assert.equal(
  shouldOrderStoolAnalysis(
    facts(section("comorbidities", { digestive_disturbance: ["none"] })),
  ).recommended,
  false,
);

// ---------- Heavy metals Rule A: predatory fish ----------
// "Frequent" only — monthly or rarer is not a meaningful exposure signal.
for (const [frequency, expected] of [
  ["daily", true],
  ["weekly", true],
  ["monthly", false],
  ["rarely", false],
  ["never", false],
] as const) {
  const result = shouldOrderHeavyMetals(
    facts(section("diet_environment", { predatory_fish: frequency })),
  );
  assert.equal(
    result.recommended,
    expected,
    `predatory fish ${frequency} -> ${expected}`,
  );
  if (expected) {
    assert.match(result.reason, /predatory fish/);
  }
}

// ---------- Heavy metals Rule A: well water ----------
const well = shouldOrderHeavyMetals(
  facts(section("diet_environment", { well_water: "yes" })),
);
assert.equal(well.recommended, true);
assert.match(well.reason, /well water/);
assert.equal(
  shouldOrderHeavyMetals(
    facts(section("diet_environment", { well_water: "no" })),
  ).recommended,
  false,
);
// "Unsure" must not be read as a yes.
assert.equal(
  shouldOrderHeavyMetals(
    facts(section("diet_environment", { well_water: "unsure" })),
  ).recommended,
  false,
  "unsure is not a yes",
);

// ---------- reasons combine ----------
const both = shouldOrderHeavyMetals(
  facts(section("diet_environment", { well_water: "yes", predatory_fish: "daily" })),
);
assert.match(both.reason, /predatory fish/);
assert.match(both.reason, /well water/);

// ---------- the iodine deviation stays deliberate ----------
// Agreed to keep this broader than the doc: low iodine alone is enough,
// without requiring the processed-food limb.
import { shouldOrderUrinaryIodine } from "./rules-engine";
const lowIodineGoodDiet = facts({
  diet_environment: {
    iodine_sources: ["none"],
    packaged_food: "never",
    takeaway: "never",
  },
});
assert.equal(
  shouldOrderUrinaryIodine(lowIodineGoodDiet).recommended,
  true,
  "low iodine alone still recommends the test, processed food not required",
);

console.log("tier4-inputs.test.ts passed");
