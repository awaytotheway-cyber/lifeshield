/**
 * Plain-language dictionary.
 *
 * plainName = big heading the user sees.
 * plainExplanation = one everyday sentence.
 * medicalName = exact clinical term, always kept underneath.
 *
 * To change wording later: edit the matching key here
 * (plainName, plainExplanation, or medicalName).
 * If a key is missing, ClinicalTerm still renders the medical name
 * plus "plain explanation coming soon" — never a blank crash.
 */
export type TermEntry = {
  plainName: string;
  plainExplanation: string;
  medicalName: string;
};

export const TERMS = {
  // ---- Tier 1 ----
  brca: {
    plainName: "Inherited risk gene check",
    plainExplanation:
      "Looks for two inherited gene changes that can raise breast and ovarian cancer risk.",
    medicalName: "BRCA1/2 genetic testing",
  },
  ctc: {
    plainName: "Early cell check (blood test)",
    plainExplanation:
      "A blood test that looks for rare cancer-type cells circulating in the body.",
    medicalName: "Circulating tumour cell (CTC) test — liquid biopsy",
  },
  // ---- Tier 2 ----
  snp: {
    plainName: "Personal genetics panel",
    plainExplanation:
      "Reads small gene variations that affect how your body handles hormones and toxins.",
    medicalName: "SNP risk-modification panel (buccal/saliva swab)",
  },
  // ---- Tier 3 baseline ----
  routineBloods: {
    plainName: "Routine bloods",
    plainExplanation:
      "A standard blood panel a practitioner may use as a starting point for lifestyle discussion.",
    medicalName: "Routine bloods (baseline panel)",
  },
  thyroid: {
    plainName: "Thyroid check",
    plainExplanation:
      "Checks the gland that controls your energy and metabolism, including immune markers.",
    medicalName: "Thyroid function (TSH, Free T3, Free T4) + antibodies (TPOAb, TgAb)",
  },
  fastingInsulin: {
    plainName: "Blood sugar handling",
    plainExplanation:
      "Shows how well your body manages blood sugar, measured after fasting.",
    medicalName: "Fasting insulin",
  },
  salivaryCortisol: {
    plainName: "Stress hormone rhythm",
    plainExplanation:
      "Measures your stress hormone across the day to gauge how your body copes with stress.",
    medicalName: "Salivary cortisol (adrenal reserve)",
  },
  b12FolateFerritin: {
    plainName: "Energy & iron levels",
    plainExplanation:
      "Key vitamins and iron stores that affect energy and cell health.",
    medicalName: "Active B12, folate, ferritin",
  },
  // ---- Tier 4 ----
  dutch: {
    plainName: "Detailed hormone map",
    plainExplanation:
      "A urine test showing how your body makes and clears hormones over a full cycle.",
    medicalName: "DUTCH — Dried Urine Test for Comprehensive Hormones",
  },
  stool: {
    plainName: "Gut health check",
    plainExplanation:
      "Looks at gut bacteria balance and digestion, which affect hormone clearance.",
    medicalName: "Stool beta-glucuronidase, microbial diversity & zonulin",
  },
  urinaryIodine: {
    plainName: "Iodine level",
    plainExplanation:
      "Checks iodine, a mineral your thyroid needs. Only tested when it's safe to.",
    medicalName: "Urinary iodine",
  },
  heavyMetals: {
    plainName: "Toxic metal exposure",
    plainExplanation:
      "Checks for build-up of metals like lead or mercury from environment or work.",
    medicalName: "Heavy metal exposure panel",
  },
  cyp450: {
    plainName: "Detox pathway reading",
    plainExplanation:
      "Shows how well your liver processes substances, flagged for the clinician.",
    medicalName: "CYP450 liver-enzyme functional assessment",
  },
  // ---- genes ----
  comt: {
    plainName: "COMT gene",
    plainExplanation: "Affects how you break down stress hormones and oestrogen.",
    medicalName: "COMT",
  },
  mthfr: {
    plainName: "MTHFR gene",
    plainExplanation:
      "Affects a process called methylation used in detox and repair.",
    medicalName: "MTHFR",
  },
  cyp1a1: {
    plainName: "CYP1A1 gene",
    plainExplanation: "Involved in how oestrogen is processed.",
    medicalName: "CYP1A1",
  },
  cyp1b1: {
    plainName: "CYP1B1 gene",
    plainExplanation: "Involved in how oestrogen is processed.",
    medicalName: "CYP1B1",
  },
  gilbert: {
    plainName: "Mild bilirubin difference",
    plainExplanation:
      "A common, usually harmless difference in how the liver handles a waste pigment in blood.",
    medicalName: "Gilbert syndrome",
  },
  hashimoto: {
    plainName: "Underactive thyroid (immune type)",
    plainExplanation:
      "The immune system can slow the thyroid gland that sets your energy pace.",
    medicalName: "Hashimoto’s thyroiditis",
  },
  graves: {
    plainName: "Overactive thyroid (immune type)",
    plainExplanation:
      "The immune system can speed up the thyroid gland that sets your energy pace.",
    medicalName: "Graves’ disease",
  },
  amenorrhoea: {
    plainName: "Missed periods",
    plainExplanation:
      "Times when monthly bleeding stops for a while, for any reason.",
    medicalName: "Amenorrhoea",
  },
} as const satisfies Record<string, TermEntry>;

export type TermKey = keyof typeof TERMS;

export function hasTerm(key: string): key is TermKey {
  return Object.prototype.hasOwnProperty.call(TERMS, key);
}

export function getTerm(key: string): TermEntry {
  if (hasTerm(key)) {
    return TERMS[key];
  }
  return {
    plainName: key,
    plainExplanation: "plain explanation coming soon",
    medicalName: key,
  };
}
