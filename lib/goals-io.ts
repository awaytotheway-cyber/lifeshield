/**
 * Supabase reads and writes for goals. Kept out of lib/goals.ts so the
 * pure logic there can stay testable without a Supabase connection.
 */
import { messageFromUnknown, rawErrorText } from "@/lib/friendly-errors";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type {
  Goal,
  GoalDraft,
  GoalProgressEntry,
  GoalStatus,
} from "@/lib/goals";

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

function looksLikeMissingTable(error: unknown): boolean {
  const text = rawErrorText(error).toLowerCase();
  return (
    text.includes("goals") &&
    (text.includes("does not exist") ||
      text.includes("relation") ||
      text.includes("not found"))
  );
}

const GOAL_COLUMNS =
  "id, user_id, goal_type, title, target, start_date, end_date, status, source_kind, source_ref, created_at, updated_at";
const PROGRESS_COLUMNS =
  "id, goal_id, user_id, recorded_at, value, note";

export type LoadGoalsOutcome =
  | { ok: true; rows: Goal[] }
  | { ok: false; rows: []; message: string; missingTable?: boolean };

export async function loadGoals(userId: string): Promise<LoadGoalsOutcome> {
  if (!isSupabaseConfigured) {
    return { ok: true, rows: [] };
  }
  try {
    const { data, error } = await withTimeout(
      supabase
        .from("goals")
        .select(GOAL_COLUMNS)
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      "Loading your goals",
    );
    if (error) {
      if (looksLikeMissingTable(error)) {
        return {
          ok: false,
          rows: [],
          message:
            "The goals table isn't set up yet. Run supabase/migrations/20260925_feature_flags_and_goals.sql.",
          missingTable: true,
        };
      }
      return {
        ok: false,
        rows: [],
        message: messageFromUnknown(error, "Couldn't load your goals."),
      };
    }
    return { ok: true, rows: (data ?? []) as Goal[] };
  } catch (error) {
    return {
      ok: false,
      rows: [],
      message: messageFromUnknown(error, "Couldn't load your goals."),
    };
  }
}

export type CreateGoalOutcome =
  | { ok: true; row: Goal }
  | { ok: false; message: string };

export async function createGoal(
  userId: string,
  draft: GoalDraft,
): Promise<CreateGoalOutcome> {
  if (!isSupabaseConfigured) {
    return { ok: false, message: "Add your Supabase keys before saving goals." };
  }
  try {
    const { data, error } = await withTimeout(
      supabase
        .from("goals")
        .insert({
          user_id: userId,
          goal_type: draft.goal_type,
          title: draft.title,
          target: draft.target,
          start_date: draft.start_date,
          end_date: draft.end_date,
          source_kind: draft.source_kind ?? "self",
          source_ref: draft.source_ref ?? null,
        })
        .select(GOAL_COLUMNS)
        .single(),
      "Saving your goal",
    );
    if (error || !data) {
      return {
        ok: false,
        message: messageFromUnknown(error, "Couldn't save this goal."),
      };
    }
    return { ok: true, row: data as Goal };
  } catch (error) {
    return {
      ok: false,
      message: messageFromUnknown(error, "Couldn't save this goal."),
    };
  }
}

export type UpdateGoalStatusOutcome =
  | { ok: true }
  | { ok: false; message: string };

export async function updateGoalStatus(
  goalId: string,
  status: GoalStatus,
): Promise<UpdateGoalStatusOutcome> {
  if (!isSupabaseConfigured) {
    return { ok: false, message: "Supabase not configured." };
  }
  try {
    const { error } = await withTimeout(
      supabase
        .from("goals")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", goalId),
      "Updating goal status",
    );
    if (error) {
      return {
        ok: false,
        message: messageFromUnknown(error, "Couldn't update this goal."),
      };
    }
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: messageFromUnknown(error, "Couldn't update this goal."),
    };
  }
}

export type LoadProgressOutcome =
  | { ok: true; rows: GoalProgressEntry[] }
  | { ok: false; rows: []; message: string };

export async function loadGoalProgress(
  goalId: string,
): Promise<LoadProgressOutcome> {
  if (!isSupabaseConfigured) {
    return { ok: true, rows: [] };
  }
  try {
    const { data, error } = await withTimeout(
      supabase
        .from("goal_progress")
        .select(PROGRESS_COLUMNS)
        .eq("goal_id", goalId)
        .order("recorded_at", { ascending: false })
        .limit(200),
      "Loading progress",
    );
    if (error) {
      return {
        ok: false,
        rows: [],
        message: messageFromUnknown(error, "Couldn't load progress."),
      };
    }
    return { ok: true, rows: (data ?? []) as GoalProgressEntry[] };
  } catch (error) {
    return {
      ok: false,
      rows: [],
      message: messageFromUnknown(error, "Couldn't load progress."),
    };
  }
}

export type LogProgressOutcome =
  | { ok: true; row: GoalProgressEntry }
  | { ok: false; message: string };

export async function logGoalProgress(
  userId: string,
  goalId: string,
  value: number,
  note: string | null,
): Promise<LogProgressOutcome> {
  if (!isSupabaseConfigured) {
    return { ok: false, message: "Supabase not configured." };
  }
  if (!Number.isFinite(value) || value <= 0) {
    return { ok: false, message: "Progress amount must be a positive number." };
  }
  try {
    const { data, error } = await withTimeout(
      supabase
        .from("goal_progress")
        .insert({
          user_id: userId,
          goal_id: goalId,
          value,
          note: note && note.trim().length > 0 ? note.trim() : null,
        })
        .select(PROGRESS_COLUMNS)
        .single(),
      "Logging progress",
    );
    if (error || !data) {
      return {
        ok: false,
        message: messageFromUnknown(error, "Couldn't log progress."),
      };
    }
    return { ok: true, row: data as GoalProgressEntry };
  } catch (error) {
    return {
      ok: false,
      message: messageFromUnknown(error, "Couldn't log progress."),
    };
  }
}
