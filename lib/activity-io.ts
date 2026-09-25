/**
 * Supabase reads and writes for activity snapshots. Kept out of
 * lib/activity.ts so the pure aggregation logic stays testable without
 * a Supabase connection.
 *
 * Upserts collapse on (user, source, kind, day) so re-syncing HealthKit
 * a second time in the same day doesn't pile up duplicates, and a
 * manual re-entry replaces rather than accumulates.
 */
import { messageFromUnknown, rawErrorText } from "@/lib/friendly-errors";
import {
  normaliseIncoming,
  type ActivityKind,
  type ActivitySnapshot,
  type ActivitySource,
} from "@/lib/activity";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

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
    text.includes("activity_snapshots") &&
    (text.includes("does not exist") ||
      text.includes("relation") ||
      text.includes("not found"))
  );
}

const COLUMNS =
  "id, user_id, source, kind, value, unit, value_json, recorded_at, created_at";

function toSnapshot(raw: Record<string, unknown>): ActivitySnapshot {
  return {
    id: raw.id as string,
    user_id: raw.user_id as string,
    source: (raw.source as ActivitySource) ?? "manual",
    kind: raw.kind as ActivityKind,
    value: Number(raw.value ?? 0),
    unit: (raw.unit as string) ?? "",
    value_json: (raw.value_json as Record<string, unknown>) ?? {},
    recorded_at: raw.recorded_at as string,
    created_at: raw.created_at as string,
  };
}

export type LoadRecentOutcome =
  | { ok: true; rows: ActivitySnapshot[] }
  | { ok: false; rows: []; message: string; missingTable?: boolean };

/**
 * Load the caller's snapshots for the last `days` days across every
 * source/kind. Enough for the summary card + a 7- or 14-day chart.
 */
export async function loadRecentActivity(
  userId: string,
  days = 14,
): Promise<LoadRecentOutcome> {
  if (!isSupabaseConfigured) return { ok: true, rows: [] };
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const { data, error } = await withTimeout(
      supabase
        .from("activity_snapshots")
        .select(COLUMNS)
        .eq("user_id", userId)
        .gte("recorded_at", cutoff.toISOString())
        .order("recorded_at", { ascending: false }),
      "Loading activity",
    );
    if (error) {
      if (looksLikeMissingTable(error)) {
        return {
          ok: false,
          rows: [],
          message:
            "Activity snapshots table isn't set up yet. Run supabase/migrations/20260927_activity_snapshots.sql.",
          missingTable: true,
        };
      }
      return {
        ok: false,
        rows: [],
        message: messageFromUnknown(error, "Couldn't load activity."),
      };
    }
    const rows = ((data ?? []) as Record<string, unknown>[]).map(toSnapshot);
    return { ok: true, rows };
  } catch (error) {
    return {
      ok: false,
      rows: [],
      message: messageFromUnknown(error, "Couldn't load activity."),
    };
  }
}

export type UpsertInput = {
  kind: ActivityKind;
  value: number;
  unit?: string;
  source?: ActivitySource;
  recorded_at?: string; // ISO; defaults to now
  value_json?: Record<string, unknown>;
};

export type UpsertOutcome =
  | { ok: true; row: ActivitySnapshot }
  | { ok: false; message: string };

/**
 * Upsert one reading. Normalises units to canonical before insert; the
 * DB UNIQUE(user_id, source, kind, recorded_at) collapses a same-day
 * re-sync onto the existing row. `onConflict: "..."` names the fields
 * that own the uniqueness so the client library picks the right index.
 */
export async function upsertSnapshot(
  userId: string,
  input: UpsertInput,
): Promise<UpsertOutcome> {
  if (!isSupabaseConfigured) {
    return { ok: false, message: "Supabase not configured." };
  }
  const source: ActivitySource = input.source ?? "manual";
  const recorded_at = input.recorded_at ?? new Date().toISOString();
  const { value, unit } = normaliseIncoming(
    input.kind,
    input.value,
    input.unit ?? "",
  );
  try {
    const { data, error } = await withTimeout(
      supabase
        .from("activity_snapshots")
        .upsert(
          {
            user_id: userId,
            source,
            kind: input.kind,
            value,
            unit,
            value_json: input.value_json ?? {},
            recorded_at,
          },
          { onConflict: "user_id,source,kind,recorded_at" },
        )
        .select(COLUMNS)
        .single(),
      "Saving activity",
    );
    if (error || !data) {
      return {
        ok: false,
        message: messageFromUnknown(error, "Couldn't save this reading."),
      };
    }
    return { ok: true, row: toSnapshot(data as Record<string, unknown>) };
  } catch (error) {
    return {
      ok: false,
      message: messageFromUnknown(error, "Couldn't save this reading."),
    };
  }
}

export type DeleteOutcome = { ok: true } | { ok: false; message: string };

export async function deleteSnapshot(id: string): Promise<DeleteOutcome> {
  if (!isSupabaseConfigured) {
    return { ok: false, message: "Supabase not configured." };
  }
  try {
    const { error } = await withTimeout(
      supabase.from("activity_snapshots").delete().eq("id", id),
      "Deleting activity",
    );
    if (error) {
      return {
        ok: false,
        message: messageFromUnknown(error, "Couldn't delete this reading."),
      };
    }
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: messageFromUnknown(error, "Couldn't delete this reading."),
    };
  }
}
