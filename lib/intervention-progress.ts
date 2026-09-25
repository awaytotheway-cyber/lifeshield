/**
 * Per-intervention progress log (Phase B).
 *
 * Distinct from lib/goals-io.ts's goal_progress — this one is keyed on a
 * clinical `interventions` row, so a user can log "took today's dose" or
 * "walked 20 min" against the plan item itself, whether or not they've also
 * set a companion Goal.
 */
import { messageFromUnknown } from "@/lib/friendly-errors";
import {
  countDoneInLast7Days,
  type InterventionProgressEntry,
  type InterventionProgressValue,
} from "@/lib/intervention-progress-summary";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export {
  countDoneInLast7Days,
  type InterventionProgressEntry,
  type InterventionProgressValue,
};

const COLUMNS = "id, intervention_id, user_id, recorded_at, value, note";

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

export type LoadOutcome =
  | { ok: true; rows: InterventionProgressEntry[] }
  | { ok: false; rows: []; message: string };

export async function loadInterventionProgress(
  interventionId: string,
): Promise<LoadOutcome> {
  if (!isSupabaseConfigured) return { ok: true, rows: [] };
  try {
    const { data, error } = await withTimeout(
      supabase
        .from("intervention_progress")
        .select(COLUMNS)
        .eq("intervention_id", interventionId)
        .order("recorded_at", { ascending: false })
        .limit(50),
      "Loading progress",
    );
    if (error) {
      return {
        ok: false,
        rows: [],
        message: messageFromUnknown(error, "Couldn't load progress."),
      };
    }
    return {
      ok: true,
      rows: (data ?? []) as InterventionProgressEntry[],
    };
  } catch (error) {
    return {
      ok: false,
      rows: [],
      message: messageFromUnknown(error, "Couldn't load progress."),
    };
  }
}

export type LogOutcome =
  | { ok: true; row: InterventionProgressEntry }
  | { ok: false; message: string };

export async function logInterventionProgress(
  interventionId: string,
  userId: string,
  value: InterventionProgressValue,
  note: string | null,
): Promise<LogOutcome> {
  if (!isSupabaseConfigured) {
    return { ok: false, message: "Supabase not configured." };
  }
  try {
    const { data, error } = await withTimeout(
      supabase
        .from("intervention_progress")
        .insert({
          intervention_id: interventionId,
          user_id: userId,
          value,
          note: note && note.trim().length > 0 ? note.trim() : null,
        })
        .select(COLUMNS)
        .single(),
      "Logging progress",
    );
    if (error || !data) {
      return {
        ok: false,
        message: messageFromUnknown(error, "Couldn't log progress."),
      };
    }
    return { ok: true, row: data as InterventionProgressEntry };
  } catch (error) {
    return {
      ok: false,
      message: messageFromUnknown(error, "Couldn't log progress."),
    };
  }
}

