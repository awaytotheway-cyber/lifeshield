/**
 * Phase 5 Wave A — guided test booking: pure logic and types.
 *
 * Nothing in this file touches the network or React, so lib/booking.test.ts can
 * run it under `tsx` the same way the other rules tests do. The Supabase reads
 * and writes live in lib/booking-data.ts.
 *
 * The flow this supports: recommended tests → where are you → clinic visit or
 * home kit → pick a lab → pick a time → read the preparation steps → confirm.
 *
 * Safety note: the preparation steps (fasting, medication timing, cycle day)
 * are the part of this file that matters most. A patient who eats breakfast
 * before a fasting insulin test has wasted a trip and a sample. They are shown
 * before payment, again on confirmation, and again the day before.
 */
import { COPY } from "@/lib/copy";

// ===========================================================================
// Types
// ===========================================================================

/** How the sample gets taken. Home kit is an equal option, not a fallback. */
export type BookingKind = "clinic" | "home_kit";

/** Mirrors public.bookings.status */
export type BookingStatus =
  | "pending"
  | "confirmed"
  | "sample_taken"
  | "cancelled"
  | "no_show"
  | "expired";

export type LabSlot = {
  id: string;
  clinic_id: string;
  starts_at: string;
  duration_minutes: number;
  capacity: number;
  booked_count: number;
  price_cents: number | null;
  currency: string;
};

export type ClinicOption = {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  postcode: string | null;
  postcode_area: string | null;
  offers_home_collection: boolean;
  operating_hours: string | null;
  next_slot_at: string | null;
  open_slot_count: number;
  from_price_cents: number | null;
};

export type BookingRow = {
  id: string;
  user_id: string;
  lab_order_id: string | null;
  test_order_id: string | null;
  slot_id: string | null;
  clinic_id: string | null;
  kind: BookingKind;
  status: BookingStatus;
  scheduled_for: string | null;
  address_line: string | null;
  postcode: string | null;
  prep_ack_at: string | null;
  created_at: string;
};

/** One line of "do this before your test", built from the product catalog. */
export type PrepStep = {
  id: string;
  /** Plain-language instruction the patient reads. */
  text: string;
  /** Hard rules block booking confirmation until acknowledged. */
  severity: "critical" | "standard";
};

/** What a test product tells us about how to prepare for it. */
export type TestPrepSource = {
  id: string;
  name: string;
  prep_instructions?: string | null;
  fasting_required?: boolean | null;
  fasting_hours?: number | null;
  cycle_day_window?: string | null;
  home_kit_available?: boolean | null;
};

// ===========================================================================
// Pure logic — tested in lib/booking.test.ts
// ===========================================================================

/** How far ahead a slot must be before we let someone book it. */
export const MIN_BOOKING_LEAD_MINUTES = 60;

/** How close to the appointment a patient can still cancel themselves. */
export const SELF_CANCEL_CUTOFF_MINUTES = 120;

/**
 * Tidy a typed postcode: uppercase, single internal space, no stray symbols.
 * We ask for a postcode by text first — GPS is optional and always explained
 * before the OS prompt, so a denied location permission never blocks booking.
 */
export function normalisePostcode(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * The coarse area of a postcode — "SW1A 1AA" → "SW1A", "M1 1AE" → "M1".
 * Used to match clinics without needing coordinates for every one of them.
 */
export function postcodeArea(raw: string): string {
  const normalised = normalisePostcode(raw);
  if (!normalised) {
    return "";
  }
  const spaceAt = normalised.indexOf(" ");
  if (spaceAt > 0) {
    return normalised.slice(0, spaceAt);
  }
  // No space typed ("SW1A1AA") — the inward code is always the last three
  // characters, so everything before that is the outward code we match on.
  if (normalised.length > 3) {
    return normalised.slice(0, normalised.length - 3);
  }
  return normalised;
}

/**
 * Loose on purpose. We accept anything that could plausibly be a postcode so
 * we never block a real person over formatting; the clinic list simply widens
 * if we cannot match an area.
 */
export function isUsablePostcode(raw: string): boolean {
  const normalised = normalisePostcode(raw);
  return normalised.length >= 3 && /[0-9]/.test(normalised) && /[A-Z]/.test(normalised);
}

/** A slot is offerable when it is active, in the future, and not full. */
export function isSlotBookable(slot: LabSlot, now: Date): boolean {
  const startsAt = Date.parse(slot.starts_at);
  if (Number.isNaN(startsAt)) {
    return false;
  }
  if (slot.booked_count >= slot.capacity) {
    return false;
  }
  return startsAt - now.getTime() >= MIN_BOOKING_LEAD_MINUTES * 60_000;
}

export type SlotDay = {
  /** YYYY-MM-DD, used as a stable list key. */
  dayKey: string;
  slots: LabSlot[];
};

/**
 * Group bookable slots into days, earliest first, dropping days with nothing
 * left. The slots screen renders one section per day.
 */
export function groupSlotsByDay(slots: LabSlot[], now: Date): SlotDay[] {
  const byDay = new Map<string, LabSlot[]>();
  for (const slot of slots) {
    if (!isSlotBookable(slot, now)) {
      continue;
    }
    const dayKey = slot.starts_at.slice(0, 10);
    const bucket = byDay.get(dayKey);
    if (bucket) {
      bucket.push(slot);
    } else {
      byDay.set(dayKey, [slot]);
    }
  }
  return [...byDay.entries()]
    .map(([dayKey, daySlots]) => ({
      dayKey,
      slots: daySlots
        .slice()
        .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at)),
    }))
    .sort((a, b) => a.dayKey.localeCompare(b.dayKey));
}

/**
 * Build the preparation checklist for the tests being booked.
 *
 * Rules:
 *  - The longest fasting window wins — if one test needs 12 hours and another
 *    needs 8, the patient fasts 12. Never average, never take the first.
 *  - Cycle-day windows and free-text instructions are listed per test so the
 *    patient knows which test each line belongs to.
 *  - Identical instructions across tests appear once.
 */
export function buildPrepSteps(tests: TestPrepSource[]): PrepStep[] {
  const steps: PrepStep[] = [];

  const fastingHours = tests
    .filter((test) => test.fasting_required)
    .map((test) => test.fasting_hours ?? 8);
  if (fastingHours.length > 0) {
    const longest = Math.max(...fastingHours);
    steps.push({
      id: "fasting",
      text: `Do not eat for ${longest} hours before your appointment. Water is fine, and keep taking any medication as usual unless your clinician has told you otherwise.`,
      severity: "critical",
    });
  }

  for (const test of tests) {
    const window = test.cycle_day_window?.trim();
    if (window) {
      steps.push({
        id: `cycle-${test.id}`,
        text: `${test.name} needs to be taken ${window} of your cycle. If that does not line up with the time you pick, choose another date.`,
        severity: "critical",
      });
    }
  }

  const seen = new Set<string>();
  for (const test of tests) {
    const instruction = test.prep_instructions?.trim();
    if (!instruction) {
      continue;
    }
    const key = instruction.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    steps.push({
      id: `prep-${test.id}`,
      text: instruction,
      severity: "standard",
    });
  }

  if (steps.length === 0) {
    steps.push({
      id: "none",
      text: "Nothing to prepare for this one — just turn up. Bring a photo ID if you have one.",
      severity: "standard",
    });
  }

  return steps;
}

/** True when any step is a hard rule the patient must tick off explicitly. */
export function hasCriticalPrep(steps: PrepStep[]): boolean {
  return steps.some((step) => step.severity === "critical");
}

/** Home kit is only offered when every test in the basket supports it. */
export function homeKitAvailableForAll(tests: TestPrepSource[]): boolean {
  if (tests.length === 0) {
    return false;
  }
  return tests.every((test) => test.home_kit_available === true);
}

export type ReminderPlan = {
  id: string;
  /** ISO timestamp to fire at. */
  fireAt: string;
  body: string;
};

/**
 * Reminders for an upcoming appointment: the day before (so there is time to
 * act on fasting) and two hours before (so nobody simply forgets).
 *
 * Anything already in the past is dropped rather than fired immediately — a
 * notification about an appointment that has started is noise.
 */
export function planBookingReminders(
  scheduledFor: string,
  steps: PrepStep[],
  now: Date,
): ReminderPlan[] {
  const startsAt = Date.parse(scheduledFor);
  if (Number.isNaN(startsAt)) {
    return [];
  }
  const critical = steps.find((step) => step.severity === "critical");
  const plans: ReminderPlan[] = [
    {
      id: "t-24h",
      fireAt: new Date(startsAt - 24 * 60 * 60_000).toISOString(),
      body: critical
        ? `Your test is tomorrow. One thing to get right: ${critical.text}`
        : "Your test is tomorrow. Nothing to prepare — we will see you there.",
    },
    {
      id: "t-2h",
      fireAt: new Date(startsAt - 2 * 60 * 60_000).toISOString(),
      body: "Your test is in about two hours.",
    },
  ];
  return plans.filter((plan) => Date.parse(plan.fireAt) > now.getTime());
}

/** Patients cancel their own appointments — no phone call, no email chain. */
export function canSelfCancel(booking: BookingRow, now: Date): boolean {
  if (booking.status === "cancelled" || booking.status === "sample_taken") {
    return false;
  }
  if (!booking.scheduled_for) {
    return true;
  }
  const startsAt = Date.parse(booking.scheduled_for);
  if (Number.isNaN(startsAt)) {
    return true;
  }
  return startsAt - now.getTime() > SELF_CANCEL_CUTOFF_MINUTES * 60_000;
}

/** Split a booking list into what is coming up and what has been and gone. */
export function splitBookings(
  bookings: BookingRow[],
  now: Date,
): { upcoming: BookingRow[]; past: BookingRow[] } {
  const upcoming: BookingRow[] = [];
  const past: BookingRow[] = [];
  for (const booking of bookings) {
    const startsAt = booking.scheduled_for
      ? Date.parse(booking.scheduled_for)
      : Number.NaN;
    const isOver =
      booking.status === "cancelled" ||
      booking.status === "sample_taken" ||
      booking.status === "no_show" ||
      booking.status === "expired" ||
      (!Number.isNaN(startsAt) && startsAt < now.getTime());
    if (isOver) {
      past.push(booking);
    } else {
      upcoming.push(booking);
    }
  }
  upcoming.sort(
    (a, b) =>
      Date.parse(a.scheduled_for ?? "") - Date.parse(b.scheduled_for ?? ""),
  );
  past.sort(
    (a, b) =>
      Date.parse(b.scheduled_for ?? b.created_at) -
      Date.parse(a.scheduled_for ?? a.created_at),
  );
  return { upcoming, past };
}

/** Calm, plain wording for a booking state. Never a raw database value. */
export function formatBookingStatus(status: string): string {
  switch (status) {
    case "pending":
      return "Not confirmed yet";
    case "confirmed":
      return "Booked";
    case "sample_taken":
      return "Sample taken";
    case "cancelled":
      return "Cancelled";
    case "no_show":
      return "Missed";
    case "expired":
      return "Expired";
    default:
      return status;
  }
}

/** Price shown on every card — we never hide it until checkout. */
export function formatPrice(cents: number | null, currency = "GBP"): string {
  if (cents === null || Number.isNaN(cents)) {
    return "Price confirmed at the clinic";
  }
  if (cents === 0) {
    return "Included";
  }
  const symbol = currency === "GBP" ? "£" : currency === "USD" ? "$" : "";
  const amount = (cents / 100).toFixed(2).replace(/\.00$/, "");
  return symbol ? `${symbol}${amount}` : `${amount} ${currency}`;
}

/** "Wed 24 Sep" — short, unambiguous, no year for near dates. */
export function formatSlotDay(dayKey: string): string {
  const date = new Date(`${dayKey}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    return dayKey;
  }
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

/** "09:15" in the user's own timezone. */
export function formatSlotTime(startsAt: string): string {
  const date = new Date(startsAt);
  if (Number.isNaN(date.getTime())) {
    return startsAt;
  }
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Reasons book_lab_slot() can say no, turned into something a person can act
 * on. "Slot taken" is the common one and must never sound like the user's
 * fault — they were deciding, which is exactly what we asked them to do.
 */
export function bookingFailureMessage(reason: string): string {
  switch (reason) {
    case "slot_taken":
      return COPY.bookingSlotTaken;
    case "slot_past":
      return COPY.bookingSlotPast;
    case "slot_missing":
      return COPY.bookingSlotGone;
    case "not_signed_in":
      return COPY.bookingNotSignedIn;
    default:
      return COPY.bookingFailed;
  }
}
