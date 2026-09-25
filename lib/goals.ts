/**
 * User-defined SMART goals.
 *
 * Kept as pure functions so `lib/goals.test.ts` can run without a Supabase
 * connection. Supabase reads/writes go in a thin wrapper at the top of the
 * screen (or add `lib/goals-io.ts` when we need more than list/insert).
 */

export type GoalCadence = "daily" | "weekly" | "once";

export type GoalTarget = {
  value: number;
  unit: string;
  cadence: GoalCadence;
};

export type GoalStatus = "active" | "paused" | "completed" | "archived";

export type GoalSourceKind =
  | "self"
  | "intervention"
  | "recommendation"
  | "test_result";

export type Goal = {
  id: string;
  user_id: string;
  goal_type: string;
  title: string;
  target: GoalTarget;
  start_date: string; // YYYY-MM-DD
  end_date: string | null;
  status: GoalStatus;
  source_kind: GoalSourceKind;
  source_ref: string | null;
  created_at: string;
  updated_at: string;
};

export type GoalProgressEntry = {
  id: string;
  goal_id: string;
  user_id: string;
  recorded_at: string; // ISO timestamp
  value: number;
  note: string | null;
};

export type GoalDraft = {
  goal_type: string;
  title: string;
  target: GoalTarget;
  start_date: string;
  end_date: string | null;
  source_kind?: GoalSourceKind;
  source_ref?: string | null;
};

export type GoalValidationError = {
  field:
    | "goal_type"
    | "title"
    | "target.value"
    | "target.unit"
    | "target.cadence"
    | "start_date"
    | "end_date";
  message: string;
};

const ALLOWED_CADENCES: readonly GoalCadence[] = ["daily", "weekly", "once"];

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * SMART validation. Returns [] when the draft is savable.
 *
 * Specific: goal_type + unit required.
 * Measurable: target.value > 0.
 * Time-bound: start_date required; end_date must be >= start_date when set.
 * A one-off goal ("once") without an end date defaults to open-ended and is
 * allowed — the UI can suggest a due date but we do not require one.
 */
export function validateGoalDraft(draft: GoalDraft): GoalValidationError[] {
  const errors: GoalValidationError[] = [];

  if (!draft.goal_type || draft.goal_type.trim().length === 0) {
    errors.push({ field: "goal_type", message: "Pick a goal type." });
  }
  if (!draft.title || draft.title.trim().length === 0) {
    errors.push({ field: "title", message: "Give this goal a short title." });
  }

  if (
    !Number.isFinite(draft.target?.value) ||
    (draft.target?.value ?? 0) <= 0
  ) {
    errors.push({
      field: "target.value",
      message: "Target must be a positive number.",
    });
  }
  if (!draft.target?.unit || draft.target.unit.trim().length === 0) {
    errors.push({
      field: "target.unit",
      message: "Target needs a unit (steps, minutes, servings…).",
    });
  }
  if (!ALLOWED_CADENCES.includes(draft.target?.cadence)) {
    errors.push({
      field: "target.cadence",
      message: "Cadence must be daily, weekly, or once.",
    });
  }

  if (!draft.start_date || !ISO_DATE.test(draft.start_date)) {
    errors.push({
      field: "start_date",
      message: "Start date must be a real date.",
    });
  }
  if (draft.end_date !== null && draft.end_date !== undefined) {
    if (!ISO_DATE.test(draft.end_date)) {
      errors.push({
        field: "end_date",
        message: "End date must be a real date.",
      });
    } else if (
      ISO_DATE.test(draft.start_date ?? "") &&
      draft.end_date < draft.start_date
    ) {
      errors.push({
        field: "end_date",
        message: "End date can't be before the start date.",
      });
    }
  }

  return errors;
}

/**
 * Progress against the goal's target for a given window.
 *
 *   percent   — 0..100, clamped
 *   total     — sum of recorded values inside the window
 *   remaining — how much is left to hit the target for the window
 *
 * cadence controls the window:
 *   daily  → the target repeats every day; percent uses today only
 *   weekly → target repeats every 7 days; percent uses the last 7
 *   once   → target is cumulative; percent uses all entries ever
 */
export function computeProgress(
  goal: Pick<Goal, "target">,
  entries: readonly GoalProgressEntry[],
  now: Date = new Date(),
): { percent: number; total: number; remaining: number } {
  const cadence = goal.target.cadence;
  const target = goal.target.value;
  if (!Number.isFinite(target) || target <= 0) {
    return { percent: 0, total: 0, remaining: 0 };
  }

  const relevant = entries.filter((entry) =>
    withinCadenceWindow(entry.recorded_at, cadence, now),
  );
  const total = relevant.reduce((sum, entry) => sum + Number(entry.value), 0);
  const remaining = Math.max(0, target - total);
  const percent = Math.max(0, Math.min(100, Math.round((total / target) * 100)));
  return { percent, total, remaining };
}

function withinCadenceWindow(
  recordedAtIso: string,
  cadence: GoalCadence,
  now: Date,
): boolean {
  const recorded = new Date(recordedAtIso);
  if (Number.isNaN(recorded.getTime())) return false;
  if (cadence === "once") return true;
  if (cadence === "daily") {
    return isSameYmd(recorded, now);
  }
  // weekly = last 7 rolling days, inclusive of today.
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  return now.getTime() - recorded.getTime() <= sevenDaysMs;
}

function isSameYmd(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Longest current streak of days that hit the daily target.
 *
 * Non-daily goals return 0 — streaks aren't meaningful for weekly or one-off
 * targets. Entries are summed per calendar day (multiple logs count together).
 * The streak breaks on any day the sum was below the target OR any day with
 * no entry at all.
 */
export function computeDailyStreak(
  goal: Pick<Goal, "target">,
  entries: readonly GoalProgressEntry[],
  now: Date = new Date(),
): number {
  if (goal.target.cadence !== "daily") return 0;
  if (!(goal.target.value > 0)) return 0;

  const byDay = new Map<string, number>();
  for (const entry of entries) {
    const date = new Date(entry.recorded_at);
    if (Number.isNaN(date.getTime())) continue;
    const key = ymd(date);
    byDay.set(key, (byDay.get(key) ?? 0) + Number(entry.value));
  }

  let streak = 0;
  const cursor = new Date(now);
  cursor.setHours(0, 0, 0, 0);
  for (;;) {
    const key = ymd(cursor);
    const total = byDay.get(key) ?? 0;
    if (total >= goal.target.value) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
      continue;
    }
    break;
  }
  return streak;
}

function ymd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Today's date in YYYY-MM-DD (local). Suitable as a default start_date.
 */
export function todayYmd(now: Date = new Date()): string {
  return ymd(now);
}
