# save-reviewed-result — what this is (plain English)

This folder is an **Edge Function**. That is a small program that runs on Supabase’s servers.

It is **not SQL**.

- **SQL** (tables + the admin save helper) goes in the Supabase website → **SQL Editor**. Use `supabase/phase2-schema.sql`.
- **This file** (`index.ts`) goes in **Edge Functions**. Never paste `import` or `Deno.serve` into the SQL box.

## Why you saw “Failed to send a request to the Edge Function”

The phone asked Supabase for this function, but the request never reached a working copy. Typical reasons:

- the function is not deployed yet
- the name is not exactly `save-reviewed-result`
- Expo web on `localhost:8081` was blocked by CORS
- the Project URL in `.env` is wrong

The **app now falls back** to a Postgres function named `save_reviewed_result` (same idea, different place). That helper lives in `phase2-schema.sql`. You must re-run that SQL file once.

Deploying this Edge Function is **optional** after the SQL helper exists.

## How a save works (no master key on the phone)

1. You sign in as `awaytotheway@gmail.com`.
2. The app tries this Edge Function.
3. If that call never lands, the app calls `save_reviewed_result` in the database.
4. That SQL function checks you are logged in **and** that your email is on the admin list, then inserts one row with `clinician_reviewed = true`.
5. Regular users get a permission error. They cannot fake results.

The service-role key (the master key) is **never** put in the mobile app or in `EXPO_PUBLIC_...` in `.env`. The SQL helper uses your normal login token.

## Before you test a save

1. In Supabase → **SQL Editor**, paste and Run **the whole** `supabase/phase2-schema.sql` file.
2. Sign in to the app as `awaytotheway@gmail.com`.
3. Home → **Enter a lab result (admin)**.
4. Pick a test, type a value, leave the user id as yours, tap Save.
5. In Supabase → **Table Editor** → `test_results`, you should see a new row.

If both the Edge Function and the SQL helper are missing, the app now says so clearly (paste `phase2-schema.sql`).

## Optional: deploy this Edge Function

Only needed if you want the function path as well as the SQL helper.

### Option A — Dashboard (no terminal)

This function needs **three files** in one folder (not just `index.ts`):

- `index.ts`
- `push-events.ts`
- `send-push-core.ts`

1. Open supabase.com → your project → **Edge Functions**.
2. Create a function named exactly `save-reviewed-result`.
3. Add all three files from this folder (or use the CLI in Option B).
4. Deploy / Save.

Hosted functions usually already have `SUPABASE_URL` and `SUPABASE_ANON_KEY`. The optional service-role key is only used **inside this server function**, never in the app.

### Option B — Command line (only if already logged in and linked)

```
npx supabase functions deploy save-reviewed-result
```

If the CLI is not linked to your project, skip this. The SQL helper is enough.

Optional extra admin emails (comma-separated). If you skip this, only `awaytotheway@gmail.com` can save via the Edge Function (the SQL helper uses the same email):

```
npx supabase secrets set ADMIN_EMAILS=awaytotheway@gmail.com
```

## What this agent cannot do for you

Deploying the Edge Function needs **your** Supabase login. Re-running `phase2-schema.sql` in the SQL Editor is the step that unblocks Save.
