/**
 * Turns saved questionnaire JSON + profile into the small fact bag
 * the rules engine needs. Keep parsing here so rules-engine.ts stays logic-only.
 */
import { HIGH_RISK_OCCUPATIONS } from "@/lib/clinical-thresholds";
import { parseFiniteNumber } from "@/lib/questionnaire/numbers";

export type RulesFacts = {
  /**
   * Hormonal contraception used now or within the last 12 months. The
   * protocol's DUTCH Rule C is "active or recent (<12 months)", so use that
   * stopped longer ago does not count. The contraceptive question asks "have
   * you used it", which is why recency is a separate follow-up.
   *
   * An answer saved before the recency question existed has no value and is
   * treated as recent: over-flagging only over-orders a test, while treating
   * it as old would silently drop the interaction check for someone who may
   * be on the pill today.
   */
  hormonalContraceptionRecent: boolean;
  /**
   * Systemic hormone therapy. True from the reproductive-section HRT answer,
   * or from an active medication tagged "hormones" — the medication route
   * also covers users whose reproductive detail questions were skipped.
   * Triggers the DUTCH test and stool analysis.
   */
  hrtUse: boolean;
  /**
   * Anticoagulant use, from an active medication tagged "blood_thinners".
   * There is no questionnaire item for this on purpose: the medications list
   * is user-maintained and stays current, where a one-off answer would not.
   * Gates the DIM/I3C and high-dose omega-3 practitioner check.
   */
  bloodThinners: boolean;
  /**
   * Thyroid replacement (thyroxine and similar), from an active medication
   * tagged "thyroid_medication" or named as one. Named as well as tagged
   * because people rarely tag their own medications. It gates products tagged
   * "thyroid_medication" for a practitioner check; which products carry that
   * tag is the clinicians' call, set on the product, not decided here.
   */
  thyroidMedication: boolean;
  gallstones: boolean;
  chronicGutInfection: boolean;
  /**
   * Severe PMS, endometriosis or uterine fibroids — the oestrogen-dominant
   * conditions stool analysis Rule A names as a recirculation risk.
   */
  estrogenDominantCondition: boolean;
  /**
   * Ongoing bloating, reflux, loose stools or constipation. The third limb
   * of stool analysis Rule B, alongside gut infection and gallbladder
   * disease.
   */
  digestiveDisturbance: boolean;
  /** Frequent large predatory fish — heavy-metal Rule A. */
  predatoryFishFrequent: boolean;
  /** Drinking water from a well — heavy-metal Rule A. */
  wellWater: boolean;
  bmi: number | null;
  autoimmuneThyroid: boolean;
  dietaryIodineLow: boolean;
  occupation: string;
  pollutantExposure: boolean;
  vehicleExhaust: boolean;
  gilbertYes: boolean;
  stressMediumOrHigh: boolean;
};

/** Empty fact bag for unit tests and “labs only” mapping. */
export const EMPTY_RULES_FACTS: RulesFacts = {
  hormonalContraceptionRecent: false,
  hrtUse: false,
  bloodThinners: false,
  thyroidMedication: false,
  gallstones: false,
  chronicGutInfection: false,
  estrogenDominantCondition: false,
  digestiveDisturbance: false,
  predatoryFishFrequent: false,
  wellWater: false,
  bmi: null,
  autoimmuneThyroid: false,
  dietaryIodineLow: false,
  occupation: "",
  pollutantExposure: false,
  vehicleExhaust: false,
  gilbertYes: false,
  stressMediumOrHigh: false,
};

function isYes(value: unknown): boolean {
  return value === true || value === "yes";
}

/**
 * True when a multi-select holds a real answer rather than only the
 * "none of these" escape or nothing at all.
 */
function hasRealSelection(values: readonly string[]): boolean {
  return values.some((item) => item !== "none" && item.trim() !== "");
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string");
}

export function occupationIsHighRisk(occupation: string): boolean {
  const text = occupation.toLowerCase();
  return HIGH_RISK_OCCUPATIONS.some((job) => text.includes(job));
}

/** Just enough of a medication row to answer "is this code active?". */
export type MedicationFact = {
  contraindication_codes: readonly string[];
  active: boolean;
  /** The name as the patient entered it; optional for older callers. */
  name?: string;
};

/**
 * Generic and common brand names for thyroid replacement. A starting list for
 * clinician review: a miss only means the tag route is needed, and matching is
 * on whole words so "thyroid support herbal blend" does not count.
 */
const THYROID_REPLACEMENT_NAMES = [
  "thyroxine",
  "levothyroxine",
  "liothyronine",
  "eltroxin",
  "euthyrox",
  "synthroid",
  "thyronorm",
  "unithroid",
  "cytomel",
];

export function hasActiveThyroidReplacement(
  medications: readonly MedicationFact[] | undefined,
): boolean {
  if (!medications) {
    return false;
  }
  return medications.some((med) => {
    if (!med.active || !med.name) {
      return false;
    }
    const words = med.name.toLowerCase().split(/[^a-z]+/);
    return THYROID_REPLACEMENT_NAMES.some((name) => words.includes(name));
  });
}

/**
 * Contraindication tags are free text on the medications table. Match
 * case-insensitively and ignore inactive rows so a stopped prescription
 * does not keep gating a recommendation forever.
 */
export function hasActiveMedicationCode(
  medications: readonly MedicationFact[] | undefined,
  code: string,
): boolean {
  if (!medications) {
    return false;
  }
  const wanted = code.trim().toLowerCase();
  return medications.some(
    (med) =>
      med.active &&
      med.contraindication_codes.some(
        (raw) => typeof raw === "string" && raw.trim().toLowerCase() === wanted,
      ),
  );
}

export function factsFromSavedAnswers(input: {
  bmi: unknown;
  sections: Record<string, Record<string, unknown> | null>;
  /**
   * Omit when the caller has no medication data. Both hormone-therapy and
   * anticoagulant facts then fall back to the questionnaire alone, which is
   * the pre-existing behaviour.
   */
  medications?: readonly MedicationFact[];
}): RulesFacts {
  const reproductive = input.sections.reproductive_menstrual;
  const comorbidities = input.sections.comorbidities;
  const radiation = input.sections.radiation_occupational;
  const lifestyle = input.sections.lifestyle;
  const stress = input.sections.stress;
  const diet = input.sections.diet_environment;

  const infections = stringList(comorbidities?.chronic_infections);
  const iodine = stringList(diet?.iodine_sources);
  const hasRealIodine = iodine.some(
    (item) => item !== "none" && item.trim() !== "",
  );

  const stressLevel = stress?.stress_level;

  return {
    hormonalContraceptionRecent:
      isYes(reproductive?.contraceptive_use) &&
      reproductive?.contraceptive_last_use !== "over_year",
    hrtUse:
      isYes(reproductive?.hrt_use) ||
      hasActiveMedicationCode(input.medications, "hormones"),
    bloodThinners: hasActiveMedicationCode(input.medications, "blood_thinners"),
    thyroidMedication:
      hasActiveMedicationCode(input.medications, "thyroid_medication") ||
      hasActiveThyroidReplacement(input.medications),
    gallstones: isYes(comorbidities?.gallstones),
    chronicGutInfection: infections.includes("gut"),
    estrogenDominantCondition: hasRealSelection(
      stringList(reproductive?.estrogen_conditions),
    ),
    digestiveDisturbance: hasRealSelection(
      stringList(comorbidities?.digestive_disturbance),
    ),
    // "Frequent" per the source rule — monthly or rarer is not a
    // meaningful mercury exposure signal.
    predatoryFishFrequent:
      diet?.predatory_fish === "daily" || diet?.predatory_fish === "weekly",
    wellWater: isYes(diet?.well_water),
    bmi: parseFiniteNumber(input.bmi),
    autoimmuneThyroid: isYes(comorbidities?.autoimmune_thyroid),
    dietaryIodineLow: diet == null ? false : !hasRealIodine,
    occupation: String(radiation?.occupation ?? ""),
    pollutantExposure: lifestyle?.pollutant_exposure === "yes",
    vehicleExhaust: isYes(lifestyle?.vehicle_exhaust),
    gilbertYes: comorbidities?.gilbert === "yes",
    stressMediumOrHigh: stressLevel === "medium" || stressLevel === "high",
  };
}
