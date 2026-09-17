import assert from "node:assert/strict";

import {
  buildPrepSteps,
  canSelfCancel,
  formatBookingStatus,
  formatPrice,
  groupSlotsByDay,
  hasCriticalPrep,
  homeKitAvailableForAll,
  isSlotBookable,
  isUsablePostcode,
  normalisePostcode,
  planBookingReminders,
  postcodeArea,
  splitBookings,
  type BookingRow,
  type LabSlot,
} from "./booking";

const NOW = new Date("2026-09-17T09:00:00.000Z");

function slot(overrides: Partial<LabSlot> & { id: string; starts_at: string }): LabSlot {
  return {
    clinic_id: "clinic-1",
    duration_minutes: 15,
    capacity: 1,
    booked_count: 0,
    price_cents: 4500,
    currency: "GBP",
    ...overrides,
  };
}

function booking(overrides: Partial<BookingRow> & { id: string }): BookingRow {
  return {
    user_id: "user-1",
    lab_order_id: null,
    test_order_id: null,
    slot_id: "slot-1",
    clinic_id: "clinic-1",
    kind: "clinic",
    status: "confirmed",
    scheduled_for: "2026-09-20T09:00:00.000Z",
    address_line: null,
    postcode: null,
    prep_ack_at: "2026-09-17T09:00:00.000Z",
    created_at: "2026-09-17T09:00:00.000Z",
    ...overrides,
  };
}

function testPostcodeNormalising() {
  assert.equal(normalisePostcode(" sw1a  1aa "), "SW1A 1AA");
  assert.equal(normalisePostcode("m1-1ae"), "M11AE");
  assert.equal(postcodeArea("SW1A 1AA"), "SW1A");
  assert.equal(postcodeArea("M1 1AE"), "M1");
  // No space typed — the outward code is everything but the last three.
  assert.equal(postcodeArea("SW1A1AA"), "SW1A");
  assert.equal(postcodeArea(""), "");
}

function testPostcodeAcceptance() {
  assert.equal(isUsablePostcode("SW1A 1AA"), true);
  assert.equal(isUsablePostcode("M1"), false, "too short to match anything");
  assert.equal(isUsablePostcode("LONDON"), false, "no digits");
  assert.equal(isUsablePostcode("12345"), false, "no letters");
}

function testSlotBookability() {
  // Inside the one-hour lead time — not offerable.
  assert.equal(
    isSlotBookable(slot({ id: "s", starts_at: "2026-09-17T09:30:00.000Z" }), NOW),
    false,
  );
  assert.equal(
    isSlotBookable(slot({ id: "s", starts_at: "2026-09-17T11:00:00.000Z" }), NOW),
    true,
  );
  // Full.
  assert.equal(
    isSlotBookable(
      slot({
        id: "s",
        starts_at: "2026-09-18T11:00:00.000Z",
        capacity: 2,
        booked_count: 2,
      }),
      NOW,
    ),
    false,
  );
  // Already gone.
  assert.equal(
    isSlotBookable(slot({ id: "s", starts_at: "2026-09-16T11:00:00.000Z" }), NOW),
    false,
  );
}

function testGroupSlotsByDay() {
  const days = groupSlotsByDay(
    [
      slot({ id: "c", starts_at: "2026-09-19T14:00:00.000Z" }),
      slot({ id: "a", starts_at: "2026-09-18T09:00:00.000Z" }),
      slot({ id: "b", starts_at: "2026-09-18T08:00:00.000Z" }),
      slot({ id: "past", starts_at: "2026-09-01T08:00:00.000Z" }),
      slot({
        id: "full",
        starts_at: "2026-09-18T10:00:00.000Z",
        capacity: 1,
        booked_count: 1,
      }),
    ],
    NOW,
  );
  assert.equal(days.length, 2, "past and full days/slots are dropped");
  assert.equal(days[0].dayKey, "2026-09-18");
  assert.deepEqual(
    days[0].slots.map((s) => s.id),
    ["b", "a"],
    "slots sort by time within a day",
  );
  assert.equal(days[1].dayKey, "2026-09-19");
}

function testPrepStepsTakeTheLongestFast() {
  const steps = buildPrepSteps([
    { id: "t1", name: "Fasting insulin", fasting_required: true, fasting_hours: 8 },
    { id: "t2", name: "Lipid panel", fasting_required: true, fasting_hours: 12 },
  ]);
  const fasting = steps.find((step) => step.id === "fasting");
  assert.ok(fasting, "a fasting step is produced");
  assert.match(
    fasting.text,
    /12 hours/,
    "the longest fast wins — never the first or the average",
  );
  assert.equal(fasting.severity, "critical");
  assert.equal(hasCriticalPrep(steps), true);
}

function testPrepStepsDefaultFastingHours() {
  const steps = buildPrepSteps([
    { id: "t1", name: "Glucose", fasting_required: true, fasting_hours: null },
  ]);
  assert.match(steps[0].text, /8 hours/, "missing hours falls back to 8, not 0");
}

function testPrepStepsCycleAndDedupe() {
  const steps = buildPrepSteps([
    {
      id: "t1",
      name: "Progesterone",
      cycle_day_window: "between day 19 and day 23",
      prep_instructions: "Bring your last result if you have it.",
    },
    {
      id: "t2",
      name: "Oestradiol",
      prep_instructions: "Bring your last result if you have it.",
    },
  ]);
  const cycle = steps.find((step) => step.id === "cycle-t1");
  assert.ok(cycle);
  assert.equal(cycle.severity, "critical", "a cycle window is a hard rule");
  const instructions = steps.filter((step) => step.id.startsWith("prep-"));
  assert.equal(instructions.length, 1, "identical instructions appear once");
}

function testPrepStepsNeverEmpty() {
  const steps = buildPrepSteps([{ id: "t1", name: "Vitamin D" }]);
  assert.equal(steps.length, 1);
  assert.equal(hasCriticalPrep(steps), false);
}

function testHomeKitNeedsEveryTest() {
  assert.equal(
    homeKitAvailableForAll([
      { id: "a", name: "A", home_kit_available: true },
      { id: "b", name: "B", home_kit_available: true },
    ]),
    true,
  );
  assert.equal(
    homeKitAvailableForAll([
      { id: "a", name: "A", home_kit_available: true },
      { id: "b", name: "B", home_kit_available: false },
    ]),
    false,
    "one clinic-only test means the whole basket is clinic-only",
  );
  assert.equal(homeKitAvailableForAll([]), false);
}

function testReminderPlan() {
  const steps = buildPrepSteps([
    { id: "t1", name: "Fasting insulin", fasting_required: true, fasting_hours: 10 },
  ]);
  const plans = planBookingReminders("2026-09-20T09:00:00.000Z", steps, NOW);
  assert.equal(plans.length, 2);
  assert.equal(plans[0].fireAt, "2026-09-19T09:00:00.000Z");
  assert.match(plans[0].body, /10 hours/, "the day-before reminder repeats the fast");
  assert.equal(plans[1].fireAt, "2026-09-20T07:00:00.000Z");

  // An appointment three hours away: the T-24h reminder is in the past and is
  // dropped rather than fired late.
  const soon = planBookingReminders("2026-09-17T12:00:00.000Z", steps, NOW);
  assert.equal(soon.length, 1);
  assert.equal(soon[0].id, "t-2h");

  assert.deepEqual(planBookingReminders("not-a-date", steps, NOW), []);
}

function testSelfCancelWindow() {
  assert.equal(canSelfCancel(booking({ id: "b1" }), NOW), true);
  assert.equal(
    canSelfCancel(
      booking({ id: "b2", scheduled_for: "2026-09-17T10:00:00.000Z" }),
      NOW,
    ),
    false,
    "inside the two-hour cutoff",
  );
  assert.equal(
    canSelfCancel(booking({ id: "b3", status: "sample_taken" }), NOW),
    false,
  );
  assert.equal(
    canSelfCancel(booking({ id: "b4", status: "cancelled" }), NOW),
    false,
  );
  assert.equal(
    canSelfCancel(booking({ id: "b5", kind: "home_kit", scheduled_for: null }), NOW),
    true,
    "a home kit with no date can always be cancelled",
  );
}

function testSplitBookings() {
  const { upcoming, past } = splitBookings(
    [
      booking({ id: "later", scheduled_for: "2026-09-25T09:00:00.000Z" }),
      booking({ id: "sooner", scheduled_for: "2026-09-19T09:00:00.000Z" }),
      booking({ id: "done", scheduled_for: "2026-09-10T09:00:00.000Z" }),
      booking({
        id: "cancelled-future",
        status: "cancelled",
        scheduled_for: "2026-09-30T09:00:00.000Z",
      }),
    ],
    NOW,
  );
  assert.deepEqual(
    upcoming.map((b) => b.id),
    ["sooner", "later"],
    "upcoming sorts soonest first",
  );
  assert.deepEqual(past.map((b) => b.id).sort(), ["cancelled-future", "done"]);
}

function testFormatting() {
  assert.equal(formatPrice(4500), "£45");
  assert.equal(formatPrice(4550), "£45.50");
  assert.equal(formatPrice(0), "Included");
  assert.equal(formatPrice(null), "Price confirmed at the clinic");
  assert.equal(formatBookingStatus("confirmed"), "Booked");
  assert.equal(formatBookingStatus("no_show"), "Missed");
  // Never leak a raw value we have not worded yet.
  assert.equal(formatBookingStatus("something_new"), "something_new");
}

testPostcodeNormalising();
testPostcodeAcceptance();
testSlotBookability();
testGroupSlotsByDay();
testPrepStepsTakeTheLongestFast();
testPrepStepsDefaultFastingHours();
testPrepStepsCycleAndDedupe();
testPrepStepsNeverEmpty();
testHomeKitNeedsEveryTest();
testReminderPlan();
testSelfCancelWindow();
testSplitBookings();
testFormatting();

console.log("booking.test.ts: all passed");
