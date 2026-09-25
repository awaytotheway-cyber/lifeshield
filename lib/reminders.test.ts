/**
 *   npx --yes tsx --tsconfig tsconfig.json lib/reminders.test.ts
 */
import assert from "node:assert/strict";
import {
  advanceAfterFire,
  interventionToReminderPrefill,
  nextOccurrence,
  scheduleLabel,
  validateReminderDraft,
  type Reminder,
} from "./reminders";

// ---------- validateReminderDraft ----------

const future = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
const past = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

assert.deepEqual(
  validateReminderDraft({
    title: "Take vitamin D",
    body: null,
    cadence: "daily",
    start_at: future,
  }),
  [],
);

// Blank title
{
  const errs = validateReminderDraft({
    title: "  ",
    body: null,
    cadence: "daily",
    start_at: future,
  });
  assert.equal(errs.some((e) => e.field === "title"), true);
}
// Bad cadence
{
  const errs = validateReminderDraft({
    title: "T",
    body: null,
    cadence: "yearly" as unknown as "daily",
    start_at: future,
  });
  assert.equal(errs.some((e) => e.field === "cadence"), true);
}
// Malformed start_at
{
  const errs = validateReminderDraft({
    title: "T",
    body: null,
    cadence: "daily",
    start_at: "not-a-date",
  });
  assert.equal(errs.some((e) => e.field === "start_at"), true);
}
// Past 'once' rejected
{
  const errs = validateReminderDraft({
    title: "T",
    body: null,
    cadence: "once",
    start_at: past,
  });
  assert.equal(errs.some((e) => e.field === "start_at"), true);
}
// Past start_at is fine for recurring cadences — nextOccurrence rolls forward.
assert.deepEqual(
  validateReminderDraft({
    title: "T",
    body: null,
    cadence: "daily",
    start_at: past,
  }),
  [],
);

// ---------- nextOccurrence ----------

function ymdhm(y: number, m: number, d: number, h: number, min: number): Date {
  return new Date(y, m - 1, d, h, min, 0, 0);
}
function reminder(
  cadence: Reminder["cadence"],
  start: Date,
  status: Reminder["status"] = "active",
): Pick<Reminder, "cadence" | "start_at" | "status"> {
  return { cadence, start_at: start.toISOString(), status };
}

// Paused / completed reminders never fire.
assert.equal(
  nextOccurrence(
    reminder("daily", ymdhm(2026, 9, 25, 9, 0), "paused"),
    ymdhm(2026, 9, 25, 10, 0),
  ),
  null,
);
assert.equal(
  nextOccurrence(
    reminder("daily", ymdhm(2026, 9, 25, 9, 0), "completed"),
    ymdhm(2026, 9, 25, 10, 0),
  ),
  null,
);

// Once — future
{
  const start = ymdhm(2026, 9, 25, 15, 0);
  const now = ymdhm(2026, 9, 25, 12, 0);
  const next = nextOccurrence(reminder("once", start), now);
  assert.equal(next?.getTime(), start.getTime());
}
// Once — past
{
  const start = ymdhm(2026, 9, 25, 10, 0);
  const now = ymdhm(2026, 9, 25, 12, 0);
  assert.equal(nextOccurrence(reminder("once", start), now), null);
}

// Daily — later today
{
  const start = ymdhm(2026, 9, 1, 21, 0);
  const now = ymdhm(2026, 9, 25, 20, 0);
  const next = nextOccurrence(reminder("daily", start), now);
  assert.equal(next?.getHours(), 21);
  assert.equal(next?.getDate(), 25);
}
// Daily — earlier today rolls to tomorrow
{
  const start = ymdhm(2026, 9, 1, 8, 0);
  const now = ymdhm(2026, 9, 25, 12, 0);
  const next = nextOccurrence(reminder("daily", start), now);
  assert.equal(next?.getHours(), 8);
  assert.equal(next?.getDate(), 26);
}

// Weekly — same weekday, later today
{
  const start = ymdhm(2026, 9, 18, 18, 0); // Sept 18, 2026 = Friday
  const now = ymdhm(2026, 9, 25, 12, 0); // also a Friday
  const next = nextOccurrence(reminder("weekly", start), now);
  assert.equal(next?.getDay(), 5); // Friday
  assert.equal(next?.getDate(), 25);
  assert.equal(next?.getHours(), 18);
}
// Weekly — same weekday, earlier today rolls a week
{
  const start = ymdhm(2026, 9, 18, 8, 0);
  const now = ymdhm(2026, 9, 25, 12, 0); // Friday
  const next = nextOccurrence(reminder("weekly", start), now);
  assert.equal(next?.getDay(), 5);
  // Sept 25 + 7 days = Oct 2 (JS Date rolls month over).
  assert.equal(next?.getMonth(), 9); // October
  assert.equal(next?.getDate(), 2);
}
// Weekly — different weekday
{
  const start = ymdhm(2026, 9, 21, 9, 0); // Monday
  const now = ymdhm(2026, 9, 25, 12, 0); // Friday
  const next = nextOccurrence(reminder("weekly", start), now);
  assert.equal(next?.getDay(), 1); // Monday
  assert.equal(next?.getDate(), 28);
}

// Monthly — same day-of-month, later today
{
  const start = ymdhm(2026, 1, 15, 20, 0);
  const now = ymdhm(2026, 9, 15, 12, 0);
  const next = nextOccurrence(reminder("monthly", start), now);
  assert.equal(next?.getDate(), 15);
  assert.equal(next?.getMonth(), 8); // September
}
// Monthly — anchor day past this month rolls to next month
{
  const start = ymdhm(2026, 1, 15, 9, 0);
  const now = ymdhm(2026, 9, 15, 12, 0);
  const next = nextOccurrence(reminder("monthly", start), now);
  assert.equal(next?.getMonth(), 9); // October
  assert.equal(next?.getDate(), 15);
}
// Monthly — anchor on the 31st, target month with 30 days clamps to 30
{
  const start = ymdhm(2026, 1, 31, 10, 0);
  const now = ymdhm(2026, 4, 1, 12, 0); // April = 30 days
  const next = nextOccurrence(reminder("monthly", start), now);
  assert.equal(next?.getMonth(), 3); // April
  assert.equal(next?.getDate(), 30);
}

// ---------- advanceAfterFire ----------
{
  // A daily reminder fires at 9am today; next should be tomorrow at 9am.
  const start = ymdhm(2026, 9, 25, 9, 0);
  const firedAt = ymdhm(2026, 9, 25, 9, 0);
  const next = advanceAfterFire(reminder("daily", start), firedAt);
  assert.equal(next?.getHours(), 9);
  assert.equal(next?.getDate(), 26);
}
{
  // A once reminder returns null after firing.
  const start = ymdhm(2026, 9, 25, 9, 0);
  const next = advanceAfterFire(reminder("once", start), start);
  assert.equal(next, null);
}

// ---------- scheduleLabel ----------
{
  const start = ymdhm(2026, 9, 25, 9, 5);
  assert.equal(scheduleLabel(reminder("daily", start)), "Daily at 09:05");
  assert.equal(
    scheduleLabel(reminder("weekly", start)),
    "Weekly on Friday at 09:05",
  );
  assert.equal(
    scheduleLabel(reminder("monthly", start)),
    "Monthly on day 25 at 09:05",
  );
}

// ---------- interventionToReminderPrefill ----------

// Supplement → daily at 09:00, prefixed title, source pointing at the row.
{
  const prefill = interventionToReminderPrefill({
    id: "int-1",
    category: "supplement",
    title: "Vitamin D3 2000 IU",
  });
  assert.equal(prefill.cadence, "daily");
  assert.equal(prefill.title, "Take: Vitamin D3 2000 IU");
  assert.equal(prefill.source_kind, "intervention");
  assert.equal(prefill.source_ref, "int-1");
  const start = new Date(prefill.start_at);
  assert.equal(start.getHours(), 9);
  // The composed draft must validate on the first render.
  assert.deepEqual(
    validateReminderDraft({
      title: prefill.title,
      body: prefill.body,
      cadence: prefill.cadence,
      start_at: prefill.start_at,
    }),
    [],
  );
}

// Therapy → weekly at 10:00
{
  const prefill = interventionToReminderPrefill({
    id: "int-2",
    category: "therapy",
    title: "CBT session",
  });
  assert.equal(prefill.cadence, "weekly");
  assert.equal(new Date(prefill.start_at).getHours(), 10);
}

// Category casing is normalised, unknown categories fall back to daily.
{
  const prefill = interventionToReminderPrefill({
    id: "int-3",
    category: "MYSTERY",
    title: "Something",
  });
  assert.equal(prefill.cadence, "daily");
  assert.equal(prefill.title, "Something"); // no prefix for the default preset
}

// eslint-disable-next-line no-console
console.log("reminders.test.ts OK");
