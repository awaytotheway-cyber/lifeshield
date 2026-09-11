/**
 * This file contains clinical decision logic. Every rule maps to the source protocol. Do not use AI/LLM here. Changing a rule = changing one function below.
 *
 * Phase 1: bloods and SNP results are not collected yet. Pass them as null.
 * A branch that needs a lab result does not fire; it returns an honest
 * “recommended once baseline results are available” reason instead.
 */
import {
  HIGH_RISK_OCCUPATIONS,
  THRESHOLDS,
  type ClinicalThresholdValues,
} from "@/lib/clinical-thresholds";
import type { TermKey } from "@/lib/plain-language";
import {
  occupationIsHighRisk,
  type RulesFacts,
} from "@/lib/rules-facts";

/** Must match public.interventions.category CHECK in Supabase. */
export type InterventionCategory =
  | "supplement"
  | "diet"
  | "lifestyle"
  | "therapy"
  | "referral"
  | "coaching";

export type RuleResult = {
  recommended: boolean;
  reason: string;
};

/**
 * Lab / SNP inputs. All null in Phase 1.
 * Extra boolean flags are for Phase 2 mapping (and fake test sets)
 * when a full numeric lab row is not in the app yet.
 */
export type LabInputs = {
  snpCyp1a1: boolean | null;
  snpCyp1b1: boolean | null;
  snpComtImpaired: boolean | null;
  snpMthfr: boolean | null;
  cortisolAbnormal: boolean | null;
  fastingInsulin: number | null;
  tsh: number | null;
  thyroidAntibodiesPositive: boolean | null;
  liverEnzymesElevated: boolean | null;
  // ---- Phase 2 finding flags (null = not entered) ----
  stoolDysbiosis: boolean | null;
  stoolBetaGlucuronidaseRaised: boolean | null;
  liverDetoxOrBarrierImpaired: boolean | null;
  zonulinPositive: boolean | null;
  undigestedProteinOrFat: boolean | null;
  adrenalResilienceImpaired: boolean | null;
  urinaryIodineLow: boolean | null;
  inflammatoryOxidativeBurden: boolean | null;
  oestrogenDetoxImpaired: boolean | null;
  elevatedToxinExposure: boolean | null;
  abnormalThyroidFunction: boolean | null;
};

export const PHASE1_LABS: LabInputs = {
  snpCyp1a1: null,
  snpCyp1b1: null,
  snpComtImpaired: null,
  snpMthfr: null,
  cortisolAbnormal: null,
  fastingInsulin: null,
  tsh: null,
  thyroidAntibodiesPositive: null,
  liverEnzymesElevated: null,
  stoolDysbiosis: null,
  stoolBetaGlucuronidaseRaised: null,
  liverDetoxOrBarrierImpaired: null,
  zonulinPositive: null,
  undigestedProteinOrFat: null,
  adrenalResilienceImpaired: null,
  urinaryIodineLow: null,
  inflammatoryOxidativeBurden: null,
  oestrogenDetoxImpaired: null,
  elevatedToxinExposure: null,
  abnormalThyroidFunction: null,
};

export type EngineRecommendation = {
  test_tier: 3 | 4;
  /** Dictionary key so the results screen can use ClinicalTerm. */
  test_name: TermKey;
  trigger_reason: string;
};

const DEFERRED_LABS =
  "recommended once baseline results are available";

function hasHormoneSnp(labs: LabInputs): boolean {
  return (
    labs.snpCyp1a1 === true ||
    labs.snpCyp1b1 === true ||
    labs.snpComtImpaired === true ||
    labs.snpMthfr === true
  );
}

export function shouldOrderDUTCH(
  facts: RulesFacts,
  labs: LabInputs = PHASE1_LABS,
): RuleResult {
  if (hasHormoneSnp(labs)) {
    return {
      recommended: true,
      reason:
        "SNP variant in CYP1A1, CYP1B1, COMT, or MTHFR (from source protocol).",
    };
  }

  // Cortisol is null in Phase 1, so this branch leans on the stress answer.
  if (labs.cortisolAbnormal === true && facts.stressMediumOrHigh) {
    return {
      recommended: true,
      reason: "Abnormal cortisol with medium or high self-rated stress.",
    };
  }
  if (labs.cortisolAbnormal === null && facts.stressMediumOrHigh) {
    return {
      recommended: true,
      reason:
        "Medium or high self-rated stress (salivary cortisol not measured yet — protocol leans on the stress answer in Phase 1).",
    };
  }

  if (facts.contraceptiveUse || facts.hrtUse) {
    return {
      recommended: true,
      reason: "Current or recent contraceptive / HRT use from the questionnaire.",
    };
  }

  return {
    recommended: false,
    reason: "No DUTCH trigger from the questionnaire in Phase 1.",
  };
}

export function shouldOrderStoolAnalysis(
  facts: RulesFacts,
  labs: LabInputs = PHASE1_LABS,
  thresholds: ClinicalThresholdValues = THRESHOLDS,
): RuleResult {
  // Estrogen-related history in Phase 1 = contraceptive / HRT (COMT SNP is null).
  if (facts.contraceptiveUse || facts.hrtUse) {
    return {
      recommended: true,
      reason:
        "Hormone-related history (contraceptive / HRT). Impaired COMT SNP is not available in Phase 1.",
    };
  }
  if (labs.snpComtImpaired === true) {
    return {
      recommended: true,
      reason: "Impaired COMT from SNP results.",
    };
  }

  if (facts.chronicGutInfection || facts.gallstones) {
    return {
      recommended: true,
      reason: facts.chronicGutInfection
        ? "Chronic gut infection reported on the questionnaire."
        : "Gallstones reported on the questionnaire.",
    };
  }

  if (
    labs.fastingInsulin !== null &&
    labs.fastingInsulin > thresholds.fastingInsulin_elevated
  ) {
    return {
      recommended: true,
      reason: `Fasting insulin above ${thresholds.fastingInsulin_elevated}.`,
    };
  }
  if (labs.fastingInsulin === null) {
    // Do not fire this branch; BMI / gut / hormones may still fire above.
  }

  if (
    facts.bmi !== null &&
    facts.bmi > thresholds.bmi_obesityThreshold
  ) {
    return {
      recommended: true,
      reason: `BMI above ${thresholds.bmi_obesityThreshold} from saved measurements.`,
    };
  }

  if (labs.fastingInsulin === null) {
    return {
      recommended: false,
      reason: `${DEFERRED_LABS} (fasting insulin not yet measured).`,
    };
  }

  return {
    recommended: false,
    reason: "No stool-analysis trigger from the questionnaire in Phase 1.",
  };
}

export function shouldOrderUrinaryIodine(
  facts: RulesFacts,
  labs: LabInputs = PHASE1_LABS,
  thresholds: ClinicalThresholdValues = THRESHOLDS,
): RuleResult {
  // SAFETY HARD-STOP — never recommend iodine testing in these cases.
  if (labs.thyroidAntibodiesPositive === true || facts.autoimmuneThyroid) {
    return {
      recommended: false,
      reason:
        "Blocked: active autoimmune thyroid condition (or thyroid antibodies positive). Urinary iodine is not suggested.",
    };
  }

  if (facts.dietaryIodineLow) {
    return {
      recommended: true,
      reason:
        "Low dietary iodine sources reported (none of: iodised salt, seafood, seaweed, dairy).",
    };
  }

  if (
    labs.tsh !== null &&
    labs.tsh > thresholds.tsh_subclinicalHypo
  ) {
    return {
      recommended: true,
      reason: `TSH above ${thresholds.tsh_subclinicalHypo} (subclinical hypo threshold).`,
    };
  }

  if (labs.tsh === null) {
    return {
      recommended: false,
      reason: `${DEFERRED_LABS} (TSH not yet measured; threshold ${thresholds.tsh_subclinicalHypo}).`,
    };
  }

  return {
    recommended: false,
    reason: "No urinary iodine trigger from diet or thyroid labs.",
  };
}

export function shouldOrderHeavyMetals(
  facts: RulesFacts,
  labs: LabInputs = PHASE1_LABS,
  thresholds: ClinicalThresholdValues = THRESHOLDS,
): RuleResult {
  const occupationRisk = occupationIsHighRisk(facts.occupation);
  const environmental =
    facts.pollutantExposure || facts.vehicleExhaust || occupationRisk;

  if (environmental) {
    const bits: string[] = [];
    if (occupationRisk) {
      bits.push(
        `occupation matches high-risk list (${HIGH_RISK_OCCUPATIONS.join(", ")})`,
      );
    }
    if (facts.pollutantExposure) {
      bits.push("pollutant exposure");
    }
    if (facts.vehicleExhaust) {
      bits.push("vehicle exhaust exposure");
    }
    return {
      recommended: true,
      reason: bits.join("; "),
    };
  }

  // Unexplained liver enzymes + Gilbert’s + exposure. Labs are null in Phase 1.
  if (facts.gilbertYes && labs.liverEnzymesElevated === true) {
    return {
      recommended: true,
      reason:
        "Unexplained elevated liver enzymes with Gilbert syndrome (exposure not reported separately).",
    };
  }
  if (facts.gilbertYes && labs.liverEnzymesElevated === null) {
    return {
      recommended: false,
      reason: `${DEFERRED_LABS} (liver enzymes not yet measured; Gilbert syndrome noted). Uses ALT/AST threshold ${thresholds.liverEnzyme_altAstElevated}.`,
    };
  }

  return {
    recommended: false,
    reason: "No heavy-metal trigger from occupation or exposure answers.",
  };
}

const TIER4: {
  term: TermKey;
  run: (
    facts: RulesFacts,
    labs: LabInputs,
    thresholds: ClinicalThresholdValues,
  ) => RuleResult;
}[] = [
  { term: "dutch", run: shouldOrderDUTCH },
  { term: "stool", run: shouldOrderStoolAnalysis },
  { term: "urinaryIodine", run: shouldOrderUrinaryIodine },
  { term: "heavyMetals", run: shouldOrderHeavyMetals },
];

const BASELINE: { term: TermKey; reason: string }[] = [
  {
    term: "routineBloods",
    reason:
      "Baseline panel for every Pathway A user (source protocol) — routine bloods.",
  },
  {
    term: "thyroid",
    reason:
      "Baseline panel for every Pathway A user — thyroid function plus antibodies.",
  },
  {
    term: "b12FolateFerritin",
    reason:
      "Baseline panel for every Pathway A user — B12, folate, and ferritin.",
  },
  {
    term: "fastingInsulin",
    reason: "Baseline panel for every Pathway A user — fasting insulin.",
  },
  {
    term: "salivaryCortisol",
    reason: "Baseline panel for every Pathway A user — salivary cortisol.",
  },
];

/**
 * Always includes the Tier 3 baseline. Then loops the four Tier 4 rules
 * and keeps only recommended: true.
 */
export function collectRecommendations(
  facts: RulesFacts,
  labs: LabInputs = PHASE1_LABS,
  thresholds: ClinicalThresholdValues = THRESHOLDS,
): EngineRecommendation[] {
  const out: EngineRecommendation[] = BASELINE.map((item) => ({
    test_tier: 3,
    test_name: item.term,
    trigger_reason: item.reason,
  }));

  for (const rule of TIER4) {
    const result = rule.run(facts, labs, thresholds);
    if (result.recommended) {
      out.push({
        test_tier: 4,
        test_name: rule.term,
        trigger_reason: result.reason,
      });
    }
  }

  return out;
}

/**
 * Section 4 results → intervention table, verbatim from the source protocol.
 * Do not drop, merge, or soften pairings. Change a pairing by editing one
 * object below — trigger_finding and clinical_basis stay exact.
 *
 * DIM/I3C and high-dose algal omega-3 need a practitioner interaction check
 * when the questionnaire has contraceptives / HRT / hormone therapy or
 * blood thinners. Iodine is hard-blocked if antibodies are positive.
 */
export const FINDING_INTERVENTION_TABLE: {
  id: string;
  trigger_finding: string;
  clinical_basis: string;
  plain_reason: string;
  title: string;
  description: string;
  category: InterventionCategory;
  /** Flag DIM/I3C or high-dose omega-3 rows for a practitioner check. */
  needsInteractionCheck: boolean;
}[] = [
  {
    id: "dysbiosis",
    trigger_finding: "Dysbiosis on stool analysis",
    clinical_basis: "Correct dysbiosis; improve vagal tone",
    plain_reason:
      "The stool analysis suggested the mix of gut bacteria is out of balance.",
    title: "Gut-bacteria balance and vagal-tone support",
    description:
      "Draft idea from the protocol pairing for dysbiosis. Not an instruction.",
    category: "supplement",
    needsInteractionCheck: false,
  },
  {
    id: "beta_glucuronidase",
    trigger_finding: "Raised stool beta-glucuronidase",
    clinical_basis: "Calcium-D-glucarate",
    plain_reason:
      "The stool analysis showed a raised beta-glucuronidase reading.",
    title: "Calcium-D-glucarate (draft)",
    description:
      "Draft idea from the protocol pairing for raised stool beta-glucuronidase. Not an instruction.",
    category: "supplement",
    needsInteractionCheck: false,
  },
  {
    id: "liver_barrier",
    trigger_finding: "Impaired liver detox / barrier dysfunction",
    clinical_basis: "Liver-support and gut-barrier-repair supplementation",
    plain_reason:
      "Markers suggested liver detox or the gut barrier may be under strain.",
    title: "Liver-support and gut-barrier-repair (draft)",
    description:
      "Draft idea from the protocol pairing for impaired liver detox / barrier dysfunction. Not an instruction.",
    category: "supplement",
    needsInteractionCheck: false,
  },
  {
    id: "zonulin",
    trigger_finding: "Positive zonulin (barrier breakage)",
    clinical_basis: "Vitamin D correction; vitamin A",
    plain_reason:
      "A positive zonulin result can mean the gut barrier is more open than usual.",
    title: "Vitamin D and vitamin A (draft)",
    description:
      "Draft idea from the protocol pairing for positive zonulin (barrier breakage). Not an instruction.",
    category: "supplement",
    needsInteractionCheck: false,
  },
  {
    id: "undigested",
    trigger_finding: "Undigested protein/fat",
    clinical_basis: "Digestive enzyme supplementation",
    plain_reason: "The stool check showed undigested protein or fat.",
    title: "Digestive enzymes (draft)",
    description:
      "Draft idea from the protocol pairing for undigested protein/fat. Not an instruction.",
    category: "supplement",
    needsInteractionCheck: false,
  },
  {
    id: "fasting_insulin",
    trigger_finding: "Raised fasting insulin",
    clinical_basis: "Cardiometabolic diet; insulin-resistance management",
    plain_reason: `Fasting insulin was above the stored threshold (${THRESHOLDS.fastingInsulin_elevated}).`,
    title: "Cardiometabolic eating pattern (draft)",
    description:
      "Draft idea from the protocol pairing for raised fasting insulin. Not an instruction.",
    category: "diet",
    needsInteractionCheck: false,
  },
  {
    id: "thyroid",
    trigger_finding: "Abnormal thyroid function",
    clinical_basis:
      "Thyroxine replacement and/or thyroid autoimmunity correction",
    plain_reason:
      "Thyroid function results were outside the range this protocol uses.",
    title: "Thyroid follow-up with a practitioner (draft)",
    description:
      "Draft idea from the protocol pairing for abnormal thyroid function. Not an instruction.",
    category: "referral",
    needsInteractionCheck: false,
  },
  {
    id: "adrenal",
    trigger_finding: "Impaired adrenal resilience (cortisol)",
    clinical_basis: "Adaptogens; sleep-improvement strategies",
    plain_reason:
      "Cortisol results suggested adrenal resilience may be reduced.",
    title: "Adaptogens and sleep-improvement ideas (draft)",
    description:
      "Draft idea from the protocol pairing for impaired adrenal resilience (cortisol). Not an instruction.",
    category: "lifestyle",
    needsInteractionCheck: false,
  },
  {
    id: "stress",
    trigger_finding: "Medium/high self-rated stress",
    clinical_basis:
      "Structured stress-coping support (challenge-framing + social connection)",
    plain_reason: "You rated your own stress as medium or high.",
    title: "Structured stress-coping support (draft)",
    description:
      "Draft idea from the protocol pairing for medium/high self-rated stress. Not an instruction.",
    category: "coaching",
    needsInteractionCheck: false,
  },
  {
    id: "toxin",
    trigger_finding: "Elevated toxin exposure",
    clinical_basis:
      "Sauna therapy; magnesium salt baths; glutathione support",
    plain_reason:
      "Work, environment answers, or a toxin panel suggested higher exposure.",
    title: "Sauna, magnesium baths, and glutathione support (draft)",
    description:
      "Draft idea from the protocol pairing for elevated toxin exposure. Not an instruction.",
    category: "therapy",
    needsInteractionCheck: false,
  },
  {
    id: "iodine",
    trigger_finding: "Low urinary iodine (antibodies NEGATIVE)",
    clinical_basis:
      "Iodine supplementation (blocked if antibodies positive)",
    plain_reason:
      "Urinary iodine looked low, and thyroid antibodies were not positive.",
    title: "Iodine supplementation (draft)",
    description:
      "Draft idea from the protocol pairing for low urinary iodine when antibodies are negative. Not an instruction.",
    category: "supplement",
    needsInteractionCheck: false,
  },
  {
    id: "methylation",
    trigger_finding: "Methylation-pathway SNP issues",
    clinical_basis: "Methyl-donor supplementation",
    plain_reason:
      "The genetics panel flagged methylation-pathway SNP issues.",
    title: "Methyl-donor supplementation (draft)",
    description:
      "Draft idea from the protocol pairing for methylation-pathway SNP issues. Not an instruction.",
    category: "supplement",
    needsInteractionCheck: false,
  },
  {
    id: "inflammatory",
    trigger_finding: "General inflammatory / oxidative burden",
    clinical_basis:
      "Resveratrol, turmeric, high-dose algal omega-3, Glutathione/NAC",
    plain_reason:
      "Results suggested a general inflammatory or oxidative burden.",
    title: "Resveratrol, turmeric, algal omega-3, Glutathione/NAC (draft)",
    description:
      "Draft idea from the protocol pairing for general inflammatory / oxidative burden. High-dose omega-3 needs a practitioner check if you use hormones or blood thinners. Not an instruction.",
    category: "supplement",
    needsInteractionCheck: true,
  },
  {
    id: "oestrogen_detox",
    trigger_finding: "Impaired oestrogen-detoxification (SNP/DUTCH)",
    clinical_basis: "Soy isoflavones and DIM/I3C",
    plain_reason:
      "SNP or DUTCH results suggested impaired oestrogen detoxification.",
    title: "Soy isoflavones and DIM/I3C (draft)",
    description:
      "Draft idea from the protocol pairing for impaired oestrogen-detoxification (SNP/DUTCH). DIM/I3C needs a practitioner check if you use hormones or blood thinners. Not an instruction.",
    category: "supplement",
    needsInteractionCheck: true,
  },
];

export type DraftIntervention = {
  trigger_finding: string;
  plain_reason: string;
  category: InterventionCategory;
  title: string;
  description: string;
  clinical_basis: string;
  status: "draft";
  clinician_interaction_check: boolean;
};

function iodineHardBlocked(facts: RulesFacts, labs: LabInputs): boolean {
  // Same Phase 1 hard-stop as shouldOrderUrinaryIodine.
  return (
    labs.thyroidAntibodiesPositive === true || facts.autoimmuneThyroid
  );
}

function hormoneOrBloodThinnerInteraction(facts: RulesFacts): boolean {
  return facts.contraceptiveUse || facts.hrtUse || facts.bloodThinners;
}

function hasOestrogenDetoxSnp(labs: LabInputs): boolean {
  return (
    labs.snpCyp1a1 === true ||
    labs.snpCyp1b1 === true ||
    labs.snpComtImpaired === true
  );
}

function findingIsPresent(
  id: string,
  facts: RulesFacts,
  labs: LabInputs,
  thresholds: ClinicalThresholdValues,
): boolean {
  switch (id) {
    case "dysbiosis":
      return labs.stoolDysbiosis === true;
    case "beta_glucuronidase":
      return labs.stoolBetaGlucuronidaseRaised === true;
    case "liver_barrier":
      return labs.liverDetoxOrBarrierImpaired === true;
    case "zonulin":
      return labs.zonulinPositive === true;
    case "undigested":
      return labs.undigestedProteinOrFat === true;
    case "fasting_insulin":
      return (
        labs.fastingInsulin !== null &&
        labs.fastingInsulin > thresholds.fastingInsulin_elevated
      );
    case "thyroid":
      return (
        labs.abnormalThyroidFunction === true ||
        (labs.tsh !== null && labs.tsh > thresholds.tsh_subclinicalHypo)
      );
    case "adrenal":
      return (
        labs.cortisolAbnormal === true ||
        labs.adrenalResilienceImpaired === true
      );
    case "stress":
      return facts.stressMediumOrHigh;
    case "toxin": {
      const fromAnswers =
        occupationIsHighRisk(facts.occupation) ||
        facts.pollutantExposure ||
        facts.vehicleExhaust;
      return labs.elevatedToxinExposure === true || fromAnswers;
    }
    case "iodine": {
      if (iodineHardBlocked(facts, labs)) {
        return false;
      }
      if (labs.urinaryIodineLow === true) {
        return true;
      }
      // Phase 1 / partial labs: dietary iodine answers stand in until a urine result exists.
      if (labs.urinaryIodineLow === null && facts.dietaryIodineLow) {
        return true;
      }
      return false;
    }
    case "methylation":
      return labs.snpMthfr === true;
    case "inflammatory":
      return labs.inflammatoryOxidativeBurden === true;
    case "oestrogen_detox":
      return (
        labs.oestrogenDetoxImpaired === true || hasOestrogenDetoxSnp(labs)
      );
    default:
      return false;
  }
}

function toDraftRow(
  pair: (typeof FINDING_INTERVENTION_TABLE)[number],
  facts: RulesFacts,
): DraftIntervention {
  const interaction =
    pair.needsInteractionCheck && hormoneOrBloodThinnerInteraction(facts);

  return {
    trigger_finding: pair.trigger_finding,
    plain_reason: pair.plain_reason,
    category: pair.category,
    title: pair.title,
    description: pair.description,
    clinical_basis: pair.clinical_basis,
    status: "draft",
    clinician_interaction_check: interaction,
  };
}

/**
 * Turns questionnaire facts + lab / fake flags into draft intervention rows.
 * Every row stores both plain_reason and the exact clinical_basis.
 * Status is always 'draft'. Iodine is omitted when the Phase 1 hard-stop fires.
 */
export function mapResultsToInterventions(
  facts: RulesFacts,
  labs: LabInputs = PHASE1_LABS,
  thresholds: ClinicalThresholdValues = THRESHOLDS,
): DraftIntervention[] {
  const out: DraftIntervention[] = [];

  for (const pair of FINDING_INTERVENTION_TABLE) {
    if (!findingIsPresent(pair.id, facts, labs, thresholds)) {
      continue;
    }
    out.push(toDraftRow(pair, facts));
  }

  return out;
}
