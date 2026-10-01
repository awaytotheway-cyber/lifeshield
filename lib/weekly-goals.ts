/**
 * Weekly goals — a short, user-set target the person works on for one week
 * (or a caller-chosen window). This file is the only place screens touch
 * the weekly_goals table.
 *
 * The rules-engine does not read these; goals are motivational, not medical.
 */
import { COPY } from "@/lib/copy";
import { messageFromUnknown, rawErrorText } from "@/lib/friendly-errors";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export type GoalType =
  | "supplement"
  | "exercise"
  | "meditation"
  | "recipe"
  | "habit";

export type GoalStatus = "active" | "completed" | "missed" | "cancelled";

export type WeeklyGoalRow = {
  id: string;
  user_id: string;
  title: string;
  goal_type: GoalType;
  target: number;
  unit: string;
  progress: number;
  start_date: string;
  end_date: string;
  status: GoalStatus;
  note: string | null;
  created_at: string;
  updated_at: string;
};

export type LoadGoalsOutcome =
  | { ok: true; rows: WeeklyGoalRow[] }
  | { ok: false; rows: []; message: string };

export type SaveGoalOutcome =
  | { ok: true; row: WeeklyGoalRow }
  | { ok: false; message: string };

const COLUMNS =
  "id, user_id, title, goal_type, target, unit, progress, start_date, end_date, status, note, created_at, updated_at";

const REQUEST_TIMEOUT_MS = 15_000;

function withTimeout<T>(
  promise: PromiseLike<T>,
  label: string,
  timeoutMs = REQUEST_TIMEOUT_MS,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${Math.round(timeoutMs / 1000)}s`));
    }, timeoutMs);
    Promise.resolve(promise)
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error: unknown) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

export function looksLikeGoalsBackendMissing(error: unknown): boolean {
  const text = rawErrorText(error).toLowerCase();
  return (
    (text.includes("weekly_goals") &&
      (text.includes("does not exist") ||
        text.includes("could not find") ||
        text.includes("schema cache") ||
        text.includes("42p01"))) ||
    (text.includes("pgrst205") && text.includes("weekly_goals"))
  );
}

export function todayIsoDate(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDaysToIsoDate(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map((s) => Number(s));
  if (!y || !m || !d) return isoDate;
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return todayIsoDate(date);
}

export function goalTypeLabel(type: GoalType): string {
  switch (type) {
    case "supplement":
      return COPY.goalsTypeSupplement;
    case "exercise":
      return COPY.goalsTypeExercise;
    case "meditation":
      return COPY.goalsTypeMeditation;
    case "recipe":
      return COPY.goalsTypeRecipe;
    case "habit":
    default:
      return COPY.goalsTypeHabit;
  }
}

export function statusLabel(status: GoalStatus): string {
  switch (status) {
    case "active":
      return COPY.goalsActiveLabel;
    case "completed":
      return COPY.goalsCompletedLabel;
    case "missed":
      return COPY.goalsMissedLabel;
    case "cancelled":
      return COPY.goalsCancelledLabel;
  }
}

export function progressPercent(row: Pick<WeeklyGoalRow, "target" | "progress">): number {
  if (row.target <= 0) return 0;
  const pct = (row.progress / row.target) * 100;
  return Math.max(0, Math.min(100, Math.round(pct)));
}

export function isOverdue(
  row: Pick<WeeklyGoalRow, "end_date" | "status">,
  now = new Date(),
): boolean {
  return row.status === "active" && row.end_date < todayIsoDate(now);
}

export async function loadOwnGoals(userId: string): Promise<LoadGoalsOutcome> {
  if (!isSupabaseConfigured) {
    return { ok: false, rows: [], message: COPY.missingKeys };
  }
  try {
    const { data, error } = await withTimeout(
      supabase
        .from("weekly_goals")
        .select(COLUMNS)
        .eq("user_id", userId)
        .order("status", { ascending: true })
        .order("end_date", { ascending: true }),
      "Loading goals",
    );
    if (error) throw error;
    return { ok: true, rows: (data as WeeklyGoalRow[]) ?? [] };
  } catch (error) {
    if (looksLikeGoalsBackendMissing(error)) {
      return { ok: false, rows: [], message: COPY.goalsNeedSql };
    }
    return {
      ok: false,
      rows: [],
      message: messageFromUnknown(error, COPY.goalsLoadFailed),
    };
  }
}

export type CreateGoalInput = {
  user_id: string;
  title: string;
  goal_type: GoalType;
  target: number;
  unit: string;
  start_date?: string;
  duration_days?: number;
  note?: string | null;
};

export async function createGoal(input: CreateGoalInput): Promise<SaveGoalOutcome> {
  if (!isSupabaseConfigured) {
    return { ok: false, message: COPY.missingKeys };
  }
  const start = input.start_date ?? todayIsoDate();
  const days = input.duration_days ?? 7;
  const end = addDaysToIsoDate(start, Math.max(1, days) - 1);
  try {
    const { data, error } = await withTimeout(
      supabase
        .from("weekly_goals")
        .insert({
          user_id: input.user_id,
          title: input.title.trim(),
          goal_type: input.goal_type,
          target: input.target,
          unit: input.unit.trim(),
          start_date: start,
          end_date: end,
          note: input.note?.trim() || null,
        })
        .select(COLUMNS)
        .single(),
      "Creating goal",
    );
    if (error) throw error;
    return { ok: true, row: data as WeeklyGoalRow };
  } catch (error) {
    if (looksLikeGoalsBackendMissing(error)) {
      return { ok: false, message: COPY.goalsNeedSql };
    }
    return { ok: false, message: messageFromUnknown(error, COPY.goalsLoadFailed) };
  }
}

async function patchGoal(
  id: string,
  patch: Partial<Pick<WeeklyGoalRow, "progress" | "status">>,
): Promise<SaveGoalOutcome> {
  if (!isSupabaseConfigured) {
    return { ok: false, message: COPY.missingKeys };
  }
  try {
    const { data, error } = await withTimeout(
      supabase
        .from("weekly_goals")
        .update(patch)
        .eq("id", id)
        .select(COLUMNS)
        .single(),
      "Updating goal",
    );
    if (error) throw error;
    return { ok: true, row: data as WeeklyGoalRow };
  } catch (error) {
    if (looksLikeGoalsBackendMissing(error)) {
      return { ok: false, message: COPY.goalsNeedSql };
    }
    return { ok: false, message: messageFromUnknown(error, COPY.goalsLoadFailed) };
  }
}

export function incrementGoal(row: WeeklyGoalRow, by = 1): Promise<SaveGoalOutcome> {
  const next = row.progress + by;
  const status: GoalStatus = next >= row.target ? "completed" : row.status;
  return patchGoal(row.id, { progress: next, status });
}

export function completeGoal(id: string): Promise<SaveGoalOutcome> {
  return patchGoal(id, { status: "completed" });
}

export function markGoalMissed(id: string): Promise<SaveGoalOutcome> {
  return patchGoal(id, { status: "missed" });
}

export function cancelGoal(id: string): Promise<SaveGoalOutcome> {
  return patchGoal(id, { status: "cancelled" });
}

export async function deleteGoal(id: string): Promise<
  { ok: true } | { ok: false; message: string }
> {
  if (!isSupabaseConfigured) {
    return { ok: false, message: COPY.missingKeys };
  }
  try {
    const { error } = await withTimeout(
      supabase.from("weekly_goals").delete().eq("id", id),
      "Deleting goal",
    );
    if (error) throw error;
    return { ok: true };
  } catch (error) {
    if (looksLikeGoalsBackendMissing(error)) {
      return { ok: false, message: COPY.goalsNeedSql };
    }
    return { ok: false, message: messageFromUnknown(error, COPY.goalsLoadFailed) };
  }
}

export function activeGoals(rows: WeeklyGoalRow[]): WeeklyGoalRow[] {
  return rows.filter((r) => r.status === "active");
}

export function endingSoonGoals(rows: WeeklyGoalRow[], withinDays = 1): WeeklyGoalRow[] {
  const today = todayIsoDate();
  const cutoff = addDaysToIsoDate(today, withinDays);
  return rows.filter(
    (r) => r.status === "active" && r.end_date <= cutoff && r.end_date >= today,
  );
}
