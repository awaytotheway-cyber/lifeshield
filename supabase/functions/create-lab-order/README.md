# create-lab-order — what this is (plain English)

This folder is an **Edge Function** — a small program on Supabase’s servers. It is **not SQL**.

After a patient pays for a **test** in the store, this function creates rows in `lab_orders` with status `pending_manual` (internal fulfilment until a live lab API is signed).

## What it does

1. Checks the caller is signed in (JWT).
2. Confirms the `store_order_id` belongs to them (or they are admin).
3. For each test line on that order, inserts one `lab_orders` row (idempotent — safe to call twice).
4. Links to `test_orders` when the product name matches a recommended test.

## SQL fallback (no Edge Function needed for testing)

The mobile app also calls `create_lab_orders_for_store_order()` in the database if this function is not deployed yet.

Run **`supabase/phase4-day5-lab-orders.sql`** in Supabase → **SQL Editor** first.

## Deploy

### Option A — Dashboard

Add **both** files from this folder:

- `index.ts`
- `create-lab-orders.ts`

Pasting only `index.ts` fails with “Module not found … create-lab-orders.ts”.

### Option B — CLI (recommended)

From project root:

```powershell
cd C:\Users\91878\LifeMate
npx supabase functions deploy create-lab-order
```

Secrets (Project Settings → Edge Functions): `SUPABASE_SERVICE_ROLE_KEY` is set automatically when you link the CLI. No lab API key is needed for the manual provider.

## Test manually

1. Run the Day 5 SQL file.
2. Deploy this function (or rely on the SQL fallback).
3. In the app: buy a **test** product → complete checkout.
4. In Supabase → **Table Editor** → `lab_orders`: you should see `pending_manual`.
5. In the admin panel → **Lab orders**: open the row and move status (e.g. kit dispatched).

## Switching to a real lab later

Change `getActiveLabProvider()` in `lib/lab-provider.ts` and extend this Edge Function to call the lab API server-side. The phone never sees API keys.
