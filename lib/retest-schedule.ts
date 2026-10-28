/**
 * Which markers to re-check, and when.
 *
 * The protocol re-checks the markers that were abnormal, at an interval set at
 * review. Only a marker whose most recent result is abnormal gets a retest; a
 * normal, negative or unflagged latest result clears it. The interval is the
 * clinician's if one was set for that marker, otherwise a default that is a
 * stand-in until they set one (FOLLOW_UP_TIMING.retestDueDays, marked assumed).
 *
 * A retest the clinician has already put in the follow-up list is left alone,
 * which is how a date they chose at review is never overwritten.
 *
 * Pure: no Supabase import.
 */
import { addDaysToIsoDate } from "@/lib/iso-date";
import { getTerm } from "@/lib/plain-language";

export type ResultForRetest = {
  test_name: string;
  plain_name?: string | null;
  flag: string | null;
  created_at: string;
};

export type RetestPlan = {
  /** Lower-cased marker name, the key for clinician intervals. */
  markerKey: string;
  title: string;
  dueDate: string;
  source: "clinician" | "default";
};

const SEVERITY: Record<string, number> = {
  critical: 0,
  positive: 1,
  high: 2,
  low: 3,
};

export function retestTitle(plainName: string): string {
  return `Re-test: ${plainName}`;
}

function normalise(value: string): string {
  return value.trim().toLowerCase();
}

export function planRetests(
  results: readonly ResultForRetest[],
  options: {
    defaultDays: number;
    today: string;
    /**
     * Retest rows already in the follow-up list, any status. One created at or
     * after the marker's latest result already covers it; an older one (from
     * a previous abnormal result) does not.
     */
    existing: readonly { title: string; created_at: string }[];
    /** Clinician-set days per marker, keyed by lower-cased marker name. */
    intervalDaysByMarker?: Readonly<Record<string, number>>;
    max?: number;
  },
): RetestPlan[] {
  const latest = new Map<string, ResultForRetest>();
  for (const result of results) {
    const key = normalise(result.test_name);
    if (!key) {
      continue;
    }
    const seen = latest.get(key);
    if (!seen || result.created_at > seen.created_at) {
      latest.set(key, result);
    }
  }

  const coveredSince = new Map<string, string>();
  for (const row of options.existing) {
    const key = normalise(row.title);
    const seen = coveredSince.get(key);
    if (!seen || row.created_at > seen) {
      coveredSince.set(key, row.created_at);
    }
  }
  const plans: (RetestPlan & { severity: number })[] = [];

  for (const [key, result] of latest) {
    const flag = normalise(result.flag ?? "");
    if (!(flag in SEVERITY)) {
      continue;
    }
    const plain =
      result.plain_name?.trim() || getTerm(result.test_name.trim()).plainName;
    const title = retestTitle(plain);
    const covered = coveredSince.get(normalise(title));
    if (covered !== undefined && covered >= result.created_at) {
      continue;
    }
    const clinicianDays = options.intervalDaysByMarker?.[key];
    const days = clinicianDays ?? options.defaultDays;
    const due = addDaysToIsoDate(result.created_at.slice(0, 10), days);
    plans.push({
      markerKey: key,
      title,
      dueDate: due < options.today ? options.today : due,
      source: clinicianDays === undefined ? "default" : "clinician",
      severity: SEVERITY[flag],
    });
  }

  plans.sort(
    (a, b) => a.severity - b.severity || a.markerKey.localeCompare(b.markerKey),
  );
  return plans
    .slice(0, options.max ?? plans.length)
    .map(({ severity: _severity, ...plan }) => plan);
}
