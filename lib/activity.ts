/**
 * Pure activity logic — units, day-bucketing, aggregation, target
 * comparison. IO lives in lib/activity-io.ts; native source adapters
 * (HealthKit / Google Fit) live in lib/activity-source.ts. Kept
 * side-effect-free so lib/activity.test.ts can run without a Supabase
 * connection or a native module.
 */

export type ActivityKind =
  | "steps"
  | "active_minutes"
  | "resting_heart_rate"
  | "sleep_minutes"
  | "weight_kg";

export type ActivitySource =
  | "manual"
  | "healthkit"
  | "google_fit"
  | "fitbit"
  | "other";

export type ActivitySnapshot = {
  id: string;
  user_id: string;
  source: ActivitySource;
  kind: ActivityKind;
  value: number;
  unit: string;
  value_json: Record<string, unknown>;
  recorded_at: string;
  created_at: string;
};

export const ALL_KINDS: readonly ActivityKind[] = [
  "steps",
  "active_minutes",
  "resting_heart_rate",
  "sleep_minutes",
  "weight_kg",
];

/**
 * The canonical unit for a kind. Insert paths must convert to this
 * before writing (see normaliseIncoming below).
 */
export const CANONICAL_UNIT: Record<ActivityKind, string> = {
  steps: "steps",
  active_minutes: "minutes",
  resting_heart_rate: "bpm",
  sleep_minutes: "minutes",
  weight_kg: "kg",
};

export const KIND_LABELS: Record<ActivityKind, string> = {
  steps: "Steps",
  active_minutes: "Active minutes",
  resting_heart_rate: "Resting heart rate",
  sleep_minutes: "Sleep",
  weight_kg: "Weight",
};

/**
 * Sensible daily targets used by the summary card. These are just
 * defaults — a caller with the user's own SMART goal (lib/goals.ts)
 * should pass that in instead.
 */
export const DEFAULT_TARGETS: Record<ActivityKind, number> = {
  steps: 8000,
  active_minutes: 30,
  resting_heart_rate: 65, // "below" — see targetDirection.
  sleep_minutes: 420, // 7h
  weight_kg: 0, // opt-in per user
};

/**
 * Some kinds are "higher is better" (steps, active minutes, sleep), some
 * are "lower is better" (resting heart rate). Progress ring uses this to
 * decide whether more toward the target = full or empty.
 */
export function targetDirection(
  kind: ActivityKind,
): "higher_better" | "lower_better" {
  return kind === "resting_heart_rate" ? "lower_better" : "higher_better";
}

// ---------- Input validation for manual entries ----------

export type ManualDraft = {
  kind: ActivityKind;
  value: number | string;
  recorded_at?: string; // YYYY-MM-DD or ISO; defaults to today
};

export type ValidationError = {
  field: "kind" | "value" | "recorded_at";
  message: string;
};

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const KIND_SET = new Set<ActivityKind>(ALL_KINDS);

/**
 * Validate a manual draft and return the normalised numeric value that
 * lib/activity-io.upsertSnapshot writes. Bounds are wide but non-zero on
 * purpose — a typo of "800000" for steps is caught, but marathoners can
 * still log 50k without an override.
 */
export function validateManualDraft(
  draft: ManualDraft,
): { ok: true; value: number; recorded_at: string } | { ok: false; errors: ValidationError[] } {
  const errors: ValidationError[] = [];
  if (!KIND_SET.has(draft.kind)) {
    errors.push({ field: "kind", message: "Pick what you're logging." });
  }

  const raw = typeof draft.value === "string" ? draft.value.trim() : draft.value;
  const numeric =
    typeof raw === "number" ? raw : raw.length > 0 ? Number(raw) : NaN;
  if (!Number.isFinite(numeric) || numeric < 0) {
    errors.push({ field: "value", message: "Value must be a positive number." });
  } else {
    const range = MANUAL_RANGES[draft.kind as ActivityKind];
    if (range && (numeric < range.min || numeric > range.max)) {
      errors.push({
        field: "value",
        message: `Enter a ${draft.kind.replace("_", " ")} between ${range.min} and ${range.max}.`,
      });
    }
  }

  const rawDate =
    draft.recorded_at && draft.recorded_at.length > 0
      ? draft.recorded_at
      : todayYmd();
  const day = rawDate.length >= 10 ? rawDate.slice(0, 10) : rawDate;
  if (!ISO_DAY.test(day)) {
    errors.push({
      field: "recorded_at",
      message: "Date must be YYYY-MM-DD.",
    });
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: numeric as number, recorded_at: `${day}T00:00:00Z` };
}

const MANUAL_RANGES: Partial<Record<ActivityKind, { min: number; max: number }>> = {
  steps: { min: 0, max: 100_000 },
  active_minutes: { min: 0, max: 24 * 60 },
  resting_heart_rate: { min: 25, max: 200 },
  sleep_minutes: { min: 0, max: 24 * 60 },
  weight_kg: { min: 20, max: 400 },
};

// ---------- Aggregation ----------

export type DailyBucket = {
  date: string; // YYYY-MM-DD
  kind: ActivityKind;
  total: number; // sum for "additive" kinds (steps, minutes), latest for point-in-time kinds
  count: number;
  sources: ActivitySource[];
};

/**
 * Additive kinds sum across sources per day (walking + treadmill both
 * feed steps). Point-in-time kinds (heart rate, weight) take the most
 * recent reading of the day — a mid-morning weigh-in doesn't override
 * an evening one.
 */
export function isAdditive(kind: ActivityKind): boolean {
  return (
    kind === "steps" || kind === "active_minutes" || kind === "sleep_minutes"
  );
}

/**
 * Bucket snapshots by (kind, day). Returns newest-day-first. Empty when
 * no snapshots match. Days without a reading are NOT filled — the caller
 * decides whether to render a gap or a zero.
 */
export function bucketDaily(
  snapshots: readonly ActivitySnapshot[],
): DailyBucket[] {
  const buckets = new Map<string, DailyBucket>();
  for (const snap of snapshots) {
    const day = snap.recorded_at.slice(0, 10);
    if (!ISO_DAY.test(day)) continue;
    const key = `${snap.kind}::${day}`;
    const existing = buckets.get(key);
    if (!existing) {
      buckets.set(key, {
        date: day,
        kind: snap.kind,
        total: snap.value,
        count: 1,
        sources: [snap.source],
      });
      continue;
    }
    if (isAdditive(snap.kind)) {
      existing.total += snap.value;
    } else if (day >= existing.date) {
      // Point-in-time: keep the "latest" of the day. Snapshots come with
      // an ISO timestamp so a same-day later reading wins. Falls back to
      // count-order otherwise.
      existing.total = snap.value;
    }
    existing.count += 1;
    if (!existing.sources.includes(snap.source)) {
      existing.sources.push(snap.source);
    }
  }
  return Array.from(buckets.values()).sort((a, b) =>
    a.date < b.date ? 1 : a.date > b.date ? -1 : 0,
  );
}

/**
 * Percentage of the daily target hit, clamped 0..100. For lower-better
 * kinds a value AT or BELOW the target reads 100%; every step above
 * decays linearly to 0% at target × 1.5. Callers should not treat this
 * as clinical — it's a UI progress ring.
 */
export function targetPercent(
  kind: ActivityKind,
  total: number,
  target: number = DEFAULT_TARGETS[kind],
): number {
  if (!(target > 0)) return 0;
  if (targetDirection(kind) === "higher_better") {
    return Math.max(0, Math.min(100, Math.round((total / target) * 100)));
  }
  // lower_better: at-or-below target = 100. Falls linearly to 0 at 1.5×.
  if (total <= target) return 100;
  const ceiling = target * 1.5;
  if (total >= ceiling) return 0;
  const overshoot = total - target;
  const room = ceiling - target;
  return Math.max(0, Math.min(100, Math.round(100 - (overshoot / room) * 100)));
}

/**
 * Format a numeric value for the summary card. Kept in the pure module
 * so the RN and admin views render the same string.
 */
export function formatValue(kind: ActivityKind, value: number): string {
  if (!Number.isFinite(value)) return "—";
  if (kind === "steps") return Math.round(value).toLocaleString();
  if (kind === "sleep_minutes" || kind === "active_minutes") {
    const total = Math.round(value);
    if (kind === "sleep_minutes") {
      const hours = Math.floor(total / 60);
      const minutes = total - hours * 60;
      return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
    }
    return `${total} min`;
  }
  if (kind === "resting_heart_rate") return `${Math.round(value)} bpm`;
  if (kind === "weight_kg") return `${value.toFixed(1)} kg`;
  return String(value);
}

// ---------- Helpers ----------

function todayYmd(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Vendor-neutral converter for an incoming reading. Sources call this
 * before insert so `value` + `unit` are always in the CANONICAL_UNIT.
 * Unknown units pass through untouched — the DB CHECK on `kind` still
 * gates the row, but the numeric will be whatever the vendor sent.
 */
export function normaliseIncoming(
  kind: ActivityKind,
  value: number,
  unit: string,
): { value: number; unit: string } {
  const u = unit.trim().toLowerCase();
  if (kind === "weight_kg") {
    if (u === "lb" || u === "lbs" || u === "pound" || u === "pounds") {
      return { value: value * 0.45359237, unit: "kg" };
    }
    if (u === "g" || u === "gram" || u === "grams") {
      return { value: value / 1000, unit: "kg" };
    }
  }
  if (kind === "sleep_minutes" || kind === "active_minutes") {
    if (u === "h" || u === "hr" || u === "hour" || u === "hours") {
      return { value: value * 60, unit: "minutes" };
    }
    if (u === "s" || u === "sec" || u === "second" || u === "seconds") {
      return { value: value / 60, unit: "minutes" };
    }
  }
  if (kind === "resting_heart_rate") {
    // bpm is the only unit we accept; anything else stays as-is so a
    // bad ingest surfaces on the summary card rather than silently
    // rescaling.
    return { value, unit: unit || CANONICAL_UNIT[kind] };
  }
  return { value, unit: unit || CANONICAL_UNIT[kind] };
}
