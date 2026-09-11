# create-payment-intent — what this is (plain English)

This folder is an **Edge Function**. That is a small program that runs on Supabase’s servers when your app asks for a payment total.

It is **not SQL**.

| What | Where it goes |
|------|----------------|
| Tables (`products`, `cart_items`, `orders`, …) | Supabase website → **SQL Editor** → paste `supabase/phase3-schema.sql` |
| This file (`index.ts`) | Supabase → **Edge Functions** (or CLI deploy) |

Never paste `import` or `Deno.serve` into the SQL box.

## Why this exists

**Golden rule:** the phone must **never** decide how much to charge. A user could change prices in the app if we trusted amounts from the device.

So on Day 4 the flow is:

1. The app sends only **cart item ids** (rows in `cart_items`).
2. This function signs you in from your JWT, re-reads those rows and **real product prices** from the database.
3. It sums the total **on the server** and creates a Stripe **PaymentIntent**.
4. It returns `{ clientSecret, total, currency }` — **not** the Stripe secret key.

Day 5 will open Stripe’s Payment Sheet with `clientSecret`. Day 4 only tests that the **server total** is correct.

## Secrets (server only — never in the app)

Set these once in Supabase (Dashboard → **Edge Functions** → **Secrets**, or CLI):

```bash
npx supabase secrets set STRIPE_SECRET_KEY=sk_test_your_stripe_secret_here
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

- **STRIPE_SECRET_KEY** — from [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys) → Secret key (`sk_test_…`). Lives **only** here.
- **SUPABASE_SERVICE_ROLE_KEY** — from Supabase → **Settings** → **API** → `service_role` (secret). Used inside this function to read cart rows with joined prices. **Never** put this in the mobile app or in `EXPO_PUBLIC_…` variables.

Hosted Supabase projects usually already have `SUPABASE_URL` and `SUPABASE_ANON_KEY` for Edge Functions. You still need the two secrets above.

## App `.env` (publishable key only)

In your project root `.env` (and `.env.example` for sharing), use **only** the Stripe **publishable** key:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
```

**Never** put `sk_test_…` or the service-role key in the app.

## Deploy

### Option A — Dashboard (no terminal)

1. supabase.com → your project → **Edge Functions**.
2. Create a function named exactly **`create-payment-intent`**.
3. Paste the contents of `index.ts`.
4. Add secrets **STRIPE_SECRET_KEY** and **SUPABASE_SERVICE_ROLE_KEY** (see above).
5. Deploy / Save.

### Option B — Command line (if the CLI is linked to your project)

```bash
npx supabase secrets set STRIPE_SECRET_KEY=sk_test_...
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...
npx supabase functions deploy create-payment-intent
```

## How to test (Day 4)

1. Run `supabase/phase3-schema.sql` in the SQL Editor if you have not already.
2. Deploy this function and set both secrets.
3. Add `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_…` to `.env` (not required for the Day 4 total test, but good to have ready for Day 5).
4. In the app: **Store** → add an item → **Cart** → **Checkout**.
5. Tap **Test payment total**.
6. You should see something like: **Server total: ₹1,299 — payment sheet comes on Day 5**.

If the function is not deployed, the app shows a friendly message pointing here.

## What this agent cannot do for you

Deploying and setting secrets needs **your** Supabase and Stripe logins. The code in this repo is ready to paste or deploy; you run the dashboard steps once.
