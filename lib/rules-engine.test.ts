/**
 * Phase 2 Day 2 — unit checks for mapResultsToInterventions().
 *
 * Run from the project folder:
 *   npx --yes tsx --tsconfig tsconfig.json lib/rules-engine.test.ts
 *
 * No extra test framework is installed. This file throws if a check fails.
 */
import assert from "node:assert/strict";
import { EMPTY_RULES_FACTS, type RulesFacts } from "./rules-facts";
import {
  FINDING_INTERVENTION_TABLE,
  PHASE1_LABS,
  mapResultsToInterventions,
  shouldOrderDUTCH,
  shouldOrderStoolAnalysis,
  shouldOrderUrinaryIodine,
  type LabInputs,
} from "./rules-engine";
import { THRESHOLDS } from "./clinical-thresholds";

function labs(partial: Partial<LabInputs>): LabInputs {
  return { ...PHASE1_LABS, ...partial };
}

function facts(partial: Partial<RulesFacts>): RulesFacts {
  return { ...EMPTY_RULES_FACTS, ...partial };
}

function findByTrigger(
  rows: ReturnType<typeof mapResultsToInterventions>,
  trigger: string,
) {
  return rows.find((row) => row.trigger_finding === trigger);
}

let passed = 0;

function check(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`ok  ${name}`);
}

check("table has all 14 verbatim pairings", () => {
  assert.equal(FINDING_INTERVENTION_TABLE.length, 14);
  const expected: [string, string][] = [
    [
      "Dysbiosis on stool analysis",
      "Correct dysbiosis; improve vagal tone",
    ],
    ["Raised stool beta-glucuronidase", "Calcium-D-glucarate"],
    [
      "Impaired liver detox / barrier dysfunction",
      "Liver-support and gut-barrier-repair supplementation",
    ],
    [
      "Positive zonulin (barrier breakage)",
      "Vitamin D correction; vitamin A",
    ],
    ["Undigested protein/fat", "Digestive enzyme supplementation"],
    [
      "Raised fasting insulin",
      "Cardiometabolic diet; insulin-resistance management",
    ],
    [
      "Abnormal thyroid function",
      "Thyroxine replacement and/or thyroid autoimmunity correction",
    ],
    [
      "Impaired adrenal resilience (cortisol)",
      "Adaptogens; sleep-improvement strategies",
    ],
    [
      "Medium/high self-rated stress",
      "Structured stress-coping support (challenge-framing + social connection)",
    ],
    [
      "Elevated toxin exposure",
      "Sauna therapy; magnesium salt baths; glutathione support",
    ],
    [
      "Low urinary iodine (antibodies NEGATIVE)",
      "Iodine supplementation (blocked if antibodies positive)",
    ],
    ["Methylation-pathway SNP issues", "Methyl-donor supplementation"],
    [
      "General inflammatory / oxidative burden",
      "Resveratrol, turmeric, high-dose algal omega-3, Glutathione/NAC",
    ],
    [
      "Impaired oestrogen-detoxification (SNP/DUTCH)",
      "Soy isoflavones and DIM/I3C",
    ],
  ];

  for (let i = 0; i < expected.length; i += 1) {
    assert.equal(
      FINDING_INTERVENTION_TABLE[i].trigger_finding,
      expected[i][0],
    );
    assert.equal(
      FINDING_INTERVENTION_TABLE[i].clinical_basis,
      expected[i][1],
    );
  }
});

check("iodine is hard-blocked when thyroid antibodies are yes", () => {
  const rows = mapResultsToInterventions(
    facts({ dietaryIodineLow: true }),
    labs({
      urinaryIodineLow: true,
      thyroidAntibodiesPositive: true,
    }),
  );
  assert.equal(
    findByTrigger(rows, "Low urinary iodine (antibodies NEGATIVE)"),
    undefined,
  );

  // Same hard-stop the Phase 1 iodine test-order rule uses.
  const order = shouldOrderUrinaryIodine(
    facts({ dietaryIodineLow: true, autoimmuneThyroid: false }),
    labs({ thyroidAntibodiesPositive: true }),
  );
  assert.equal(order.recommended, false);
  assert.match(order.reason, /Blocked/i);
});

check("iodine can fire when antibodies are not positive", () => {
  const rows = mapResultsToInterventions(
    facts({ dietaryIodineLow: true }),
    labs({ thyroidAntibodiesPositive: false, urinaryIodineLow: null }),
  );
  const iodine = findByTrigger(
    rows,
    "Low urinary iodine (antibodies NEGATIVE)",
  );
  assert.ok(iodine);
  assert.equal(iodine.status, "draft");
  assert.equal(
    iodine.clinical_basis,
    "Iodine supplementation (blocked if antibodies positive)",
  );
  assert.ok(iodine.plain_reason.length > 0);
});

check("medium self-rated stress fires coping support", () => {
  const rows = mapResultsToInterventions(
    facts({ stressMediumOrHigh: true }),
    PHASE1_LABS,
  );
  const stress = findByTrigger(rows, "Medium/high self-rated stress");
  assert.ok(stress);
  assert.equal(
    stress.clinical_basis,
    "Structured stress-coping support (challenge-framing + social connection)",
  );
  assert.equal(stress.category, "coaching");
  assert.equal(stress.status, "draft");
  assert.equal(stress.clinician_interaction_check, false);
});

check("DIM is flagged when contraceptive use is yes", () => {
  const rows = mapResultsToInterventions(
    facts({ contraceptiveUse: true }),
    labs({ oestrogenDetoxImpaired: true }),
  );
  const dim = findByTrigger(
    rows,
    "Impaired oestrogen-detoxification (SNP/DUTCH)",
  );
  assert.ok(dim);
  assert.equal(dim.clinical_basis, "Soy isoflavones and DIM/I3C");
  assert.equal(dim.clinician_interaction_check, true);
  assert.equal(dim.status, "draft");
});

check("high-dose omega-3 row is also flagged for contraceptives", () => {
  const rows = mapResultsToInterventions(
    facts({ contraceptiveUse: true }),
    labs({ inflammatoryOxidativeBurden: true }),
  );
  const row = findByTrigger(
    rows,
    "General inflammatory / oxidative burden",
  );
  assert.ok(row);
  assert.equal(row.clinician_interaction_check, true);
});

check("every mapped row is draft and has both reason fields", () => {
  const rows = mapResultsToInterventions(
    facts({
      stressMediumOrHigh: true,
      dietaryIodineLow: true,
      pollutantExposure: true,
    }),
    labs({
      stoolDysbiosis: true,
      stoolBetaGlucuronidaseRaised: true,
      liverDetoxOrBarrierImpaired: true,
      zonulinPositive: true,
      undigestedProteinOrFat: true,
      fastingInsulin: 12,
      tsh: 5.2,
      cortisolAbnormal: true,
      snpMthfr: true,
      inflammatoryOxidativeBurden: true,
      oestrogenDetoxImpaired: true,
      thyroidAntibodiesPositive: false,
    }),
  );

  assert.equal(rows.length, 14);
  for (const row of rows) {
    assert.equal(row.status, "draft");
    assert.ok(row.plain_reason.length > 0);
    assert.ok(row.clinical_basis.length > 0);
    assert.ok(
      [
        "supplement",
        "diet",
        "lifestyle",
        "therapy",
        "referral",
        "coaching",
      ].includes(row.category),
    );
  }
});

check("Phase 1 shouldOrder* helpers still exist", () => {
  const dutch = shouldOrderDUTCH(
    facts({ contraceptiveUse: true }),
    PHASE1_LABS,
  );
  assert.equal(dutch.recommended, true);
});

check("BMI stool rule respects a custom threshold override", () => {
  const lowerBmi = { ...THRESHOLDS, bmi_obesityThreshold: 25 };
  const withCustom = shouldOrderStoolAnalysis(
    facts({ bmi: 28 }),
    PHASE1_LABS,
    lowerBmi,
  );
  assert.equal(withCustom.recommended, true);

  const withDefault = shouldOrderStoolAnalysis(
    facts({ bmi: 28 }),
    PHASE1_LABS,
    THRESHOLDS,
  );
  assert.equal(withDefault.recommended, false);
});

check(
  "engine accepts DB-shaped pairs and produces equivalent rows",
  () => {
    // Simulate loadTemplatesForEngine returning the same 14 pairings via a
    // different code path (would come from intervention_templates in prod).
    const dbPairs = FINDING_INTERVENTION_TABLE.map((pair) => ({
      id: pair.id,
      trigger_finding: pair.trigger_finding,
      plain_reason: pair.plain_reason,
      category: pair.category,
      title: pair.title,
      description: pair.description,
      clinical_basis: pair.clinical_basis,
      needsInteractionCheck: pair.needsInteractionCheck,
    }));

    const factsBundle = facts({
      stressMediumOrHigh: true,
      dietaryIodineLow: true,
      pollutantExposure: true,
    });
    const labsBundle = labs({
      stoolDysbiosis: true,
      stoolBetaGlucuronidaseRaised: true,
      liverDetoxOrBarrierImpaired: true,
      zonulinPositive: true,
      undigestedProteinOrFat: true,
      fastingInsulin: 12,
      tsh: 5.2,
      cortisolAbnormal: true,
      snpMthfr: true,
      inflammatoryOxidativeBurden: true,
      oestrogenDetoxImpaired: true,
      thyroidAntibodiesPositive: false,
    });

    const defaultRows = mapResultsToInterventions(factsBundle, labsBundle);
    const dbRows = mapResultsToInterventions(
      factsBundle,
      labsBundle,
      THRESHOLDS,
      dbPairs,
    );
    assert.deepEqual(defaultRows, dbRows);
  },
);

check(
  "medication contraindication codes flip clinician_interaction_check",
  () => {
    // Simulate a template that carries contraindication_codes (the DB path).
    const dbPair = {
      id: "inflammatory",
      trigger_finding: "General inflammatory / oxidative burden",
      plain_reason: "reason",
      category: "supplement" as const,
      title: "T",
      description: "d",
      clinical_basis: "cb",
      needsInteractionCheck: false,
      contraindication_codes: ["hormones", "blood_thinners"],
    };
    const factsBundle = facts({});
    const labsBundle = labs({ inflammatoryOxidativeBurden: true });

    // No medications → interaction stays false (needsInteractionCheck is
    // also false so the questionnaire path can't fire either).
    const noMeds = mapResultsToInterventions(
      factsBundle,
      labsBundle,
      THRESHOLDS,
      [dbPair],
    );
    assert.equal(noMeds.length, 1);
    assert.equal(noMeds[0].clinician_interaction_check, false);

    // Medication with an unrelated code → still false.
    const unrelated = mapResultsToInterventions(
      factsBundle,
      labsBundle,
      THRESHOLDS,
      [dbPair],
      ["mystery"],
    );
    assert.equal(unrelated[0].clinician_interaction_check, false);

    // Medication with an overlapping code → true. Case-insensitive.
    const overlap = mapResultsToInterventions(
      factsBundle,
      labsBundle,
      THRESHOLDS,
      [dbPair],
      ["HORMONES"],
    );
    assert.equal(overlap[0].clinician_interaction_check, true);
  },
);

check(
  "medication codes don't affect pairs without contraindication_codes",
  () => {
    // The hard-coded FINDING_INTERVENTION_TABLE entries carry no
    // contraindication_codes today. Even with a matching medication code,
    // clinician_interaction_check stays false unless the pair's own
    // needsInteractionCheck (questionnaire path) fires.
    const dysbiosis = FINDING_INTERVENTION_TABLE.find(
      (p) => p.id === "dysbiosis",
    )!;
    const rows = mapResultsToInterventions(
      facts({}),
      labs({ stoolDysbiosis: true }),
      THRESHOLDS,
      [dysbiosis],
      ["hormones", "blood_thinners"],
    );
    assert.equal(rows[0].clinician_interaction_check, false);
  },
);

check("engine drops DB pairs whose id findingIsPresent doesn't know", () => {
  const unknownPair = {
    id: "future_finding_not_yet_in_engine",
    trigger_finding: "Some future finding",
    plain_reason: "reason",
    category: "supplement" as const,
    title: "Future",
    description: "d",
    clinical_basis: "cb",
    needsInteractionCheck: false,
  };
  const rows = mapResultsToInterventions(
    facts({}),
    PHASE1_LABS,
    THRESHOLDS,
    [unknownPair],
  );
  assert.equal(rows.length, 0);
});

check("TSH iodine rule respects a custom threshold override", () => {
  const lowerTsh = { ...THRESHOLDS, tsh_subclinicalHypo: 4.0 };
  const withCustom = shouldOrderUrinaryIodine(
    facts({ dietaryIodineLow: false }),
    labs({ tsh: 4.2, thyroidAntibodiesPositive: false }),
    lowerTsh,
  );
  assert.equal(withCustom.recommended, true);

  const withDefault = shouldOrderUrinaryIodine(
    facts({ dietaryIodineLow: false }),
    labs({ tsh: 4.2, thyroidAntibodiesPositive: false }),
    THRESHOLDS,
  );
  assert.equal(withDefault.recommended, false);
});

console.log(`\n${passed} checks passed.`);
