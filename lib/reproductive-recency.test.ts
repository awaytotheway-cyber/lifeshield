/**
 * Hormone exposure has to be CURRENT or RECENT, not "ever".
 *
 *   npm run test:reproductive
 *
 * DUTCH Rule C is "active or recent (<12 months) use of systemic HRT or oral
 * contraceptives". The contraceptive question asked "have you ever used it",
 * so someone who stopped a decade ago still switched on DUTCH, stool analysis
 * and the DIM/I3C interaction check. A follow-up now records when they last
 * used it, and the engine keys on that.
 */
import assert from "node:assert/strict";

import {
  jsonToReproductiveForm,
  reproductiveToJson,
} from "./questionnaire/mappers";
import {
  emptyReproductive,
  reproductiveSchema,
  type ReproductiveForm,
} from "./questionnaire/schemas";
import {
  shouldOrderDUTCH,
  shouldOrderStoolAnalysis,
} from "./rules-engine";
import { EMPTY_RULES_FACTS, factsFromSavedAnswers } from "./rules-facts";

let passed = 0;

function check(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`ok  ${name}`);
}

const baseForm = (partial: Partial<ReproductiveForm>): ReproductiveForm => ({
  ...emptyReproductive(),
  ageAtFirstPeriod: "12",
  contraceptiveUse: "no",
  hrtUse: "no",
  amenorrhoea: "no",
  menstrualRegularity: "regular",
  cycleLengthDays: "28",
  menopausalStatus: "pre",
  pregnancies: "0",
  liveBirths: "0",
  breastfeeding: "no",
  estrogenConditions: ["none"],
  ...partial,
});

const onPill = (partial: Partial<ReproductiveForm> = {}) =>
  baseForm({
    contraceptiveUse: "yes",
    contraceptiveType: "pill",
    contraceptiveDurationYears: "3",
    ...partial,
  });

function factsFrom(reproductive: Record<string, unknown> | null) {
  return factsFromSavedAnswers({
    bmi: null,
    sections: {
      reproductive_menstrual: reproductive,
      comorbidities: null,
      radiation_occupational: null,
      lifestyle: null,
      stress: { stress_level: "low" },
      diet_environment: { iodine_sources: ["seafood"] },
    },
  });
}

// ---------------------------------------------------------------------------
// The form
// ---------------------------------------------------------------------------

check("someone who has used hormonal contraception must say when they last used it", () => {
  const result = reproductiveSchema.safeParse(onPill({ contraceptiveLastUse: "" }));
  assert.equal(result.success, false);
  if (!result.success) {
    assert.ok(
      result.error.issues.some((issue) => issue.path.join(".") === "contraceptiveLastUse"),
    );
  }
});

check("each recency answer is accepted, and nonsense is not", () => {
  for (const value of ["current", "within_year", "over_year"]) {
    assert.equal(
      reproductiveSchema.safeParse(onPill({ contraceptiveLastUse: value })).success,
      true,
      value,
    );
  }
  assert.equal(
    reproductiveSchema.safeParse(onPill({ contraceptiveLastUse: "yesterday" })).success,
    false,
  );
});

check("someone who has never used it is not asked", () => {
  assert.equal(reproductiveSchema.safeParse(baseForm({})).success, true);
});

// ---------------------------------------------------------------------------
// Saving and loading
// ---------------------------------------------------------------------------

check("the answer is saved, and reloads into the form", () => {
  const parsed = reproductiveSchema.parse(onPill({ contraceptiveLastUse: "within_year" }));
  const json = reproductiveToJson(parsed, true);
  assert.equal(json.contraceptive_last_use, "within_year");
  assert.equal(jsonToReproductiveForm(json).contraceptiveLastUse, "within_year");
});

check("no answer is stored for someone who has not used it", () => {
  const json = reproductiveToJson(reproductiveSchema.parse(baseForm({})), true);
  assert.equal(json.contraceptive_last_use, null);
});

check("an answer saved before this question existed reloads as unanswered, not as a guess", () => {
  const legacy = { contraceptive_use: true, contraceptive_type: "pill", contraceptive_duration_years: 3 };
  assert.equal(jsonToReproductiveForm(legacy).contraceptiveLastUse, "");
});

// ---------------------------------------------------------------------------
// The fact the engine reads
// ---------------------------------------------------------------------------

check("current use, and use within the last 12 months, count as recent", () => {
  assert.equal(factsFrom({ contraceptive_use: true, contraceptive_last_use: "current" }).hormonalContraceptionRecent, true);
  assert.equal(factsFrom({ contraceptive_use: true, contraceptive_last_use: "within_year" }).hormonalContraceptionRecent, true);
});

check("use that stopped more than 12 months ago does not count", () => {
  assert.equal(factsFrom({ contraceptive_use: true, contraceptive_last_use: "over_year" }).hormonalContraceptionRecent, false);
});

check("never used does not count", () => {
  assert.equal(factsFrom({ contraceptive_use: false }).hormonalContraceptionRecent, false);
  assert.equal(factsFrom(null).hormonalContraceptionRecent, false);
});

check("a saved 'yes' with no recency answer is treated as recent, because over-flagging is the safe error", () => {
  // These are answers given before the recency question existed. Treating
  // them as old would quietly drop the interaction check for people who may
  // be on the pill today; treating them as recent only over-orders a test.
  assert.equal(factsFrom({ contraceptive_use: true }).hormonalContraceptionRecent, true);
});

// ---------------------------------------------------------------------------
// The rules that consume it
// ---------------------------------------------------------------------------

check("DUTCH Rule C fires on recent hormonal contraception and not on old use", () => {
  assert.equal(
    shouldOrderDUTCH({ ...EMPTY_RULES_FACTS, hormonalContraceptionRecent: true }).recommended,
    true,
  );
  assert.equal(
    shouldOrderDUTCH({ ...EMPTY_RULES_FACTS, hormonalContraceptionRecent: false }).recommended,
    false,
  );
});

check("the stool-analysis proxy follows the same recency", () => {
  assert.equal(
    shouldOrderStoolAnalysis({ ...EMPTY_RULES_FACTS, hormonalContraceptionRecent: true }).recommended,
    true,
  );
  assert.equal(
    shouldOrderStoolAnalysis({ ...EMPTY_RULES_FACTS, hormonalContraceptionRecent: false }).recommended,
    false,
  );
});

console.log(`\n${passed} checks passed`);
