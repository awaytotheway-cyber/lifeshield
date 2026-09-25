/**
 * User-defined reminders. Pure functions only — Supabase reads/writes live in
 * lib/reminders-io.ts and local notification scheduling in
 * lib/reminders-notifications.ts. This split keeps the cadence math testable
 * without the app frame.
 *
 * Not to be confused with lib/follow-ups.ts — those are clinical follow-ups
 * (retest / review / symptom re-check) driven by the rules engine. A future
 * refactor may extract shared notification-scheduling primitives; for Phase A
 * the two surfaces stay independent so shipping one can't break the other.
 */

export type ReminderCadence = "once" | "daily" | "weekly" | "monthly";

export type ReminderStatus = "active" | "paused" | "completed";

export type ReminderSourceKind =
  | "self"
  | "goal"
  | "intervention"
  | "supplement"
  | "test_order";

export type Reminder = {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  cadence: ReminderCadence;
  start_at: string; // ISO timestamp
  next_fire_at: string | null;
  last_fired_at: string | null;
  status: ReminderStatus;
  source_kind: ReminderSourceKind;
  source_ref: string | null;
  local_notification_id: string | null;
  created_at: string;
  updated_at: string;
};

export type ReminderDraft = {
  title: string;
  body: string | null;
  cadence: ReminderCadence;
  start_at: string;
  source_kind?: ReminderSourceKind;
  source_ref?: string | null;
};

export type ReminderValidationError = {
  field: "title" | "cadence" | "start_at";
  message: string;
};

const ALLOWED_CADENCES: readonly ReminderCadence[] = [
  "once",
  "daily",
  "weekly",
  "monthly",
];

/**
 * Returns [] when the draft is savable.
 *
 * Rules:
 *   - title required (people forget what a reminder was for otherwise).
 *   - cadence must be one of the allowed values.
 *   - start_at must parse as a real timestamp. It may be in the past — the
 *     next-occurrence logic handles rolling forward for recurring cadences.
 *     Only a 'once' reminder in the past is rejected on save.
 */
export function validateReminderDraft(
  draft: ReminderDraft,
): ReminderValidationError[] {
  const errors: ReminderValidationError[] = [];

  if (!draft.title || draft.title.trim().length === 0) {
    errors.push({ field: "title", message: "Give this reminder a title." });
  }
  if (!ALLOWED_CADENCES.includes(draft.cadence)) {
    errors.push({
      field: "cadence",
      message: "Cadence must be once, daily, weekly, or monthly.",
    });
  }
  const parsed = new Date(draft.start_at);
  if (Number.isNaN(parsed.getTime())) {
    errors.push({ field: "start_at", message: "Enter a valid start time." });
  } else if (draft.cadence === "once" && parsed.getTime() < Date.now()) {
    errors.push({
      field: "start_at",
      message: "A one-off reminder must be in the future.",
    });
  }
  return errors;
}

/**
 * Compute the next fire time for a reminder as of `now`.
 *
 * Returns null when nothing will fire again: paused, completed, or a 'once'
 * reminder whose start_at has already passed.
 *
 * Rules:
 *   - once:    the start_at itself if in the future, else null.
 *   - daily:   the next start_at time-of-day at or after `now`. If the
 *              time-of-day today has already passed, moves to tomorrow.
 *   - weekly:  the next same-weekday-as-start at the start's time-of-day,
 *              at or after `now`.
 *   - monthly: the next same-day-of-month at the start's time-of-day. When
 *              the target month is shorter than the anchor day (e.g. anchor
 *              on the 31st, target month has 30 days), falls back to the
 *              last day of the month.
 */
export function nextOccurrence(
  reminder: Pick<Reminder, "cadence" | "start_at" | "status">,
  now: Date = new Date(),
): Date | null {
  if (reminder.status !== "active") return null;
  const start = new Date(reminder.start_at);
  if (Number.isNaN(start.getTime())) return null;

  if (reminder.cadence === "once") {
    return start.getTime() > now.getTime() ? start : null;
  }

  if (reminder.cadence === "daily") {
    const candidate = withTimeOfDay(now, start);
    if (candidate.getTime() > now.getTime()) return candidate;
    return addDays(candidate, 1);
  }

  if (reminder.cadence === "weekly") {
    const targetDow = start.getDay();
    const candidate = withTimeOfDay(now, start);
    const currentDow = candidate.getDay();
    let deltaDays = (targetDow - currentDow + 7) % 7;
    if (deltaDays === 0 && candidate.getTime() <= now.getTime()) {
      deltaDays = 7;
    }
    return addDays(candidate, deltaDays);
  }

  // monthly
  const anchorDay = start.getDate();
  const attemptFor = (year: number, monthIndex: number): Date => {
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const day = Math.min(anchorDay, daysInMonth);
    return new Date(
      year,
      monthIndex,
      day,
      start.getHours(),
      start.getMinutes(),
      start.getSeconds(),
      0,
    );
  };
  let candidate = attemptFor(now.getFullYear(), now.getMonth());
  if (candidate.getTime() <= now.getTime()) {
    const nextMonthIndex = now.getMonth() + 1;
    candidate = attemptFor(
      now.getFullYear() + Math.floor(nextMonthIndex / 12),
      nextMonthIndex % 12,
    );
  }
  return candidate;
}

/**
 * After a fire event, compute what the next fire time should be. Delegates to
 * nextOccurrence with a `now` set just after the fired moment so a daily/
 * weekly/monthly reminder always advances by at least one cycle.
 *
 * A 'once' reminder returns null (the caller then sets status to 'completed').
 */
export function advanceAfterFire(
  reminder: Pick<Reminder, "cadence" | "start_at" | "status">,
  firedAt: Date,
): Date | null {
  if (reminder.cadence === "once") return null;
  return nextOccurrence(
    reminder,
    new Date(firedAt.getTime() + 1_000),
  );
}

/**
 * Human summary of a reminder's schedule ("Daily at 09:00", "Weekly on Mon",
 * "Monthly on day 15", "One-off"). Kept out of the UI file so the same phrase
 * shows up in list, detail and notification-tap toasts.
 */
export function scheduleLabel(
  reminder: Pick<Reminder, "cadence" | "start_at">,
): string {
  const start = new Date(reminder.start_at);
  if (Number.isNaN(start.getTime())) return "";
  const hhmm = `${String(start.getHours()).padStart(2, "0")}:${String(
    start.getMinutes(),
  ).padStart(2, "0")}`;
  switch (reminder.cadence) {
    case "once":
      return `Once on ${start.toLocaleDateString()} at ${hhmm}`;
    case "daily":
      return `Daily at ${hhmm}`;
    case "weekly": {
      const dowNames = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ];
      return `Weekly on ${dowNames[start.getDay()]} at ${hhmm}`;
    }
    case "monthly":
      return `Monthly on day ${start.getDate()} at ${hhmm}`;
    default:
      return "";
  }
}

function withTimeOfDay(base: Date, source: Date): Date {
  const result = new Date(base);
  result.setHours(
    source.getHours(),
    source.getMinutes(),
    source.getSeconds(),
    0,
  );
  return result;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
