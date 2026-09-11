# Phase 4 Day 5 — Lab orders after checkout (plain English)

When a patient pays for a **test** in the store, LifeShield creates a `lab_orders` row so your team can fulfil it manually until a live lab API is connected.

## What you run in Supabase

1. **SQL Editor** → paste **`supabase/phase4-day5-lab-orders.sql`** → **Run** (safe to run twice).
2. Optional: deploy Edge Function `create-lab-order` (see `supabase/functions/create-lab-order/README.md`). The app falls back to the SQL helper if the function is missing.

## How fulfilment works

| Step | Who | What happens |
|------|-----|----------------|
| Checkout | Patient | Pays for a test product |
| Auto | App or webhook | Creates `lab_orders` with status `pending_manual` |
| Admin | Clinic staff | Moves status (kit dispatched → sample received → processing → resulted) |
| Results | Clinician | Enters results (Phase 2 screen) → review queue |

## Test end-to-end

1. Run the SQL file above.
2. Sign in as a patient with a recommended test in the store.
3. Complete checkout (Stripe test mode or optimistic save).
4. Check **Table Editor** → `lab_orders` — status should be `pending_manual`.
5. Open admin → **Lab orders** → edit status to `kit_dispatched`.

## Switching to a real lab later

One line in `lib/lab-provider.ts` (`getActiveLabProvider`) plus server-side API calls in the Edge Function. No change to the patient app flow.
