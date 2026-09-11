import {
  SKIPPED_REPRODUCTIVE_DETAIL_KEY,
  SYMPTOM_INTERRUPT_CLEARED_KEY,
} from "@/lib/constants";
import { numberToField, parseFiniteNumber } from "@/lib/questionnaire/numbers";
import type {
  ComorbiditiesForm,
  ComorbiditiesParsed,
  DemographicsForm,
  DemographicsParsed,
  DietEnvironmentForm,
  DietEnvironmentParsed,
  FamilyHistoryForm,
  FamilyHistoryParsed,
  LifestyleForm,
  LifestyleParsed,
  PersonalHistoryForm,
  PersonalHistoryParsed,
  PriorScreeningForm,
  PriorScreeningParsed,
  RadiationForm,
  RadiationParsed,
  ReproductiveForm,
  ReproductiveParsed,
  StressForm,
  StressParsed,
} from "@/lib/questionnaire/schemas";
import {
  emptyFamilyHistory,
  emptyPriorScreening,
} from "@/lib/questionnaire/schemas";

function yesNoFromUnknown(value: unknown): "yes" | "no" | "" {
  if (value === true || value === "yes") {
    return "yes";
  }
  if (value === false || value === "no") {
    return "no";
  }
  return "";
}

function splitOther(stored: string | null | undefined): {
  value: string;
  other: string;
} {
  if (!stored) {
    return { value: "", other: "" };
  }
  if (stored.startsWith("other:")) {
    return { value: "other", other: stored.slice("other:".length) };
  }
  return { value: stored, other: "" };
}

function joinOther(value: string, other: string): string {
  if (value === "other") {
    return `other:${other.trim()}`;
  }
  return value;
}

export function parseStoredOther(stored: string | null | undefined) {
  return splitOther(stored);
}

export function toStoredOther(value: string, other: string) {
  return joinOther(value, other);
}

export function demographicsToProfile(parsed: DemographicsParsed) {
  return {
    date_of_birth: parsed.dateOfBirth,
    sex: parsed.sex,
    height_cm: parsed.heightCm,
    weight_kg: parsed.weightKg,
    waist_cm: parsed.waistCm,
    hip_cm: parsed.hipCm,
    ethnicity: joinOther(parsed.ethnicity, parsed.ethnicityOther),
    country_of_origin: joinOther(parsed.countryOfOrigin, parsed.countryOther),
  };
}

export function profileToDemographicsForm(profile: {
  date_of_birth?: string | null;
  sex?: string | null;
  height_cm?: number | string | null;
  weight_kg?: number | string | null;
  waist_cm?: number | string | null;
  hip_cm?: number | string | null;
  ethnicity?: string | null;
  country_of_origin?: string | null;
} | null): DemographicsForm {
  const ethnicity = splitOther(profile?.ethnicity);
  const country = splitOther(profile?.country_of_origin);
  const sex = profile?.sex;
  return {
    dateOfBirth: profile?.date_of_birth ? String(profile.date_of_birth).slice(0, 10) : "",
    sex:
      sex === "male" || sex === "female" || sex === "other"
        ? sex
        : (undefined as unknown as DemographicsForm["sex"]),
    heightCm: numberToField(profile?.height_cm),
    weightKg: numberToField(profile?.weight_kg),
    waistCm: numberToField(profile?.waist_cm),
    hipCm: numberToField(profile?.hip_cm),
    ethnicity: ethnicity.value,
    ethnicityOther: ethnicity.other,
    countryOfOrigin: country.value,
    countryOther: country.other,
  };
}

/** True when section 2 skipped period/pregnancy questions (sex = male). */
export function skippedReproductiveFromJson(
  json: Record<string, unknown> | null,
): boolean {
  return json?.[SKIPPED_REPRODUCTIVE_DETAIL_KEY] === true;
}

/**
 * Save a “these questions don’t apply” row so the hub can still mark section 2
 * done after the safety interrupt. Field names stay the same for the rules engine.
 */
export function skippedReproductiveToJson(
  interruptCleared: boolean,
): Record<string, unknown> {
  return {
    [SKIPPED_REPRODUCTIVE_DETAIL_KEY]: true,
    contraceptive_use: false,
    amenorrhoea: false,
    breastfeeding: false,
    [SYMPTOM_INTERRUPT_CLEARED_KEY]: interruptCleared,
  };
}

export function reproductiveToJson(
  parsed: ReproductiveParsed,
  interruptCleared: boolean,
): Record<string, unknown> {
  return {
    [SKIPPED_REPRODUCTIVE_DETAIL_KEY]: false,
    age_at_first_period: parsed.ageAtFirstPeriod,
    contraceptive_use: parsed.contraceptiveUse === "yes",
    contraceptive_type:
      parsed.contraceptiveUse === "yes" ? parsed.contraceptiveType : null,
    contraceptive_duration_years:
      parsed.contraceptiveUse === "yes"
        ? parseFiniteNumber(parsed.contraceptiveDurationYears)
        : null,
    amenorrhoea: parsed.amenorrhoea === "yes",
    amenorrhoea_episodes:
      parsed.amenorrhoea === "yes"
        ? parseFiniteNumber(parsed.amenorrhoeaEpisodes)
        : null,
    amenorrhoea_cause:
      parsed.amenorrhoea === "yes" ? parsed.amenorrhoeaCause.trim() || null : null,
    menstrual_regularity: parsed.menstrualRegularity,
    cycle_length_days: parsed.cycleLengthDays,
    menopausal_status: parsed.menopausalStatus,
    pregnancies: parsed.pregnancies,
    live_births: parsed.liveBirths,
    age_at_first_birth:
      parsed.liveBirths > 0 ? parseFiniteNumber(parsed.ageAtFirstBirth) : null,
    breastfeeding: parsed.breastfeeding === "yes",
    breastfeeding_months:
      parsed.breastfeeding === "yes"
        ? parseFiniteNumber(parsed.breastfeedingMonths)
        : null,
    [SYMPTOM_INTERRUPT_CLEARED_KEY]: interruptCleared,
  };
}

export function jsonToReproductiveForm(
  json: Record<string, unknown> | null,
): ReproductiveForm {
  const contraceptive = yesNoFromUnknown(json?.contraceptive_use);
  const amenorrhoea = yesNoFromUnknown(json?.amenorrhoea);
  const regularity = json?.menstrual_regularity;
  const meno = json?.menopausal_status;
  const breastfeeding = yesNoFromUnknown(json?.breastfeeding);
  return {
    ageAtFirstPeriod: numberToField(json?.age_at_first_period),
    contraceptiveUse: (contraceptive ||
      undefined) as ReproductiveForm["contraceptiveUse"],
    contraceptiveType: String(json?.contraceptive_type ?? ""),
    contraceptiveDurationYears: numberToField(json?.contraceptive_duration_years),
    amenorrhoea: (amenorrhoea || undefined) as ReproductiveForm["amenorrhoea"],
    amenorrhoeaEpisodes: numberToField(json?.amenorrhoea_episodes),
    amenorrhoeaCause: String(json?.amenorrhoea_cause ?? ""),
    menstrualRegularity: (regularity === "regular" || regularity === "irregular"
      ? regularity
      : undefined) as ReproductiveForm["menstrualRegularity"],
    cycleLengthDays: numberToField(json?.cycle_length_days),
    menopausalStatus: (meno === "pre" || meno === "peri" || meno === "post"
      ? meno
      : undefined) as ReproductiveForm["menopausalStatus"],
    pregnancies: numberToField(json?.pregnancies),
    liveBirths: numberToField(json?.live_births),
    ageAtFirstBirth: numberToField(json?.age_at_first_birth),
    breastfeeding: (breastfeeding ||
      undefined) as ReproductiveForm["breastfeeding"],
    breastfeedingMonths: numberToField(json?.breastfeeding_months),
  };
}

export function radiationToJson(parsed: RadiationParsed): Record<string, unknown> {
  return {
    radiation_exposure: parsed.radiationExposure === "yes",
    radiation_type:
      parsed.radiationExposure === "yes" ? parsed.radiationType : null,
    radiation_body_area:
      parsed.radiationExposure === "yes" ? parsed.radiationBodyArea.trim() : null,
    radiation_dates:
      parsed.radiationExposure === "yes" ? parsed.radiationDates.trim() : null,
    occupation: parsed.occupation.trim(),
    night_shift: parsed.nightShift,
    night_shift_years:
      parsed.nightShift === "no"
        ? null
        : parseFiniteNumber(parsed.nightShiftYears),
  };
}

export function jsonToRadiationForm(
  json: Record<string, unknown> | null,
): RadiationForm {
  const exposure = yesNoFromUnknown(json?.radiation_exposure);
  const night = json?.night_shift;
  return {
    radiationExposure: (exposure ||
      undefined) as RadiationForm["radiationExposure"],
    radiationType: String(json?.radiation_type ?? ""),
    radiationBodyArea: String(json?.radiation_body_area ?? ""),
    radiationDates: String(json?.radiation_dates ?? ""),
    occupation: String(json?.occupation ?? ""),
    nightShift: (night === "current" || night === "past" || night === "no"
      ? night
      : undefined) as RadiationForm["nightShift"],
    nightShiftYears: numberToField(json?.night_shift_years),
  };
}

export function comorbiditiesToJson(
  parsed: ComorbiditiesParsed,
): Record<string, unknown> {
  return {
    gilbert: parsed.gilbert,
    gallstones: parsed.gallstones === "yes",
    obesity: parsed.obesity === "yes",
    diabetes: parsed.diabetes === "yes",
    thyroid_disease: parsed.thyroidDisease === "yes",
    thyroid_type:
      parsed.thyroidDisease === "yes" ? parsed.thyroidType.trim() : null,
    autoimmune_thyroid: parsed.autoimmuneThyroid === "yes",
    chronic_infections: parsed.chronicInfections,
  };
}

export function jsonToComorbiditiesForm(
  json: Record<string, unknown> | null,
): ComorbiditiesForm {
  const gilbert = json?.gilbert;
  const infections = json?.chronic_infections;
  return {
    gilbert: (gilbert === "yes" || gilbert === "no" || gilbert === "dont_know"
      ? gilbert
      : undefined) as ComorbiditiesForm["gilbert"],
    gallstones: (yesNoFromUnknown(json?.gallstones) ||
      undefined) as ComorbiditiesForm["gallstones"],
    obesity: (yesNoFromUnknown(json?.obesity) ||
      undefined) as ComorbiditiesForm["obesity"],
    diabetes: (yesNoFromUnknown(json?.diabetes) ||
      undefined) as ComorbiditiesForm["diabetes"],
    thyroidDisease: (yesNoFromUnknown(json?.thyroid_disease) ||
      undefined) as ComorbiditiesForm["thyroidDisease"],
    thyroidType: String(json?.thyroid_type ?? ""),
    autoimmuneThyroid: (yesNoFromUnknown(json?.autoimmune_thyroid) ||
      undefined) as ComorbiditiesForm["autoimmuneThyroid"],
    chronicInfections: Array.isArray(infections)
      ? infections.filter((item): item is string => typeof item === "string")
      : [],
  };
}

export function familyHistoryToJson(
  parsed: FamilyHistoryParsed,
  interruptCleared: boolean,
): Record<string, unknown> {
  return {
    breast_cancer: parsed.breastCancer === "yes",
    breast_relatives:
      parsed.breastCancer === "yes"
        ? parsed.breastRelatives
            .filter((row) => row.relationship && row.ageAtDiagnosis.trim())
            .map((row) => ({
              relationship: row.relationship,
              age_at_diagnosis: parseFiniteNumber(row.ageAtDiagnosis),
            }))
        : [],
    ovarian_cancer: parsed.ovarianCancer === "yes",
    ovarian_relationship:
      parsed.ovarianCancer === "yes" ? parsed.ovarianRelationship : null,
    colon_cancer: parsed.colonCancer === "yes",
    colon_relationship:
      parsed.colonCancer === "yes" ? parsed.colonRelationship : null,
    melanoma: parsed.melanoma === "yes",
    melanoma_relationship:
      parsed.melanoma === "yes" ? parsed.melanomaRelationship : null,
    [SYMPTOM_INTERRUPT_CLEARED_KEY]: interruptCleared,
  };
}

export function jsonToFamilyHistoryForm(
  json: Record<string, unknown> | null,
): FamilyHistoryForm {
  const empty = emptyFamilyHistory();
  const relatives = json?.breast_relatives;
  const mappedRelatives = Array.isArray(relatives)
    ? relatives.map((row) => {
        const rec = row as Record<string, unknown>;
        return {
          relationship: String(rec.relationship ?? ""),
          ageAtDiagnosis: numberToField(
            rec.age_at_diagnosis ?? rec.ageAtDiagnosis,
          ),
        };
      })
    : empty.breastRelatives;

  return {
    breastCancer: (yesNoFromUnknown(json?.breast_cancer) ||
      undefined) as FamilyHistoryForm["breastCancer"],
    breastRelatives:
      mappedRelatives.length > 0 ? mappedRelatives : empty.breastRelatives,
    ovarianCancer: (yesNoFromUnknown(json?.ovarian_cancer) ||
      undefined) as FamilyHistoryForm["ovarianCancer"],
    ovarianRelationship: String(json?.ovarian_relationship ?? ""),
    colonCancer: (yesNoFromUnknown(json?.colon_cancer) ||
      undefined) as FamilyHistoryForm["colonCancer"],
    colonRelationship: String(json?.colon_relationship ?? ""),
    melanoma: (yesNoFromUnknown(json?.melanoma) ||
      undefined) as FamilyHistoryForm["melanoma"],
    melanomaRelationship: String(json?.melanoma_relationship ?? ""),
  };
}

export function interruptClearedFromJson(
  json: Record<string, unknown> | null,
): boolean {
  return json?.[SYMPTOM_INTERRUPT_CLEARED_KEY] === true;
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string");
}

export function calcPackYears(
  cigsPerDay: unknown,
  years: unknown,
): number | null {
  const cigs = parseFiniteNumber(cigsPerDay);
  const smokedYears = parseFiniteNumber(years);
  if (cigs === null || smokedYears === null) {
    return null;
  }
  const packYears = (cigs * smokedYears) / 20;
  return Number.isFinite(packYears) ? Math.round(packYears * 10) / 10 : null;
}

export function personalHistoryToJson(
  parsed: PersonalHistoryParsed,
): Record<string, unknown> {
  const smoked = parsed.smoking === "current" || parsed.smoking === "former";
  const cigs = smoked ? parseFiniteNumber(parsed.cigsPerDay) : null;
  const years = smoked ? parseFiniteNumber(parsed.smokingYears) : null;
  return {
    smoking: parsed.smoking,
    cigs_per_day: cigs,
    smoking_years: years,
    pack_years: smoked ? calcPackYears(cigs, years) : null,
    vaping: parsed.vaping === "yes",
    vaping_frequency:
      parsed.vaping === "yes" ? parsed.vapingFrequency.trim() : null,
    alcohol_units_per_week: parsed.alcoholUnitsPerWeek,
    recreational_drugs: parsed.recreationalDrugs === "yes",
    recreational_drugs_type:
      parsed.recreationalDrugs === "yes"
        ? parsed.recreationalDrugsType.trim() || null
        : null,
    caffeine: parsed.caffeine,
  };
}

export function jsonToPersonalHistoryForm(
  json: Record<string, unknown> | null,
): PersonalHistoryForm {
  const smoking = json?.smoking;
  const caffeine = json?.caffeine;
  return {
    smoking: (smoking === "current" || smoking === "former" || smoking === "never"
      ? smoking
      : undefined) as PersonalHistoryForm["smoking"],
    cigsPerDay: numberToField(json?.cigs_per_day),
    smokingYears: numberToField(json?.smoking_years),
    vaping: (yesNoFromUnknown(json?.vaping) ||
      undefined) as PersonalHistoryForm["vaping"],
    vapingFrequency: String(json?.vaping_frequency ?? ""),
    alcoholUnitsPerWeek: numberToField(json?.alcohol_units_per_week),
    recreationalDrugs: (yesNoFromUnknown(json?.recreational_drugs) ||
      undefined) as PersonalHistoryForm["recreationalDrugs"],
    recreationalDrugsType: String(json?.recreational_drugs_type ?? ""),
    caffeine: (caffeine === "none" ||
    caffeine === "1-2" ||
    caffeine === "3-4" ||
    caffeine === "5plus"
      ? caffeine
      : undefined) as PersonalHistoryForm["caffeine"],
  };
}

export function lifestyleToJson(parsed: LifestyleParsed): Record<string, unknown> {
  return {
    sleep_hours: parsed.sleepHours,
    sleep_quality: parsed.sleepQuality,
    relationships: parsed.relationships,
    exercise_types: parsed.exerciseTypes,
    exercise_frequency: parsed.exerciseFrequency,
    exercise_duration: parsed.exerciseDuration,
    water_intake: parsed.waterIntake,
    place_of_work: parsed.placeOfWork.trim(),
    commute_to_city: parsed.commuteToCity === "yes",
    commute_method:
      parsed.commuteToCity === "yes" ? parsed.commuteMethod.trim() : null,
    commute_duration:
      parsed.commuteToCity === "yes" ? parsed.commuteDuration.trim() : null,
    pollutant_exposure: parsed.pollutantExposure,
    vehicle_exhaust: parsed.vehicleExhaust === "yes",
  };
}

export function jsonToLifestyleForm(
  json: Record<string, unknown> | null,
): LifestyleForm {
  const quality = json?.sleep_quality;
  const relationships = json?.relationships;
  const frequency = json?.exercise_frequency;
  const duration = json?.exercise_duration;
  const water = json?.water_intake;
  const pollutant = json?.pollutant_exposure;
  return {
    sleepHours: numberToField(json?.sleep_hours),
    sleepQuality: (quality === "good" || quality === "fair" || quality === "poor"
      ? quality
      : undefined) as LifestyleForm["sleepQuality"],
    relationships: (relationships === "strong" ||
    relationships === "moderate" ||
    relationships === "limited"
      ? relationships
      : undefined) as LifestyleForm["relationships"],
    exerciseTypes: stringArray(json?.exercise_types),
    exerciseFrequency: (frequency === "daily" ||
    frequency === "3-5x" ||
    frequency === "1-2x" ||
    frequency === "rarely" ||
    frequency === "never"
      ? frequency
      : undefined) as LifestyleForm["exerciseFrequency"],
    exerciseDuration: (duration === "lt15" ||
    duration === "15-30" ||
    duration === "30-60" ||
    duration === "60plus"
      ? duration
      : undefined) as LifestyleForm["exerciseDuration"],
    waterIntake: (water === "lt1" ||
    water === "1-2" ||
    water === "2-3" ||
    water === "3plus"
      ? water
      : undefined) as LifestyleForm["waterIntake"],
    placeOfWork: String(json?.place_of_work ?? ""),
    commuteToCity: (yesNoFromUnknown(json?.commute_to_city) ||
      undefined) as LifestyleForm["commuteToCity"],
    commuteMethod: String(json?.commute_method ?? ""),
    commuteDuration: String(json?.commute_duration ?? ""),
    pollutantExposure: (pollutant === "yes" ||
    pollutant === "no" ||
    pollutant === "unsure"
      ? pollutant
      : undefined) as LifestyleForm["pollutantExposure"],
    vehicleExhaust: (yesNoFromUnknown(json?.vehicle_exhaust) ||
      undefined) as LifestyleForm["vehicleExhaust"],
  };
}

export function stressToJson(parsed: StressParsed): Record<string, unknown> {
  return {
    stress_level: parsed.stressLevel,
    stress_view: parsed.stressView,
    stress_reach_out: parsed.stressReachOut,
  };
}

export function jsonToStressForm(
  json: Record<string, unknown> | null,
): StressForm {
  const level = json?.stress_level;
  const view = json?.stress_view;
  const reach = json?.stress_reach_out;
  return {
    stressLevel: (level === "low" || level === "medium" || level === "high"
      ? level
      : undefined) as StressForm["stressLevel"],
    stressView: (view === "harmful" || view === "growth" || view === "mixed"
      ? view
      : undefined) as StressForm["stressView"],
    stressReachOut: (reach === "usually" ||
    reach === "sometimes" ||
    reach === "rarely" ||
    reach === "never"
      ? reach
      : undefined) as StressForm["stressReachOut"],
  };
}

export function dietEnvironmentToJson(
  parsed: DietEnvironmentParsed,
): Record<string, unknown> {
  return {
    canned_food: parsed.cannedFood,
    packaged_food: parsed.packagedFood,
    takeaway: parsed.takeaway,
    microwave: parsed.microwave,
    plastic: parsed.plastic,
    suncream: parsed.suncream,
    nail_varnish: parsed.nailVarnish,
    cosmetics: parsed.cosmetics,
    iodine_sources: parsed.iodineSources,
  };
}

export function jsonToDietEnvironmentForm(
  json: Record<string, unknown> | null,
): DietEnvironmentForm {
  const freq = (value: unknown) =>
    value === "daily" ||
    value === "weekly" ||
    value === "monthly" ||
    value === "rarely" ||
    value === "never"
      ? value
      : undefined;
  const sometimes = (value: unknown) =>
    value === "regularly" || value === "sometimes" || value === "never"
      ? value
      : undefined;
  const suncream = json?.suncream;
  const nails = json?.nail_varnish;
  return {
    cannedFood: freq(json?.canned_food) as DietEnvironmentForm["cannedFood"],
    packagedFood: freq(
      json?.packaged_food,
    ) as DietEnvironmentForm["packagedFood"],
    takeaway: freq(json?.takeaway) as DietEnvironmentForm["takeaway"],
    microwave: sometimes(json?.microwave) as DietEnvironmentForm["microwave"],
    plastic: sometimes(json?.plastic) as DietEnvironmentForm["plastic"],
    suncream: (suncream === "daily" ||
    suncream === "when_sunny" ||
    suncream === "rarely" ||
    suncream === "never"
      ? suncream
      : undefined) as DietEnvironmentForm["suncream"],
    nailVarnish: (nails === "regularly" ||
    nails === "occasionally" ||
    nails === "never"
      ? nails
      : undefined) as DietEnvironmentForm["nailVarnish"],
    cosmetics: stringArray(json?.cosmetics),
    iodineSources: stringArray(json?.iodine_sources),
  };
}

export function priorScreeningToJson(
  parsed: PriorScreeningParsed,
): Record<string, unknown> {
  return {
    previous_mammogram: parsed.previousMammogram === "yes",
    mammograms:
      parsed.previousMammogram === "yes"
        ? parsed.mammograms
            .filter((row) => row.date && row.finding)
            .map((row) => ({
              date: row.date,
              finding: row.finding,
            }))
        : [],
  };
}

export function jsonToPriorScreeningForm(
  json: Record<string, unknown> | null,
): PriorScreeningForm {
  const empty = emptyPriorScreening();
  const rows = json?.mammograms;
  const mapped = Array.isArray(rows)
    ? rows.map((row) => {
        const rec = row as Record<string, unknown>;
        return {
          date: String(rec.date ?? ""),
          finding: String(rec.finding ?? ""),
        };
      })
    : empty.mammograms;
  return {
    previousMammogram: (yesNoFromUnknown(json?.previous_mammogram) ||
      undefined) as PriorScreeningForm["previousMammogram"],
    mammograms: mapped.length > 0 ? mapped : empty.mammograms,
  };
}
