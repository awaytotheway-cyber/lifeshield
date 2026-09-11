# sign-off-intervention — what this is (plain English)

This folder is an **Edge Function** — a small program that runs on Supabase’s servers.

It is **not SQL**.

- **SQL** (the fallback helper) goes in the Supabase website → **SQL Editor**. Use `supabase/phase4-day4-sign-off.sql`.
- **This file** (`index.ts`) goes in **Edge Functions**. Never paste `import` or `Deno.serve` into the SQL box.

## What it does

When a clinician uses the **Review Queue** in the admin panel (`http://localhost:5173`), each button — **Approve**, **Decline**, **Edit dosage note**, **Finalise plan** — calls this function (or the SQL fallback).

The function checks:

1. You are signed in (valid JWT).
2. You are allowed to sign off:
   - **owner** or **admin** in `staff_roles`, **or**
   - **clinician** with `can_sign_off = true` on your `doctors` row.
3. You may only touch patients in your review queue (unless you are owner/admin).

Writes use the **service-role key** on the server only. The admin browser never sees that key.

## Why approval unlocks the store

Phase 3 blocks store purchases while a plan row is still `draft`.

| Intervention status   | Patient can buy linked supplement? |
|-----------------------|----------------------------------|
| `draft`               | No — pending review              |
| `clinician_approved`  | Yes — practitioner has approved    |
| `active`              | Yes — plan finalised             |
| `declined`            | That row is not offered            |

**Finalise plan** flips every `clinician_approved` row to `active`. That is the “go live” step for the patient’s plan display.

## Before you test

1. Run `supabase/phase4-day4-sign-off.sql` in **SQL Editor** (creates the SQL fallback).
2. Give your admin user a `staff_roles` row (`owner` or `admin`), **or** link a `doctors` row with `can_sign_off = true`.
3. Have at least one patient with `interventions.status = 'draft'` (finish questionnaire + lab results + refresh plan on the phone).

## Deploy (optional but recommended)

The SQL fallback works without deploying. Deploy this function for the preferred path.

### Secrets (Dashboard → Edge Functions → sign-off-intervention → Secrets)

Hosted Supabase usually sets these automatically:

| Secret                     | Where it lives        |
|----------------------------|-----------------------|
| `SUPABASE_URL`             | Auto on hosted        |
| `SUPABASE_ANON_KEY`        | Auto on hosted        |
| `SUPABASE_SERVICE_ROLE_KEY`| **You add this** — Settings → API → service_role (never in admin `.env`) |

### Option A — Dashboard (no terminal)

This function needs **three files** in one folder (not just `index.ts`):

- `index.ts`
- `push-events.ts`
- `send-push-core.ts`

1. supabase.com → your project → **Edge Functions**.
2. Create a function named exactly `sign-off-intervention`.
3. Add all three files from this folder (or use the CLI in Option B).
4. Add secret `SUPABASE_SERVICE_ROLE_KEY` if not already present.
5. Deploy / Save.

### Option B — CLI (if already linked)

```powershell
cd C:\Users\91878\LifeMate
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
npx supabase functions deploy sign-off-intervention
```

## CORS

The function allows browser calls from `http://localhost:5173` (the Vite admin dev server). No extra CORS setup on Supabase is needed.

## If the function is not deployed

The admin panel automatically falls back to `sign_off_intervention()` in Postgres (same checks, no service-role key in the browser). You must run `phase4-day4-sign-off.sql` once for that fallback to exist.
