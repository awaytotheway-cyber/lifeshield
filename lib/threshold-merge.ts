/**
 * Pure merge logic — no Supabase import so Node unit tests can run safely.
 */
import {
  THRESHOLDS,
  CLINICAL_THRESHOLD_KEYS,
  type ClinicalThresholdKey,
  type ClinicalThresholdValues,
} from "@/lib/clinical-thresholds";

export type ClinicalThresholdRow = {
  key: string;
  value: number;
  label?: string | null;
  status?: "confirmed" | "assumed" | string | null;
  updated_at?: string | null;
};

function isKnownThresholdKey(key: string): key is ClinicalThresholdKey {
  return (CLINICAL_THRESHOLD_KEYS as readonly string[]).includes(key);
}

/**
 * Merge DB rows onto the code fallback.
 * Unknown keys are ignored; missing keys keep the hard-coded default.
 */
export function mergeThresholdRowsFromDb(
  rows: ClinicalThresholdRow[] | null | undefined,
): ClinicalThresholdValues {
  const merged: ClinicalThresholdValues = { ...THRESHOLDS };

  if (!rows?.length) {
    return merged;
  }

  for (const row of rows) {
    if (!row?.key || !isKnownThresholdKey(row.key)) {
      continue;
    }
    const numeric =
      typeof row.value === "number"
        ? row.value
        : Number.parseFloat(String(row.value));
    if (Number.isFinite(numeric)) {
      merged[row.key] = numeric;
    }
  }

  return merged;
}
