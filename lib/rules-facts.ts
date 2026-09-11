/**
 * Turns saved questionnaire JSON + profile into the small fact bag
 * the rules engine needs. Keep parsing here so rules-engine.ts stays logic-only.
 */
import { HIGH_RISK_OCCUPATIONS } from "@/lib/clinical-thresholds";
import { parseFiniteNumber } from "@/lib/questionnaire/numbers";

export type RulesFacts = {
  contraceptiveUse: boolean;
  /** HRT is not a dedicated field in Phase 1; always false until that question exists. */
  hrtUse: boolean;
  /**
   * Blood-thinner use is not a dedicated Phase 1 question.
   * Leave false unless a later screen (or a test) sets it.
   * Used only for DIM/I3C and high-dose omega-3 interaction checks.
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

export function factsFromSavedAnswers(input: {
  bmi: unknown;
  sections: Record<string, Record<string, unknown> | null>;
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
    hrtUse: false,
    bloodThinners: false,
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
