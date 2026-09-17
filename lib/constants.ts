/**
 * Lists you can edit later without hunting through screens.
 * Change a dropdown here — the forms pick it up automatically.
 */
import { COPY } from "@/lib/copy";

export const TRIAGE_QUESTIONS = [
  {
    key: "has_pain" as const,
    label: "Have you recently had pain in the breast or chest area?",
  },
  {
    key: "has_discomfort" as const,
    label: "Have you recently had discomfort in the breast area?",
  },
  {
    key: "has_lump" as const,
    label: "Have you recently noticed a lump, thickening, or a new bump?",
  },
] as const;

export type TriageAnswerKey = (typeof TRIAGE_QUESTIONS)[number]["key"];

/**
 * 10 questionnaire hub rows.
 * Demographics lives on the profiles table; the rest on questionnaire_responses.
 */
export const QUESTIONNAIRE_HUB_SECTIONS = [
  {
    key: "demographics",
    title: "1. Demographics & measurements",
    source: "profiles" as const,
    dbSection: null,
    day: 5 as const,
  },
  {
    key: "reproductive_menstrual",
    title: "2. Reproductive & menstrual history",
    source: "questionnaire_responses" as const,
    dbSection: "reproductive_menstrual" as const,
    day: 5 as const,
  },
  {
    key: "radiation_occupational",
    title: "3. Radiation & occupation",
    source: "questionnaire_responses" as const,
    dbSection: "radiation_occupational" as const,
    day: 5 as const,
  },
  {
    key: "comorbidities",
    title: "4. Other conditions",
    source: "questionnaire_responses" as const,
    dbSection: "comorbidities" as const,
    day: 5 as const,
  },
  {
    key: "family_history",
    title: "5. Family history",
    source: "questionnaire_responses" as const,
    dbSection: "family_history" as const,
    day: 5 as const,
  },
  {
    key: "personal_history",
    title: "6. Personal history",
    source: "questionnaire_responses" as const,
    dbSection: "personal_history" as const,
    day: 6 as const,
  },
  {
    key: "lifestyle",
    title: "7. Lifestyle",
    source: "questionnaire_responses" as const,
    dbSection: "lifestyle" as const,
    day: 6 as const,
  },
  {
    key: "stress",
    title: "8. Stress",
    source: "questionnaire_responses" as const,
    dbSection: "stress" as const,
    day: 6 as const,
  },
  {
    key: "diet_environment",
    title: "9. Diet & environment",
    source: "questionnaire_responses" as const,
    dbSection: "diet_environment" as const,
    day: 6 as const,
  },
  {
    key: "prior_screening",
    title: "10. Prior screening",
    source: "questionnaire_responses" as const,
    dbSection: "prior_screening" as const,
    day: 6 as const,
  },
] as const;

export type HubSectionKey = (typeof QUESTIONNAIRE_HUB_SECTIONS)[number]["key"];

export type QuestionnaireDbSection = NonNullable<
  (typeof QUESTIONNAIRE_HUB_SECTIONS)[number]["dbSection"]
>;

/** Saved inside a section’s JSON so we know the mid-form safety question was answered No. */
export const SYMPTOM_INTERRUPT_CLEARED_KEY = "symptom_interrupt_cleared";

/**
 * Saved on section 2 when sex is male and period/pregnancy questions were skipped.
 * The hub still marks the section done only after the safety interrupt is cleared.
 */
export const SKIPPED_REPRODUCTIVE_DETAIL_KEY = "skipped_reproductive_detail";

/**
 * BMI used only to show a gentle hint on the “other conditions” screen.
 * The rules engine (Day 6) will use its own thresholds file.
 */
export const BMI_OBESITY_HINT = 30;

export const YES_NO_OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
] as const;

export const SEX_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
] as const;

export const ETHNICITY_OPTIONS = [
  { value: "south_asian", label: "South Asian" },
  { value: "east_asian", label: "East Asian" },
  { value: "white_european", label: "White / European" },
  { value: "black_african_caribbean", label: "Black / African / Caribbean" },
  { value: "hispanic_latino", label: "Hispanic / Latino" },
  { value: "middle_eastern_north_african", label: "Middle Eastern / North African" },
  { value: "mixed", label: "Mixed" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
  { value: "other", label: "Other" },
] as const;

export const COUNTRY_OPTIONS = [
  { value: "australia", label: "Australia" },
  { value: "bangladesh", label: "Bangladesh" },
  { value: "brazil", label: "Brazil" },
  { value: "canada", label: "Canada" },
  { value: "china", label: "China" },
  { value: "france", label: "France" },
  { value: "germany", label: "Germany" },
  { value: "india", label: "India" },
  { value: "indonesia", label: "Indonesia" },
  { value: "ireland", label: "Ireland" },
  { value: "italy", label: "Italy" },
  { value: "japan", label: "Japan" },
  { value: "kenya", label: "Kenya" },
  { value: "malaysia", label: "Malaysia" },
  { value: "mexico", label: "Mexico" },
  { value: "nepal", label: "Nepal" },
  { value: "netherlands", label: "Netherlands" },
  { value: "new_zealand", label: "New Zealand" },
  { value: "nigeria", label: "Nigeria" },
  { value: "pakistan", label: "Pakistan" },
  { value: "philippines", label: "Philippines" },
  { value: "singapore", label: "Singapore" },
  { value: "south_africa", label: "South Africa" },
  { value: "south_korea", label: "South Korea" },
  { value: "spain", label: "Spain" },
  { value: "sri_lanka", label: "Sri Lanka" },
  { value: "sweden", label: "Sweden" },
  { value: "uae", label: "United Arab Emirates" },
  { value: "uk", label: "United Kingdom" },
  { value: "usa", label: "United States" },
  { value: "vietnam", label: "Vietnam" },
  { value: "other", label: "Other" },
] as const;

export const CONTRACEPTIVE_TYPE_OPTIONS = [
  { value: "pill", label: "Pill" },
  { value: "iud", label: "IUD" },
  { value: "implant", label: "Implant" },
  { value: "injection", label: "Injection" },
  { value: "patch", label: "Patch" },
  { value: "other", label: "Other" },
] as const;

export const MENSTRUAL_REGULARITY_OPTIONS = [
  { value: "regular", label: "Regular" },
  { value: "irregular", label: "Irregular" },
] as const;

export const MENOPAUSAL_STATUS_OPTIONS = [
  { value: "pre", label: "Pre", description: COPY.menoPreExplain },
  { value: "peri", label: "Peri", description: COPY.menoPeriExplain },
  { value: "post", label: "Post", description: COPY.menoPostExplain },
] as const;

export const RADIATION_TYPE_OPTIONS = [
  { value: "medical", label: "Medical" },
  { value: "occupational", label: "Occupational (work)" },
] as const;

export const NIGHT_SHIFT_OPTIONS = [
  { value: "current", label: "Yes, currently" },
  { value: "past", label: "Yes, in the past" },
  { value: "no", label: "No" },
] as const;

export const GILBERT_OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "dont_know", label: "Don’t know" },
] as const;

export const CHRONIC_INFECTION_OPTIONS = [
  { value: "dental", label: "Dental" },
  { value: "gut", label: "Gut" },
  { value: "urinary", label: "Urinary" },
  { value: "chest_respiratory", label: "Chest / respiratory" },
  { value: "sinus", label: "Sinus" },
  { value: "skin", label: "Skin" },
  { value: "none", label: "None" },
] as const;

export const FAMILY_RELATIONSHIP_OPTIONS = [
  { value: "mother", label: "Mother" },
  { value: "sister", label: "Sister" },
  { value: "daughter", label: "Daughter" },
  { value: "grandmother", label: "Grandmother" },
  { value: "aunt", label: "Aunt" },
  { value: "father", label: "Father" },
  { value: "brother", label: "Brother" },
  { value: "uncle", label: "Uncle" },
  { value: "grandfather", label: "Grandfather" },
  { value: "other", label: "Other" },
] as const;

export const MONTH_OPTIONS = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
] as const;

export const WAIST_MEASURE_HINT =
  "Measure around your middle, just above the hip bones, after a normal breath out. Use a soft tape, standing relaxed.";

export const HIP_MEASURE_HINT =
  "Measure around the widest part of your hips and buttocks. Keep the tape level.";

export const SMOKING_OPTIONS = [
  { value: "current", label: "Current" },
  { value: "former", label: "Former" },
  { value: "never", label: "Never" },
] as const;

export const CAFFEINE_OPTIONS = [
  { value: "none", label: "None" },
  { value: "1-2", label: "1–2 cups per day" },
  { value: "3-4", label: "3–4 cups per day" },
  { value: "5plus", label: "5+ cups per day" },
] as const;

export const SLEEP_QUALITY_OPTIONS = [
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
  { value: "poor", label: "Poor" },
] as const;

export const RELATIONSHIP_SUPPORT_OPTIONS = [
  { value: "strong", label: "Strong" },
  { value: "moderate", label: "Moderate" },
  { value: "limited", label: "Limited" },
] as const;

export const EXERCISE_TYPE_OPTIONS = [
  { value: "walking", label: "Walking" },
  { value: "running", label: "Running" },
  { value: "gym_weights", label: "Gym / weights" },
  { value: "yoga_pilates", label: "Yoga / pilates" },
  { value: "swimming", label: "Swimming" },
  { value: "cycling", label: "Cycling" },
  { value: "team_sports", label: "Team sports" },
  { value: "other", label: "Other" },
  { value: "none", label: "None" },
] as const;

export const EXERCISE_FREQUENCY_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "3-5x", label: "3–5 times a week" },
  { value: "1-2x", label: "1–2 times a week" },
  { value: "rarely", label: "Rarely" },
  { value: "never", label: "Never" },
] as const;

export const EXERCISE_DURATION_OPTIONS = [
  { value: "lt15", label: "Under 15 minutes" },
  { value: "15-30", label: "15–30 minutes" },
  { value: "30-60", label: "30–60 minutes" },
  { value: "60plus", label: "60+ minutes" },
] as const;

export const WATER_INTAKE_OPTIONS = [
  { value: "lt1", label: "Under 1 L" },
  { value: "1-2", label: "1–2 L" },
  { value: "2-3", label: "2–3 L" },
  { value: "3plus", label: "3 L or more" },
] as const;

export const YES_NO_UNSURE_OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "unsure", label: "Unsure" },
] as const;

export const STRESS_LEVEL_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
] as const;

export const STRESS_VIEW_OPTIONS = [
  { value: "harmful", label: "Harmful" },
  { value: "growth", label: "Growth opportunity" },
  { value: "mixed", label: "Mixed" },
] as const;

export const STRESS_REACH_OUT_OPTIONS = [
  { value: "usually", label: "Usually" },
  { value: "sometimes", label: "Sometimes" },
  { value: "rarely", label: "Rarely" },
  { value: "never", label: "Never" },
] as const;

export const FOOD_FREQUENCY_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "rarely", label: "Rarely" },
  { value: "never", label: "Never" },
] as const;

export const SOMETIMES_FREQUENCY_OPTIONS = [
  { value: "regularly", label: "Regularly" },
  { value: "sometimes", label: "Sometimes" },
  { value: "never", label: "Never" },
] as const;

export const SUNCREAM_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "when_sunny", label: "When sunny" },
  { value: "rarely", label: "Rarely" },
  { value: "never", label: "Never" },
] as const;

export const NAIL_VARNISH_OPTIONS = [
  { value: "regularly", label: "Regularly" },
  { value: "occasionally", label: "Occasionally" },
  { value: "never", label: "Never" },
] as const;

export const COSMETICS_OPTIONS = [
  { value: "foundation", label: "Foundation" },
  { value: "moisturiser", label: "Moisturiser" },
  { value: "deodorant", label: "Deodorant" },
  { value: "perfume", label: "Perfume" },
  { value: "hair_products", label: "Hair products" },
  { value: "none", label: "None" },
] as const;

export const IODINE_SOURCE_OPTIONS = [
  { value: "iodised_salt", label: "Iodised salt" },
  { value: "seafood", label: "Seafood" },
  { value: "seaweed", label: "Seaweed" },
  { value: "dairy", label: "Dairy" },
  { value: "none", label: "None" },
] as const;

export const MAMMOGRAM_FINDING_OPTIONS = [
  { value: "normal", label: "Normal" },
  { value: "abnormal", label: "Abnormal" },
  { value: "awaiting", label: "Awaiting" },
] as const;

export const ALCOHOL_UNIT_HINT =
  "In the UK, one unit is 10ml of pure alcohol — about half a pint of beer, a small glass of wine (125ml), or a single 25ml spirit measure. Labels often show units on the bottle.";

/**
 * People on this list can use admin-only tools (e.g. enter lab results).
 * Compare emails in lowercase. This is NOT a login lock — any email can still
 * create an account or sign in. Regular users cannot save test_results.
 */
export const ADMIN_EMAILS = ["awaytotheway@gmail.com"] as const;

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) {
    return false;
  }
  const normalised = email.trim().toLowerCase();
  return ADMIN_EMAILS.some((allowed) => allowed.toLowerCase() === normalised);
}

/**
 * Phase 5 feature flags. Each wave ships behind one of these so a feature can
 * be switched off without releasing a new build.
 *
 * Set EXPO_PUBLIC_FEATURE_BOOKING=off in .env (or as an EAS secret) to hide
 * guided test booking everywhere it appears.
 */
function flagEnabled(value: string | undefined, fallback: boolean): boolean {
  const raw = (value ?? "").trim().toLowerCase();
  if (raw === "off" || raw === "false" || raw === "0") {
    return false;
  }
  if (raw === "on" || raw === "true" || raw === "1") {
    return true;
  }
  return fallback;
}

export const FEATURES = {
  /** Phase 5 Wave A — guided test booking (labs + home kits). */
  guidedBooking: flagEnabled(process.env.EXPO_PUBLIC_FEATURE_BOOKING, true),
} as const;
