# stripe-webhook — what this is (plain English)

This folder is an **Edge Function**. Stripe’s servers call it when a payment succeeds or fails.

It is **not SQL**.

| What | Where it goes |
|------|----------------|
| Tables (`orders`, `order_items`, …) | Supabase → **SQL Editor** → `supabase/phase3-schema.sql` |
| This file (`index.ts`) | Supabase → **Edge Functions** (or CLI deploy) |

## Why this exists

On Day 5 the app shows **“Order placed”** right after Stripe’s Payment Sheet succeeds. That is optimistic — good for UX.

This webhook is the **source of truth**: when Stripe confirms `payment_intent.succeeded`, we find the matching row in `orders` by `payment_ref` (the Stripe payment intent id, e.g. `pi_…`) and set:

- `payment_status` → `paid`
- `fulfilment_status` → `processing` (unless already further along)

If you have not deployed this yet, orders still look paid from Day 5. Once the webhook is live, it reconciles the database with Stripe.

## Secrets (server only — never in the app)

Set these in Supabase (Dashboard → **Edge Functions** → **Secrets**, or CLI):

```bash
npx supabase secrets set STRIPE_SECRET_KEY=sk_test_your_stripe_secret_here
npx supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_your_signing_secret_here
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

- **STRIPE_SECRET_KEY** — Stripe Dashboard → **Developers** → **API keys** → Secret key (`sk_test_…`).
- **STRIPE_WEBHOOK_SECRET** — see “Get the webhook signing secret” below.
- **SUPABASE_SERVICE_ROLE_KEY** — Supabase → **Settings** → **API** → `service_role` (secret). **Never** put this in the mobile app.

## Get the webhook signing secret (Stripe Dashboard)

1. Open [Stripe Dashboard](https://dashboard.stripe.com/test/webhooks) → **Developers** → **Webhooks**.
2. Click **Add endpoint** (or open an existing endpoint).
3. **Endpoint URL** (replace `YOUR_PROJECT_REF` with your Supabase project ref):

   ```
   https://YOUR_PROJECT_REF.supabase.co/functions/v1/stripe-webhook
   ```

   Example: `https://abcdefghijklmnop.supabase.co/functions/v1/stripe-webhook`

4. Under **Select events to listen to**, choose at least:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Save the endpoint.
6. Open the endpoint → **Signing secret** → **Reveal** → copy `whsec_…`.
7. Paste it into Supabase secrets as **STRIPE_WEBHOOK_SECRET**.

## Deploy

**Important:** Stripe does not send a Supabase login token. Deploy with JWT verification **off** for this function only:

### Option A — Dashboard

This function needs **two files** in one folder:

- `index.ts`
- `create-lab-orders.ts`

1. supabase.com → your project → **Edge Functions**.
2. Create a function named exactly **`stripe-webhook`**.
3. Add both files from this folder (or use Option B).
4. Add the three secrets above.
5. In function settings, turn **off** “Verify JWT” if that toggle exists (Stripe must reach this URL without a user session).

### Option B — CLI

```bash
npx supabase secrets set STRIPE_SECRET_KEY=sk_test_...
npx supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...
npx supabase functions deploy stripe-webhook --no-verify-jwt
```

This repo’s `supabase/config.toml` sets `verify_jwt = false` for `stripe-webhook` when you deploy via CLI.

## How to test (when secrets are ready)

### Stripe CLI (recommended on your PC)

1. Install [Stripe CLI](https://stripe.com/docs/stripe-cli).
2. Log in: `stripe login`
3. Forward events to your deployed function:

   ```bash
   stripe listen --forward-to https://YOUR_PROJECT_REF.supabase.co/functions/v1/stripe-webhook
   ```

   The CLI prints a temporary `whsec_…` — use that as **STRIPE_WEBHOOK_SECRET** for local testing, or add a separate test endpoint in the Dashboard.

4. Trigger a test success:

   ```bash
   stripe trigger payment_intent.succeeded
   ```

5. In Supabase → **Table Editor** → `orders`, check that the row with matching `payment_ref` shows `payment_status = paid`.

### Stripe Dashboard

1. Webhooks → your endpoint → **Send test webhook**.
2. Choose `payment_intent.succeeded`.
3. Check Supabase `orders` table and Edge Function logs.

## Matching orders

Day 5 saves `orders.payment_ref` = Stripe payment intent id (`pi_…`) when checkout succeeds. This webhook looks up that same id. If `payment_ref` is empty, the webhook logs “no order matched” but still returns 200 so Stripe does not retry endlessly.

Re-run `supabase/phase3-schema.sql` if you need the index on `payment_ref` for faster lookups.

## What this agent cannot do for you

Creating the Stripe webhook endpoint and copying `whsec_…` needs **your** Stripe and Supabase logins. The code here is ready to deploy once you paste the secrets.
