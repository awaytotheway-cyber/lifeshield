# Phase 5 Wave A — Guided test booking

What this adds: after the app recommends tests, the user can book them without
leaving it. Choose a lab near their postcode or a home kit, pick a time, read
how to prepare, confirm, and manage or cancel it later.

## 1. Run the SQL (once)

Supabase Dashboard → **SQL Editor** → New query → paste the whole of
`supabase/phase5-booking.sql` → Run.

**If you get a syntax error mentioning `RETURN`,** your paste dropped part of
the file — some browsers/editors silently truncate a large clipboard paste,
which jams two unrelated lines together (for example, a table column
definition right next to a `RETURN` line from a function near the end). The
file itself is verified clean (see below), so this is always a paste issue,
never a real syntax problem in the file.

**Fix:** run it in 7 smaller pieces instead, one at a time, in order, each in
its own query:

```
supabase/phase5-booking-parts/part1.sql   -- clinics + products columns
supabase/phase5-booking-parts/part2.sql   -- lab_slots table
supabase/phase5-booking-parts/part3.sql   -- bookings table + RLS
supabase/phase5-booking-parts/part4.sql   -- book_lab_slot() function
supabase/phase5-booking-parts/part5.sql   -- cancel_booking() function
supabase/phase5-booking-parts/part6.sql   -- clinics_with_next_slot() function
supabase/phase5-booking-parts/part7.sql   -- updated_at trigger
```

Paste one part, click Run, wait for it to say Success, then move to the next.
Never paste two parts in the same query box. This is exactly the same SQL as
the combined file, just in clipboard-sized pieces — verified to produce an
identical result running against a real Postgres 16 database.

It is safe to run more than once (whole file or parts). It adds:

| Thing | What it is |
| --- | --- |
| `lab_slots` | The appointment times a clinic has free |
| `bookings` | A patient's appointment, or their home kit request |
| `book_lab_slot()` | Takes a slot atomically so two people cannot get the same one |
| `cancel_booking()` | Cancels and frees the slot back up |
| `clinics_with_next_slot()` | The "labs near me" list, each with its next free time |
| New `clinics` columns | `postcode`, `postcode_area`, `latitude`, `longitude` |
| New `products` columns | `prep_instructions`, `fasting_required`, `fasting_hours`, `cycle_day_window`, `home_kit_available` |

Until you run it, the booking screens say so plainly rather than failing
silently.

## 2. Add a clinic and some slots

In the admin panel (or the Supabase Table Editor):

1. **clinics** — add a row. Fill in `postcode` *and* `postcode_area` (the
   outward code, e.g. `SW1A`). The area is what we match on.
2. **lab_slots** — add rows with `clinic_id`, `starts_at` (UTC), `capacity`
   (usually 1) and `price_cents`.

A slot is offered when it is active, more than an hour away, and not full.

## 3. Fill in the preparation rules

On each **products** row where `product_type = 'test'`:

- `fasting_required` / `fasting_hours` — when a sample needs an empty stomach.
  If several booked tests need fasting, the app applies the **longest** one.
- `cycle_day_window` — free text like `between day 19 and day 23`. Shown as a
  hard rule the patient must tick off.
- `prep_instructions` — anything else, in plain language.
- `home_kit_available` — the home kit option only appears when **every** test
  being booked supports it.

These are safety-critical: they appear before the booking is taken, again on
the confirmation, and again in the day-before reminder.

## 4. Turning it off

Set `EXPO_PUBLIC_FEATURE_BOOKING=off` in `.env` (or as an EAS secret) and
rebuild. The entry points disappear; nothing else changes.

## 5. Tests

```bash
npm run test:booking
```

Covers the parts that would hurt someone if they were wrong: the longest fast
winning, a cycle-day window being treated as a hard rule, home kit needing
every test to support it, past and full slots never being offered, and the
day-before reminder being dropped rather than fired late.

## What is deliberately not here yet

- **Payment.** Booking a slot does not charge. The Phase 3 Stripe flow still
  handles paying for the test itself; wiring the two together is the next step.
- **Live provider APIs.** `lab_slots` is filled by hand or by a sync job. The
  adapter interface in `.cursorrules-phase5` §4.4 is where a real provider
  plugs in — the app must never call a provider API directly.
- **The reminders actually sending.** `planBookingReminders()` works out when
  they should fire; scheduling them through the existing push pipeline is not
  wired up yet.
