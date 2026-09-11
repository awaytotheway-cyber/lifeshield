/**
 * Load clinical cut-offs from Supabase for the rules engine.
 *
 * Flow:
 * 1. Try `clinical_thresholds` table (same rows you edit in admin).
 * 2. Merge any returned rows onto lib/clinical-thresholds.ts defaults.
 * 3. On error, empty result, or missing Supabase keys → use code fallback only.
 *
 * Never throws — callers always get usable numbers.
 */
import {
  CLINICAL_THRESHOLD_KEYS,
  THRESHOLDS,
  type ClinicalThresholdValues,
} from "@/lib/clinical-thresholds";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import {
  mergeThresholdRowsFromDb,
  type ClinicalThresholdRow,
} from "@/lib/threshold-merge";

export type { ClinicalThresholdRow } from "@/lib/threshold-merge";
export { mergeThresholdRowsFromDb } from "@/lib/threshold-merge";

/** Same as THRESHOLDS — exported so tests can compare fallback values. */
export const FALLBACK_THRESHOLDS: ClinicalThresholdValues = { ...THRESHOLDS };

/** In-memory cache so one questionnaire session does not hammer the DB. */
let cachedThresholds: ClinicalThresholdValues | null = null;
let cacheLoadedAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

/** Clear cache after admin edits or in unit tests. */
export function clearClinicalThresholdCache(): void {
  cachedThresholds = null;
  cacheLoadedAt = 0;
}

export type LoadClinicalThresholdsOptions = {
  /** Skip cache and fetch again (rare — e.g. after admin changed a value). */
  forceRefresh?: boolean;
};

/**
 * Async entry point for screens that run the rules engine.
 * Returns FALLBACK_THRESHOLDS when Supabase is unavailable or the query fails.
 */
export async function loadClinicalThresholds(
  options?: LoadClinicalThresholdsOptions,
): Promise<ClinicalThresholdValues> {
  const now = Date.now();
  if (
    !options?.forceRefresh &&
    cachedThresholds &&
    now - cacheLoadedAt < CACHE_TTL_MS
  ) {
    return cachedThresholds;
  }

  if (!isSupabaseConfigured) {
    cachedThresholds = { ...FALLBACK_THRESHOLDS };
    cacheLoadedAt = now;
    return cachedThresholds;
  }

  try {
    const { data, error } = await supabase
      .from("clinical_thresholds")
      .select("key, value, label, status")
      .in("key", [...CLINICAL_THRESHOLD_KEYS]);

    if (error) {
      cachedThresholds = { ...FALLBACK_THRESHOLDS };
      cacheLoadedAt = now;
      return cachedThresholds;
    }

    cachedThresholds = mergeThresholdRowsFromDb(
      (data ?? []) as ClinicalThresholdRow[],
    );
    cacheLoadedAt = now;
    return cachedThresholds;
  } catch {
    cachedThresholds = { ...FALLBACK_THRESHOLDS };
    cacheLoadedAt = now;
    return cachedThresholds;
  }
}
