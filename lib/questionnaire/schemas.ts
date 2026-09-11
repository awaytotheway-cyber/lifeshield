import { z } from "zod";

import { isHHmm } from "@/lib/datetime";
import {
  isRealIsoDate,
  isValidIsoCalendarDate,
  parseFiniteNumber,
} from "@/lib/questionnaire/numbers";
import {
  optionalNumberField,
  requiredNumberField,
  yesNoSchema,
} from "@/lib/questionnaire/zod-fields";

export const demographicsSchema = z
  .object({
    dateOfBirth: z
      .string()
      .min(1, "Pick a date of birth")
      .refine(isRealIsoDate, "Pick a real date of birth"),
    sex: z.enum(["male", "female", "other"], {
      message: "Please choose sex",
    }),
    heightCm: requiredNumberField("height (cm)", 80, 250),
    weightKg: requiredNumberField("weight (kg)", 20, 400),
    waistCm: optionalNumberField("waist (cm)", 30, 250),
    hipCm: optionalNumberField("hip (cm)", 30, 250),
    ethnicity: z.string().min(1, "Please choose ethnicity"),
    ethnicityOther: z.string(),
    countryOfOrigin: z.string().min(1, "Please choose country of origin"),
    countryOther: z.string(),
  })
  .superRefine((values, ctx) => {
    if (values.ethnicity === "other" && values.ethnicityOther.trim() === "") {
      ctx.addIssue({
        code: "custom",
        message: "Please describe ethnicity",
        path: ["ethnicityOther"],
      });
    }
    if (values.countryOfOrigin === "other" && values.countryOther.trim() === "") {
      ctx.addIssue({
        code: "custom",
        message: "Please enter country of origin",
        path: ["countryOther"],
      });
    }
  });

export type DemographicsForm = z.input<typeof demographicsSchema>;
export type DemographicsParsed = z.output<typeof demographicsSchema>;

export const emptyDemographics = (): DemographicsForm => ({
  dateOfBirth: "",
  sex: undefined as unknown as DemographicsForm["sex"],
  heightCm: "",
  weightKg: "",
  waistCm: "",
  hipCm: "",
  ethnicity: "",
  ethnicityOther: "",
  countryOfOrigin: "",
  countryOther: "",
});

export const reproductiveSchema = z
  .object({
    ageAtFirstPeriod: optionalNumberField("age at first period", 8, 25),
    contraceptiveUse: yesNoSchema,
    contraceptiveType: z.string(),
    contraceptiveDurationYears: z.string(),
    amenorrhoea: yesNoSchema,
    amenorrhoeaEpisodes: z.string(),
    amenorrhoeaCause: z.string(),
    menstrualRegularity: z.enum(["regular", "irregular"], {
      message: "Please choose regularity",
    }),
    cycleLengthDays: optionalNumberField("cycle length (days)", 15, 90),
    menopausalStatus: z.enum(["pre", "peri", "post"], {
      message: "Please choose menopausal status",
    }),
    pregnancies: requiredNumberField("pregnancies", 0, 30),
    liveBirths: requiredNumberField("live births", 0, 30),
    ageAtFirstBirth: z.string(),
    breastfeeding: yesNoSchema,
    breastfeedingMonths: z.string(),
  })
  .superRefine((values, ctx) => {
    if (values.contraceptiveUse === "yes") {
      if (!values.contraceptiveType) {
        ctx.addIssue({
          code: "custom",
          message: "Please choose a contraceptive type",
          path: ["contraceptiveType"],
        });
      }
      const years = parseFiniteNumber(values.contraceptiveDurationYears);
      if (years === null) {
        ctx.addIssue({
          code: "custom",
          message: "Enter how many years",
          path: ["contraceptiveDurationYears"],
        });
      }
    }
    if (values.amenorrhoea === "yes") {
      const episodes = parseFiniteNumber(values.amenorrhoeaEpisodes);
      if (episodes === null) {
        ctx.addIssue({
          code: "custom",
          message: "Enter how many episodes",
          path: ["amenorrhoeaEpisodes"],
        });
      }
    }
    if (values.liveBirths > values.pregnancies) {
      ctx.addIssue({
        code: "custom",
        message: "Live births cannot be more than pregnancies",
        path: ["liveBirths"],
      });
    }
    if (values.liveBirths > 0) {
      const ageBirth = parseFiniteNumber(values.ageAtFirstBirth);
      if (ageBirth === null) {
        ctx.addIssue({
          code: "custom",
          message: "Enter age at first birth",
          path: ["ageAtFirstBirth"],
        });
      }
    }
    if (values.breastfeeding === "yes") {
      const months = parseFiniteNumber(values.breastfeedingMonths);
      if (months === null) {
        ctx.addIssue({
          code: "custom",
          message: "Enter months of breastfeeding",
          path: ["breastfeedingMonths"],
        });
      }
    }
  });

export type ReproductiveForm = z.input<typeof reproductiveSchema>;
export type ReproductiveParsed = z.output<typeof reproductiveSchema>;

export const emptyReproductive = (): ReproductiveForm => ({
  ageAtFirstPeriod: "",
  contraceptiveUse: undefined as unknown as ReproductiveForm["contraceptiveUse"],
  contraceptiveType: "",
  contraceptiveDurationYears: "",
  amenorrhoea: undefined as unknown as ReproductiveForm["amenorrhoea"],
  amenorrhoeaEpisodes: "",
  amenorrhoeaCause: "",
  menstrualRegularity:
    undefined as unknown as ReproductiveForm["menstrualRegularity"],
  cycleLengthDays: "",
  menopausalStatus: undefined as unknown as ReproductiveForm["menopausalStatus"],
  pregnancies: "",
  liveBirths: "",
  ageAtFirstBirth: "",
  breastfeeding: undefined as unknown as ReproductiveForm["breastfeeding"],
  breastfeedingMonths: "",
});

export const radiationSchema = z
  .object({
    radiationExposure: yesNoSchema,
    radiationType: z.string(),
    radiationBodyArea: z.string(),
    radiationDates: z.string(),
    occupation: z.string().min(1, "Please enter occupation"),
    nightShift: z.enum(["current", "past", "no"], {
      message: "Please choose night-shift work",
    }),
    nightShiftYears: z.string(),
  })
  .superRefine((values, ctx) => {
    if (values.radiationExposure === "yes") {
      if (!values.radiationType) {
        ctx.addIssue({
          code: "custom",
          message: "Please choose medical or work-related",
          path: ["radiationType"],
        });
      }
      if (!values.radiationBodyArea.trim()) {
        ctx.addIssue({
          code: "custom",
          message: "Please enter the body area",
          path: ["radiationBodyArea"],
        });
      }
      if (!isValidIsoCalendarDate(values.radiationDates.trim())) {
        ctx.addIssue({
          code: "custom",
          message: "Please pick an approximate date on the calendar",
          path: ["radiationDates"],
        });
      }
    }
    if (values.nightShift !== "no") {
      const years = parseFiniteNumber(values.nightShiftYears);
      if (years === null) {
        ctx.addIssue({
          code: "custom",
          message: "Enter total years of night-shift work",
          path: ["nightShiftYears"],
        });
      }
    }
  });

export type RadiationForm = z.input<typeof radiationSchema>;
export type RadiationParsed = z.output<typeof radiationSchema>;

export const emptyRadiation = (): RadiationForm => ({
  radiationExposure: undefined as unknown as RadiationForm["radiationExposure"],
  radiationType: "",
  radiationBodyArea: "",
  radiationDates: "",
  occupation: "",
  nightShift: undefined as unknown as RadiationForm["nightShift"],
  nightShiftYears: "",
});

export const comorbiditiesSchema = z
  .object({
    gilbert: z.enum(["yes", "no", "dont_know"], {
      message: "Please answer this question",
    }),
    gallstones: yesNoSchema,
    obesity: yesNoSchema,
    diabetes: yesNoSchema,
    thyroidDisease: yesNoSchema,
    thyroidType: z.string(),
    autoimmuneThyroid: yesNoSchema,
    chronicInfections: z.array(z.string()).min(1, "Please choose at least one"),
  })
  .superRefine((values, ctx) => {
    if (values.thyroidDisease === "yes" && !values.thyroidType.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "Please describe the thyroid condition",
        path: ["thyroidType"],
      });
    }
  });

export type ComorbiditiesForm = z.input<typeof comorbiditiesSchema>;
export type ComorbiditiesParsed = z.output<typeof comorbiditiesSchema>;

export const emptyComorbidities = (): ComorbiditiesForm => ({
  gilbert: undefined as unknown as ComorbiditiesForm["gilbert"],
  gallstones: undefined as unknown as ComorbiditiesForm["gallstones"],
  obesity: undefined as unknown as ComorbiditiesForm["obesity"],
  diabetes: undefined as unknown as ComorbiditiesForm["diabetes"],
  thyroidDisease: undefined as unknown as ComorbiditiesForm["thyroidDisease"],
  thyroidType: "",
  autoimmuneThyroid:
    undefined as unknown as ComorbiditiesForm["autoimmuneThyroid"],
  chronicInfections: [],
});

const relativeSchema = z.object({
  relationship: z.string(),
  ageAtDiagnosis: z.string(),
});

export const familyHistorySchema = z
  .object({
    breastCancer: yesNoSchema,
    breastRelatives: z.array(relativeSchema),
    ovarianCancer: yesNoSchema,
    ovarianRelationship: z.string(),
    colonCancer: yesNoSchema,
    colonRelationship: z.string(),
    melanoma: yesNoSchema,
    melanomaRelationship: z.string(),
  })
  .superRefine((values, ctx) => {
    if (values.breastCancer === "yes") {
      const valid = values.breastRelatives.filter((row) => {
        const age = parseFiniteNumber(row.ageAtDiagnosis);
        return Boolean(row.relationship) && age !== null;
      });
      if (valid.length === 0) {
        ctx.addIssue({
          code: "custom",
          message: "Add at least one relative and age at diagnosis",
          path: ["breastRelatives"],
        });
      }
    }
    if (values.ovarianCancer === "yes" && !values.ovarianRelationship) {
      ctx.addIssue({
        code: "custom",
        message: "Please choose a relationship",
        path: ["ovarianRelationship"],
      });
    }
    if (values.colonCancer === "yes" && !values.colonRelationship) {
      ctx.addIssue({
        code: "custom",
        message: "Please choose a relationship",
        path: ["colonRelationship"],
      });
    }
    if (values.melanoma === "yes" && !values.melanomaRelationship) {
      ctx.addIssue({
        code: "custom",
        message: "Please choose a relationship",
        path: ["melanomaRelationship"],
      });
    }
  });

export type FamilyHistoryForm = z.input<typeof familyHistorySchema>;
export type FamilyHistoryParsed = z.output<typeof familyHistorySchema>;

export const emptyFamilyHistory = (): FamilyHistoryForm => ({
  breastCancer: undefined as unknown as FamilyHistoryForm["breastCancer"],
  breastRelatives: [{ relationship: "", ageAtDiagnosis: "" }],
  ovarianCancer: undefined as unknown as FamilyHistoryForm["ovarianCancer"],
  ovarianRelationship: "",
  colonCancer: undefined as unknown as FamilyHistoryForm["colonCancer"],
  colonRelationship: "",
  melanoma: undefined as unknown as FamilyHistoryForm["melanoma"],
  melanomaRelationship: "",
});

export const personalHistorySchema = z
  .object({
    smoking: z.enum(["current", "former", "never"], {
      message: "Please choose smoking status",
    }),
    cigsPerDay: z.string(),
    smokingYears: z.string(),
    vaping: yesNoSchema,
    vapingFrequency: z.string(),
    alcoholUnitsPerWeek: requiredNumberField("alcohol units per week", 0, 200),
    recreationalDrugs: yesNoSchema,
    recreationalDrugsType: z.string(),
    caffeine: z.enum(["none", "1-2", "3-4", "5plus"], {
      message: "Please choose caffeine intake",
    }),
  })
  .superRefine((values, ctx) => {
    if (values.smoking === "current" || values.smoking === "former") {
      if (parseFiniteNumber(values.cigsPerDay) === null) {
        ctx.addIssue({
          code: "custom",
          message: "Enter cigarettes per day",
          path: ["cigsPerDay"],
        });
      }
      if (parseFiniteNumber(values.smokingYears) === null) {
        ctx.addIssue({
          code: "custom",
          message: "Enter years smoked",
          path: ["smokingYears"],
        });
      }
    }
    if (values.vaping === "yes" && !values.vapingFrequency.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "Enter how often you vape",
        path: ["vapingFrequency"],
      });
    }
  });

export type PersonalHistoryForm = z.input<typeof personalHistorySchema>;
export type PersonalHistoryParsed = z.output<typeof personalHistorySchema>;

export const emptyPersonalHistory = (): PersonalHistoryForm => ({
  smoking: undefined as unknown as PersonalHistoryForm["smoking"],
  cigsPerDay: "",
  smokingYears: "",
  vaping: undefined as unknown as PersonalHistoryForm["vaping"],
  vapingFrequency: "",
  alcoholUnitsPerWeek: "",
  recreationalDrugs:
    undefined as unknown as PersonalHistoryForm["recreationalDrugs"],
  recreationalDrugsType: "",
  caffeine: undefined as unknown as PersonalHistoryForm["caffeine"],
});

export const lifestyleSchema = z
  .object({
    sleepHours: requiredNumberField("sleep hours per night", 0, 24),
    sleepQuality: z.enum(["good", "fair", "poor"], {
      message: "Please choose sleep quality",
    }),
    relationships: z.enum(["strong", "moderate", "limited"], {
      message: "Please choose relationship / social support",
    }),
    exerciseTypes: z.array(z.string()).min(1, "Please choose at least one"),
    exerciseFrequency: z.enum(["daily", "3-5x", "1-2x", "rarely", "never"], {
      message: "Please choose exercise frequency",
    }),
    exerciseDuration: z.enum(["lt15", "15-30", "30-60", "60plus"], {
      message: "Please choose exercise duration",
    }),
    waterIntake: z.enum(["lt1", "1-2", "2-3", "3plus"], {
      message: "Please choose water intake",
    }),
    placeOfWork: z.string().min(1, "Please describe your usual workplace"),
    commuteToCity: yesNoSchema,
    commuteMethod: z.string(),
    commuteDuration: z.string(),
    pollutantExposure: z.enum(["yes", "no", "unsure"], {
      message: "Please answer this fumes / dirty-air question",
    }),
    vehicleExhaust: yesNoSchema,
  })
  .superRefine((values, ctx) => {
    if (values.commuteToCity === "yes") {
      if (!values.commuteMethod.trim()) {
        ctx.addIssue({
          code: "custom",
          message: "Enter how you usually travel",
          path: ["commuteMethod"],
        });
      }
      if (!isHHmm(values.commuteDuration)) {
        ctx.addIssue({
          code: "custom",
          message: "Pick how long the trip takes on the clock",
          path: ["commuteDuration"],
        });
      }
    }
  });

export type LifestyleForm = z.input<typeof lifestyleSchema>;
export type LifestyleParsed = z.output<typeof lifestyleSchema>;

export const emptyLifestyle = (): LifestyleForm => ({
  sleepHours: "",
  sleepQuality: undefined as unknown as LifestyleForm["sleepQuality"],
  relationships: undefined as unknown as LifestyleForm["relationships"],
  exerciseTypes: [],
  exerciseFrequency:
    undefined as unknown as LifestyleForm["exerciseFrequency"],
  exerciseDuration: undefined as unknown as LifestyleForm["exerciseDuration"],
  waterIntake: undefined as unknown as LifestyleForm["waterIntake"],
  placeOfWork: "",
  commuteToCity: undefined as unknown as LifestyleForm["commuteToCity"],
  commuteMethod: "",
  commuteDuration: "",
  pollutantExposure:
    undefined as unknown as LifestyleForm["pollutantExposure"],
  vehicleExhaust: undefined as unknown as LifestyleForm["vehicleExhaust"],
});

export const stressSchema = z.object({
  stressLevel: z.enum(["low", "medium", "high"], {
    message: "Please choose a stress level",
  }),
  stressView: z.enum(["harmful", "growth", "mixed"], {
    message: "Please choose one",
  }),
  stressReachOut: z.enum(["usually", "sometimes", "rarely", "never"], {
    message: "Please choose one",
  }),
});

export type StressForm = z.input<typeof stressSchema>;
export type StressParsed = z.output<typeof stressSchema>;

export const emptyStress = (): StressForm => ({
  stressLevel: undefined as unknown as StressForm["stressLevel"],
  stressView: undefined as unknown as StressForm["stressView"],
  stressReachOut: undefined as unknown as StressForm["stressReachOut"],
});

export const dietEnvironmentSchema = z.object({
  cannedFood: z.enum(["daily", "weekly", "monthly", "rarely", "never"], {
    message: "Please choose canned / tinned food frequency",
  }),
  packagedFood: z.enum(["daily", "weekly", "monthly", "rarely", "never"], {
    message: "Please choose packaged / processed food frequency",
  }),
  takeaway: z.enum(["daily", "weekly", "monthly", "rarely", "never"], {
    message: "Please choose takeaway frequency",
  }),
  microwave: z.enum(["regularly", "sometimes", "never"], {
    message: "Please choose microwave use",
  }),
  plastic: z.enum(["regularly", "sometimes", "never"], {
    message: "Please choose plastic container / wrap use",
  }),
  suncream: z.enum(["daily", "when_sunny", "rarely", "never"], {
    message: "Please choose suncream use",
  }),
  nailVarnish: z.enum(["regularly", "occasionally", "never"], {
    message: "Please choose nail varnish / gel use",
  }),
  cosmetics: z.array(z.string()).min(1, "Please choose at least one"),
  iodineSources: z.array(z.string()).min(1, "Please choose at least one"),
});

export type DietEnvironmentForm = z.input<typeof dietEnvironmentSchema>;
export type DietEnvironmentParsed = z.output<typeof dietEnvironmentSchema>;

export const emptyDietEnvironment = (): DietEnvironmentForm => ({
  cannedFood: undefined as unknown as DietEnvironmentForm["cannedFood"],
  packagedFood: undefined as unknown as DietEnvironmentForm["packagedFood"],
  takeaway: undefined as unknown as DietEnvironmentForm["takeaway"],
  microwave: undefined as unknown as DietEnvironmentForm["microwave"],
  plastic: undefined as unknown as DietEnvironmentForm["plastic"],
  suncream: undefined as unknown as DietEnvironmentForm["suncream"],
  nailVarnish: undefined as unknown as DietEnvironmentForm["nailVarnish"],
  cosmetics: [],
  iodineSources: [],
});

const mammogramRowSchema = z.object({
  date: z.string(),
  finding: z.string(),
});

export const priorScreeningSchema = z
  .object({
    previousMammogram: yesNoSchema,
    mammograms: z.array(mammogramRowSchema),
  })
  .superRefine((values, ctx) => {
    if (values.previousMammogram === "yes") {
      const valid = values.mammograms.filter(
        (row) => isValidIsoCalendarDate(row.date) && row.finding,
      );
      if (valid.length === 0) {
        ctx.addIssue({
          code: "custom",
          message: "Add at least one date and finding",
          path: ["mammograms"],
        });
      }
    }
  });

export type PriorScreeningForm = z.input<typeof priorScreeningSchema>;
export type PriorScreeningParsed = z.output<typeof priorScreeningSchema>;

export const emptyPriorScreening = (): PriorScreeningForm => ({
  previousMammogram:
    undefined as unknown as PriorScreeningForm["previousMammogram"],
  mammograms: [{ date: "", finding: "" }],
});
