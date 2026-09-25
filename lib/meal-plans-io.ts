/**
 * Supabase reads / writes for user meal plans. Kept out of lib/meal-planner
 * so the pure generator stays testable without a Supabase connection.
 */
import { messageFromUnknown, rawErrorText } from "@/lib/friendly-errors";
import type {
  MealPlanPayload,
  MealPlanPreferences,
} from "@/lib/meal-planner";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export type MealPlanStatus = "active" | "completed" | "archived";

export type MealPlanRow = {
  id: string;
  user_id: string;
  title: string;
  start_date: string;
  end_date: string;
  plan: MealPlanPayload;
  preferences: MealPlanPreferences;
  status: MealPlanStatus;
  source_kind: string;
  source_ref: string | null;
  created_at: string;
  updated_at: string;
};

const COLUMNS =
  "id, user_id, title, start_date, end_date, plan, preferences, status, source_kind, source_ref, created_at, updated_at";

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
    text.includes("meal_plans") &&
    (text.includes("does not exist") ||
      text.includes("relation") ||
      text.includes("not found"))
  );
}

function normalisePlan(raw: unknown): MealPlanPayload {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { days: [] };
  }
  const days = (raw as { days?: unknown }).days;
  return { days: Array.isArray(days) ? (days as MealPlanPayload["days"]) : [] };
}

function normalisePreferences(raw: unknown): MealPlanPreferences {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { slots: [], avoid_tags: [] };
  }
  const source = raw as { slots?: unknown; avoid_tags?: unknown };
  return {
    slots: Array.isArray(source.slots)
      ? (source.slots as MealPlanPreferences["slots"])
      : [],
    avoid_tags: Array.isArray(source.avoid_tags)
      ? (source.avoid_tags as string[])
      : [],
  };
}

function toRow(raw: Record<string, unknown>): MealPlanRow {
  return {
    id: raw.id as string,
    user_id: raw.user_id as string,
    title: raw.title as string,
    start_date: raw.start_date as string,
    end_date: raw.end_date as string,
    plan: normalisePlan(raw.plan),
    preferences: normalisePreferences(raw.preferences),
    status: (raw.status as MealPlanStatus) ?? "active",
    source_kind: (raw.source_kind as string) ?? "self",
    source_ref: (raw.source_ref as string | null) ?? null,
    created_at: raw.created_at as string,
    updated_at: raw.updated_at as string,
  };
}

export type LoadPlansOutcome =
  | { ok: true; rows: MealPlanRow[] }
  | { ok: false; rows: []; message: string; missingTable?: boolean };

export async function loadMealPlans(userId: string): Promise<LoadPlansOutcome> {
  if (!isSupabaseConfigured) return { ok: true, rows: [] };
  try {
    const { data, error } = await withTimeout(
      supabase
        .from("meal_plans")
        .select(COLUMNS)
        .eq("user_id", userId)
        .order("start_date", { ascending: false }),
      "Loading meal plans",
    );
    if (error) {
      if (looksLikeMissingTable(error)) {
        return {
          ok: false,
          rows: [],
          message:
            "Meal plans table isn't set up yet. Run supabase/migrations/20260926_meal_plans.sql.",
          missingTable: true,
        };
      }
      return {
        ok: false,
        rows: [],
        message: messageFromUnknown(error, "Couldn't load meal plans."),
      };
    }
    const rows = (data ?? []).map((raw) => toRow(raw as Record<string, unknown>));
    return { ok: true, rows };
  } catch (error) {
    return {
      ok: false,
      rows: [],
      message: messageFromUnknown(error, "Couldn't load meal plans."),
    };
  }
}

export type LoadPlanOutcome =
  | { ok: true; row: MealPlanRow | null }
  | { ok: false; message: string };

export async function loadMealPlanById(id: string): Promise<LoadPlanOutcome> {
  if (!isSupabaseConfigured) return { ok: true, row: null };
  try {
    const { data, error } = await withTimeout(
      supabase.from("meal_plans").select(COLUMNS).eq("id", id).maybeSingle(),
      "Loading meal plan",
    );
    if (error) {
      return {
        ok: false,
        message: messageFromUnknown(error, "Couldn't load meal plan."),
      };
    }
    if (!data) return { ok: true, row: null };
    return { ok: true, row: toRow(data as Record<string, unknown>) };
  } catch (error) {
    return {
      ok: false,
      message: messageFromUnknown(error, "Couldn't load meal plan."),
    };
  }
}

export type CreatePlanInput = {
  title: string;
  start_date: string;
  end_date: string;
  plan: MealPlanPayload;
  preferences: MealPlanPreferences;
};

export type CreatePlanOutcome =
  | { ok: true; row: MealPlanRow }
  | { ok: false; message: string };

export async function createMealPlan(
  userId: string,
  input: CreatePlanInput,
): Promise<CreatePlanOutcome> {
  if (!isSupabaseConfigured) {
    return { ok: false, message: "Add your Supabase keys before saving." };
  }
  try {
    const { data, error } = await withTimeout(
      supabase
        .from("meal_plans")
        .insert({
          user_id: userId,
          title: input.title,
          start_date: input.start_date,
          end_date: input.end_date,
          plan: input.plan,
          preferences: input.preferences,
        })
        .select(COLUMNS)
        .single(),
      "Saving meal plan",
    );
    if (error || !data) {
      return {
        ok: false,
        message: messageFromUnknown(error, "Couldn't save meal plan."),
      };
    }
    return { ok: true, row: toRow(data as Record<string, unknown>) };
  } catch (error) {
    return {
      ok: false,
      message: messageFromUnknown(error, "Couldn't save meal plan."),
    };
  }
}

export type UpdateStatusOutcome =
  | { ok: true; row: MealPlanRow }
  | { ok: false; message: string };

export async function updateMealPlanStatus(
  id: string,
  status: MealPlanStatus,
): Promise<UpdateStatusOutcome> {
  if (!isSupabaseConfigured) {
    return { ok: false, message: "Supabase not configured." };
  }
  try {
    const { data, error } = await withTimeout(
      supabase
        .from("meal_plans")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select(COLUMNS)
        .single(),
      "Updating meal plan",
    );
    if (error || !data) {
      return {
        ok: false,
        message: messageFromUnknown(error, "Couldn't update meal plan."),
      };
    }
    return { ok: true, row: toRow(data as Record<string, unknown>) };
  } catch (error) {
    return {
      ok: false,
      message: messageFromUnknown(error, "Couldn't update meal plan."),
    };
  }
}

export type DeletePlanOutcome =
  | { ok: true }
  | { ok: false; message: string };

export async function deleteMealPlan(
  id: string,
): Promise<DeletePlanOutcome> {
  if (!isSupabaseConfigured) {
    return { ok: false, message: "Supabase not configured." };
  }
  try {
    const { error } = await withTimeout(
      supabase.from("meal_plans").delete().eq("id", id),
      "Deleting meal plan",
    );
    if (error) {
      return {
        ok: false,
        message: messageFromUnknown(error, "Couldn't delete meal plan."),
      };
    }
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: messageFromUnknown(error, "Couldn't delete meal plan."),
    };
  }
}
