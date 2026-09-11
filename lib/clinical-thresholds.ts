/**
 * Hard-coded fallback for every clinical number the rules engine uses.
 *
 * Phase 4 Day 3: the live app tries to load overrides from Supabase
 * `clinical_thresholds` first (see lib/load-thresholds.ts). If the fetch
 * fails, the table is empty, or the user is offline, these values are used —
 * the app never crashes and never shows a blank screen.
 *
 * Sync pattern (tests, offline): import THRESHOLDS and pass to rules-engine
 * functions as the optional third argument.
 *
 * Async pattern (questionnaire submit, plan refresh): await loadClinicalThresholds()
 * then pass the result into collectRecommendations() / mapResultsToInterventions().
 *
 * ⚠️ ASSUMED = placeholder, confirm with clinician later
 * ✅ CONFIRMED = from source document or clinician
 */
export const THRESHOLDS = {
  fastingInsulin_elevated: 8, // ✅ CONFIRMED (source doc)
  bmi_obesityThreshold: 30, // ✅ CONFIRMED (source doc)
  tsh_subclinicalHypo: 4.5, // ✅ CONFIRMED (clinician)
  liverEnzyme_altAstElevated: 40, // ⚠️ ASSUMED
};

/** Shape passed into rules-engine functions (sync or after async load). */
export type ClinicalThresholdValues = typeof THRESHOLDS;

/** Keys that exist in both the code fallback and the Supabase table. */
export type ClinicalThresholdKey = keyof ClinicalThresholdValues;

export const CLINICAL_THRESHOLD_KEYS: ClinicalThresholdKey[] = [
  "fastingInsulin_elevated",
  "bmi_obesityThreshold",
  "tsh_subclinicalHypo",
  "liverEnzyme_altAstElevated",
];

export const HIGH_RISK_OCCUPATIONS = [
  "construction",
  "dentistry",
  "welding", // ✅ CONFIRMED (source doc)
  "manufacturing",
  "mining", // ⚠️ ASSUMED extensions
];

/**
 * Follow-up calendar (Phase 2 Day 6).
 * Change one number here — the hub and reminders pick it up.
 *
 * visibleDueDays = 0 so the first symptom re-check is due today
 * (you can tap it while testing). After you complete that check,
 * the next one uses symptomRecheckDays (90).
 */
export const FOLLOW_UP_TIMING = {
  symptomRecheckDays: 90, // ✅ CONFIRMED-style interval from the protocol
  visibleDueDays: 0, // ⚠️ DEMO — first item is due today so you can see it
  reviewDueDays: 7, // ⚠️ ASSUMED — draft-plan review reminder
  retestDueDays: 14, // ⚠️ ASSUMED — suggested-test re-check reminder
};
