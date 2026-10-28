/**
 * Phase 2 Day 5 — map saved test_results into LabInputs.
 * Run: npm run test:plan
 *
 * Covers the rule that matters most in this mapper: free text is display-only.
 * A row that merely NAMES a marker ("Zonulin negative") must never set an
 * abnormal finding. Findings come from structured result keys read via flag.
 */
import assert from "node:assert/strict";

import { THRESHOLDS } from "./clinical-thresholds";
import { labsFromTestResults } from "./labs-from-results";
import { collectRecommendations, mapResultsToInterventions } from "./rules-engine";
import { EMPTY_RULES_FACTS } from "./rules-facts";
import type { TestResultRow } from "./test-results";

type LabsShape = ReturnType<typeof labsFromTestResults>;

function row(partial: Partial<TestResultRow>): TestResultRow {
  return {
    id: "id",
    user_id: "user",
    test_order_id: null,
    test_name: "fastingInsulin",
    plain_name: null,
    result_value: null,
    result_unit: null,
    reference_range: null,
    flag: null,
    lab_report_url: null,
    clinician_reviewed: true,
    created_at: "2026-01-01T00:00:00Z",
    ...partial,
  };
}

let passed = 0;

function check(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`ok  ${name}`);
}

// ---------------------------------------------------------------------------
// Existing behaviour that must keep working
// ---------------------------------------------------------------------------

check("raised fasting insulin value maps to a number", () => {
  const labs = labsFromTestResults([
    row({ test_name: "fastingInsulin", result_value: "10.4" }),
  ]);
  assert.equal(labs.fastingInsulin, 10.4);
});

check("high fasting insulin flag without a number still fires the diet pairing", () => {
  const labs = labsFromTestResults([
    row({ test_name: "fastingInsulin", flag: "high" }),
  ]);
  assert.ok(
    labs.fastingInsulin !== null &&
      labs.fastingInsulin > THRESHOLDS.fastingInsulin_elevated,
  );
  const plan = mapResultsToInterventions(EMPTY_RULES_FACTS, labs);
  assert.ok(plan.some((item) => item.trigger_finding === "Raised fasting insulin"));
});

check("low urinary iodine maps, and antibodies block iodine", () => {
  const low = labsFromTestResults([
    row({ test_name: "urinaryIodine", flag: "low" }),
  ]);
  assert.equal(low.urinaryIodineLow, true);

  // Iodine needs a MEASURED low urinary iodine AND measured-negative
  // antibodies. Low iodine alone, with antibodies unknown, is not enough.
  const withIodine = mapResultsToInterventions(
    EMPTY_RULES_FACTS,
    labsFromTestResults([
      row({ test_name: "urinaryIodine", flag: "low" }),
      row({ test_name: "thyroidAntibodies", flag: "negative" }),
    ]),
  );
  assert.ok(
    withIodine.some((item) =>
      item.trigger_finding.includes("Low urinary iodine"),
    ),
  );

  const blocked = labsFromTestResults([
    row({ test_name: "urinaryIodine", flag: "low" }),
    row({
      test_name: "thyroid",
      plain_name: "TPO antibodies",
      flag: "positive",
    }),
  ]);
  assert.equal(blocked.thyroidAntibodiesPositive, true);
  const noIodine = mapResultsToInterventions(EMPTY_RULES_FACTS, blocked);
  assert.equal(
    noIodine.some((item) => item.trigger_finding.includes("iodine")),
    false,
  );
});

// ---------------------------------------------------------------------------
// Free text is display-only. This replaces a test that asserted the opposite:
// that a stool row reading "dysbiosis; zonulin positive" with no flag set both
// findings. The same code set them for "No dysbiosis detected".
// ---------------------------------------------------------------------------

check("free text naming a marker never sets an abnormal finding", () => {
  const cases: [string, Partial<TestResultRow>, keyof LabsShape][] = [
    ["stool", { result_value: "Beta-glucuronidase within range", flag: "normal" }, "stoolBetaGlucuronidaseRaised"],
    ["stool", { result_value: "Zonulin negative", flag: "negative" }, "zonulinPositive"],
    ["stool", { result_value: "No dysbiosis detected", flag: "normal" }, "stoolDysbiosis"],
    ["stool", { result_value: "No undigested protein or fat", flag: "normal" }, "undigestedProteinOrFat"],
    ["snp", { result_value: "MTHFR wildtype / normal", flag: "negative" }, "snpMthfr"],
    ["snp", { result_value: "COMT normal", flag: "negative" }, "snpComtImpaired"],
    ["routineBloods", { result_value: "Oxidative stress markers normal", flag: "normal" }, "inflammatoryOxidativeBurden"],
    ["routineBloods", { result_value: "Liver detox and gut barrier normal", flag: "normal" }, "liverDetoxOrBarrierImpaired"],
    ["dutch", { result_value: "No impaired oestrogen detox", flag: "normal" }, "oestrogenDetoxImpaired"],
  ];
  for (const [testName, partial, key] of cases) {
    const labs = labsFromTestResults([row({ test_name: testName, ...partial })]);
    assert.notEqual(labs[key], true, `${key} was set by: ${partial.result_value}`);
  }
});

check("a stool row with free text and no flag sets nothing", () => {
  const labs = labsFromTestResults([
    row({ test_name: "stool", result_value: "dysbiosis; zonulin positive" }),
  ]);
  assert.equal(labs.stoolDysbiosis, null);
  assert.equal(labs.zonulinPositive, null);
  assert.equal(labs.stoolBetaGlucuronidaseRaised, null);
});

// ---------------------------------------------------------------------------
// Structured findings: one result key per finding, read from the flag.
// ---------------------------------------------------------------------------

const BINARY_FINDINGS: [string, keyof LabsShape][] = [
  ["stoolDysbiosis", "stoolDysbiosis"],
  ["stoolBetaGlucuronidase", "stoolBetaGlucuronidaseRaised"],
  ["stoolZonulin", "zonulinPositive"],
  ["stoolUndigested", "undigestedProteinOrFat"],
  ["liverDetoxBarrier", "liverDetoxOrBarrierImpaired"],
  ["inflammatoryOxidative", "inflammatoryOxidativeBurden"],
  ["oestrogenDetox", "oestrogenDetoxImpaired"],
  ["liverEnzymes", "liverEnzymesElevated"],
];

check("each finding key: positive sets it, negative or normal clears it, no flag leaves it unknown", () => {
  for (const [key, field] of BINARY_FINDINGS) {
    assert.equal(labsFromTestResults([row({ test_name: key, flag: "positive" })])[field], true, `${key} positive`);
    assert.equal(labsFromTestResults([row({ test_name: key, flag: "negative" })])[field], false, `${key} negative`);
    assert.equal(labsFromTestResults([row({ test_name: key, flag: "normal" })])[field], false, `${key} normal`);
    assert.equal(labsFromTestResults([row({ test_name: key, flag: null })])[field], null, `${key} no flag`);
  }
});

check("a quantitative finding reads high as present; a presence/absence one does not", () => {
  assert.equal(
    labsFromTestResults([row({ test_name: "stoolBetaGlucuronidase", flag: "high" })])
      .stoolBetaGlucuronidaseRaised,
    true,
  );
  // 'high' has no meaning for a presence/absence finding.
  assert.equal(
    labsFromTestResults([row({ test_name: "stoolDysbiosis", flag: "high" })]).stoolDysbiosis,
    null,
  );
});

// ---------------------------------------------------------------------------
// Newest result wins. loadOwnTestResults returns rows newest-first, and the
// mapper used to let later rows overwrite earlier ones, so the OLDEST won.
// ---------------------------------------------------------------------------

check("a retest replaces the earlier value regardless of row order", () => {
  const older = row({ test_name: "fastingInsulin", result_value: "12", created_at: "2026-01-01T00:00:00Z" });
  const newer = row({ test_name: "fastingInsulin", result_value: "6", created_at: "2026-03-01T00:00:00Z" });
  assert.equal(labsFromTestResults([newer, older]).fastingInsulin, 6);
  assert.equal(labsFromTestResults([older, newer]).fastingInsulin, 6);
});

check("a newer negative finding clears an older positive one", () => {
  const labs = labsFromTestResults([
    row({ test_name: "stoolDysbiosis", flag: "negative", created_at: "2026-03-01T00:00:00Z" }),
    row({ test_name: "stoolDysbiosis", flag: "positive", created_at: "2026-01-01T00:00:00Z" }),
  ]);
  assert.equal(labs.stoolDysbiosis, false);
});

// ---------------------------------------------------------------------------
// Thyroid antibodies are tri-state: positive / measured-negative / unmeasured.
// ---------------------------------------------------------------------------

check("antibodies: positive, measured-negative and never-measured are three different states", () => {
  assert.equal(labsFromTestResults([row({ test_name: "thyroidAntibodies", flag: "positive" })]).thyroidAntibodiesPositive, true);
  assert.equal(labsFromTestResults([row({ test_name: "thyroidAntibodies", flag: "negative" })]).thyroidAntibodiesPositive, false);
  assert.equal(labsFromTestResults([]).thyroidAntibodiesPositive, null);
});

check("a positive antibody result is never cleared by a later negative", () => {
  // Safety direction: the iodine block must not be lifted by one clean retest.
  const labs = labsFromTestResults([
    row({ test_name: "thyroidAntibodies", flag: "negative", created_at: "2026-03-01T00:00:00Z" }),
    row({ test_name: "thyroidAntibodies", flag: "positive", created_at: "2026-01-01T00:00:00Z" }),
  ]);
  assert.equal(labs.thyroidAntibodiesPositive, true);
});

// ---------------------------------------------------------------------------
// Iodine supplementation. The protocol says "only if thyroid antibodies
// negative" — a KNOWN state — and the row reads "low URINARY iodine", so a
// diet answer is not a substitute for the measurement.
// ---------------------------------------------------------------------------

function drafted(facts: typeof EMPTY_RULES_FACTS, rows: TestResultRow[]): boolean {
  return mapResultsToInterventions(facts, labsFromTestResults(rows)).some((item) =>
    item.trigger_finding.includes("Low urinary iodine"),
  );
}
const lowUrine = () => row({ test_name: "urinaryIodine", flag: "low" });
const antibodiesNegative = () => row({ test_name: "thyroidAntibodies", flag: "negative" });
const antibodiesPositive = () => row({ test_name: "thyroidAntibodies", flag: "positive" });

check("iodine is drafted only with measured low iodine AND measured-negative antibodies", () => {
  assert.equal(drafted(EMPTY_RULES_FACTS, [lowUrine(), antibodiesNegative()]), true);
});

check("iodine is NOT drafted when antibodies were never measured", () => {
  assert.equal(drafted(EMPTY_RULES_FACTS, [lowUrine()]), false);
});

check("iodine is NOT drafted from a diet answer alone", () => {
  const dietOnly = { ...EMPTY_RULES_FACTS, dietaryIodineLow: true };
  assert.equal(drafted(dietOnly, []), false);
  // Antibodies known, still no urine result: still not drafted.
  assert.equal(drafted(dietOnly, [antibodiesNegative()]), false);
});

check("iodine stays hard-blocked by positive antibodies or an autoimmune thyroid diagnosis", () => {
  assert.equal(drafted(EMPTY_RULES_FACTS, [lowUrine(), antibodiesPositive()]), false);
  const autoimmune = { ...EMPTY_RULES_FACTS, autoimmuneThyroid: true };
  assert.equal(drafted(autoimmune, [lowUrine(), antibodiesNegative()]), false);
});

// ---------------------------------------------------------------------------
// End to end: a recorded result reaches the Tier 4 rule that reads it.
// ---------------------------------------------------------------------------

check("raised ALT/AST recorded as a result orders the heavy-metal panel", () => {
  const labs = labsFromTestResults([
    row({ test_name: "liverEnzymes", flag: "high" }),
  ]);
  const recs = collectRecommendations(EMPTY_RULES_FACTS, labs);
  const heavy = recs.find((rec) => rec.test_name === "heavyMetals");
  assert.ok(heavy, "heavyMetals should be recommended");
  assert.equal(heavy.test_tier, 4);

  // Normal enzymes, no exposure answers: nothing is ordered.
  const normal = collectRecommendations(
    EMPTY_RULES_FACTS,
    labsFromTestResults([row({ test_name: "liverEnzymes", flag: "normal" })]),
  );
  assert.equal(normal.some((rec) => rec.test_name === "heavyMetals"), false);
});

console.log(`\n${passed} checks passed`);
