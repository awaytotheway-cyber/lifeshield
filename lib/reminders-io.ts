/**
 * Supabase reads and writes for reminders. Kept out of lib/reminders.ts so
 * the pure cadence logic there stays testable without a Supabase connection.
 */
import { messageFromUnknown, rawErrorText } from "@/lib/friendly-errors";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import {
  nextOccurrence,
  type Reminder,
  type ReminderDraft,
  type ReminderStatus,
} from "@/lib/reminders";

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
    text.includes("reminders") &&
    (text.includes("does not exist") ||
      text.includes("relation") ||
      text.includes("not found"))
  );
}

const REMINDER_COLUMNS =
  "id, user_id, title, body, cadence, start_at, next_fire_at, last_fired_at, status, source_kind, source_ref, local_notification_id, created_at, updated_at";

export type LoadRemindersOutcome =
  | { ok: true; rows: Reminder[] }
  | { ok: false; rows: []; message: string; missingTable?: boolean };

export async function loadReminders(userId: string): Promise<LoadRemindersOutcome> {
  if (!isSupabaseConfigured) {
    return { ok: true, rows: [] };
  }
  try {
    const { data, error } = await withTimeout(
      supabase
        .from("reminders")
        .select(REMINDER_COLUMNS)
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      "Loading reminders",
    );
    if (error) {
      if (looksLikeMissingTable(error)) {
        return {
          ok: false,
          rows: [],
          message:
            "The reminders table isn't set up yet. Run supabase/migrations/20260925_reminders.sql.",
          missingTable: true,
        };
      }
      return {
        ok: false,
        rows: [],
        message: messageFromUnknown(error, "Couldn't load reminders."),
      };
    }
    return { ok: true, rows: (data ?? []) as Reminder[] };
  } catch (error) {
    return {
      ok: false,
      rows: [],
      message: messageFromUnknown(error, "Couldn't load reminders."),
    };
  }
}

export type CreateReminderOutcome =
  | { ok: true; row: Reminder }
  | { ok: false; message: string };

export async function createReminder(
  userId: string,
  draft: ReminderDraft,
): Promise<CreateReminderOutcome> {
  if (!isSupabaseConfigured) {
    return { ok: false, message: "Add your Supabase keys before saving reminders." };
  }
  const provisionalNext = nextOccurrence({
    cadence: draft.cadence,
    start_at: draft.start_at,
    status: "active",
  });
  try {
    const { data, error } = await withTimeout(
      supabase
        .from("reminders")
        .insert({
          user_id: userId,
          title: draft.title,
          body: draft.body,
          cadence: draft.cadence,
          start_at: draft.start_at,
          next_fire_at: provisionalNext?.toISOString() ?? null,
          source_kind: draft.source_kind ?? "self",
          source_ref: draft.source_ref ?? null,
        })
        .select(REMINDER_COLUMNS)
        .single(),
      "Saving reminder",
    );
    if (error || !data) {
      return {
        ok: false,
        message: messageFromUnknown(error, "Couldn't save this reminder."),
      };
    }
    return { ok: true, row: data as Reminder };
  } catch (error) {
    return {
      ok: false,
      message: messageFromUnknown(error, "Couldn't save this reminder."),
    };
  }
}

export type UpdateReminderOutcome =
  | { ok: true; row: Reminder }
  | { ok: false; message: string };

export async function updateReminderStatus(
  reminderId: string,
  status: ReminderStatus,
): Promise<UpdateReminderOutcome> {
  if (!isSupabaseConfigured) {
    return { ok: false, message: "Supabase not configured." };
  }
  try {
    const { data, error } = await withTimeout(
      supabase
        .from("reminders")
        .update({
          status,
          updated_at: new Date().toISOString(),
          // When pausing / completing, drop the scheduled fire time so the
          // scheduler won't try to re-arm it.
          ...(status === "active" ? {} : { next_fire_at: null }),
        })
        .eq("id", reminderId)
        .select(REMINDER_COLUMNS)
        .single(),
      "Updating reminder",
    );
    if (error || !data) {
      return {
        ok: false,
        message: messageFromUnknown(error, "Couldn't update this reminder."),
      };
    }
    return { ok: true, row: data as Reminder };
  } catch (error) {
    return {
      ok: false,
      message: messageFromUnknown(error, "Couldn't update this reminder."),
    };
  }
}

export async function updateReminderSchedule(
  reminderId: string,
  updates: {
    next_fire_at?: string | null;
    last_fired_at?: string | null;
    local_notification_id?: string | null;
    status?: ReminderStatus;
  },
): Promise<UpdateReminderOutcome> {
  if (!isSupabaseConfigured) {
    return { ok: false, message: "Supabase not configured." };
  }
  try {
    const { data, error } = await withTimeout(
      supabase
        .from("reminders")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", reminderId)
        .select(REMINDER_COLUMNS)
        .single(),
      "Updating reminder",
    );
    if (error || !data) {
      return {
        ok: false,
        message: messageFromUnknown(error, "Couldn't update this reminder."),
      };
    }
    return { ok: true, row: data as Reminder };
  } catch (error) {
    return {
      ok: false,
      message: messageFromUnknown(error, "Couldn't update this reminder."),
    };
  }
}

export type DeleteReminderOutcome =
  | { ok: true }
  | { ok: false; message: string };

export async function deleteReminder(
  reminderId: string,
): Promise<DeleteReminderOutcome> {
  if (!isSupabaseConfigured) {
    return { ok: false, message: "Supabase not configured." };
  }
  try {
    const { error } = await withTimeout(
      supabase.from("reminders").delete().eq("id", reminderId),
      "Deleting reminder",
    );
    if (error) {
      return {
        ok: false,
        message: messageFromUnknown(error, "Couldn't delete this reminder."),
      };
    }
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: messageFromUnknown(error, "Couldn't delete this reminder."),
    };
  }
}
