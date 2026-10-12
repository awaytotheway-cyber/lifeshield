/**
 * Turns saved questionnaire JSON + profile into the small fact bag
 * the rules engine needs. Keep parsing here so rules-engine.ts stays logic-only.
 */
import { HIGH_RISK_OCCUPATIONS } from "@/lib/clinical-thresholds";
import { parseFiniteNumber } from "@/lib/questionnaire/numbers";

export type RulesFacts = {
  contraceptiveUse: boolean;
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
  gallstones: boolean;
  chronicGutInfection: boolean;
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
  contraceptiveUse: false,
  hrtUse: false,
  bloodThinners: false,
  gallstones: false,
  chronicGutInfection: false,
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
};

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
    contraceptiveUse: isYes(reproductive?.contraceptive_use),
    hrtUse:
      isYes(reproductive?.hrt_use) ||
      hasActiveMedicationCode(input.medications, "hormones"),
    bloodThinners: hasActiveMedicationCode(input.medications, "blood_thinners"),
    gallstones: isYes(comorbidities?.gallstones),
    chronicGutInfection: infections.includes("gut"),
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
