# send-push — what this is (plain English)

This folder is an **Edge Function** — a small program that runs on Supabase’s servers.

It is **not SQL**.

## What it does

When something important happens on the server, this function sends a **remote push notification** to the patient’s phone:

| Event | When it fires | What the patient sees |
|-------|---------------|------------------------|
| `results_ready` | A clinician saves a reviewed lab result | “Your lab results are ready” |
| `plan_approved` | A clinician finalises the patient’s plan | “Your plan is ready” |

It reads device tokens from the `push_tokens` table (saved in Day 6) and talks to Expo’s push service. **No secrets go in the mobile app or admin browser.**

## Who can call it

1. **Other Edge Functions** (recommended) — `save-reviewed-result` and `sign-off-intervention` call the shared send logic directly after a successful save. You do not need to call `send-push` yourself for normal use.
2. **This HTTP endpoint** — for manual tests or future admin tools:
   - A valid **staff JWT** (owner, admin, or clinician with `can_sign_off`), **or**
   - The **service-role key** in the `Authorization: Bearer …` header (server-to-server only).

## Before you test push

1. Patient must use an **EAS development or production build** — Expo Go cannot receive remote push.
2. Patient must allow notification permission and have a row in **Table Editor → `push_tokens`**.
3. Deploy this function **and** the updated `save-reviewed-result` / `sign-off-intervention` functions (they trigger push automatically).

## Deploy

### Secrets (Dashboard → Edge Functions → send-push → Secrets)

Hosted Supabase usually sets `SUPABASE_URL` and `SUPABASE_ANON_KEY` automatically.

| Secret | Required? | Notes |
|--------|-----------|-------|
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes** | Settings → API → service_role — **never** in app or admin `.env` |

No Expo API key is needed for the standard Expo Push API.

### Option A — Dashboard (no terminal)

`index.ts` is **self-contained** — paste **only** that one file.

1. supabase.com → your project → **Edge Functions**.
2. Create or open a function named exactly `send-push`.
3. Copy the full contents of **`index.ts`** from this folder into the editor.
4. Add secret `SUPABASE_SERVICE_ROLE_KEY` if missing.
5. Deploy / Save.

The sibling files `push-events.ts` and `send-push-core.ts` are reference copies only — the Dashboard does not bundle them.

### Option B — CLI (recommended)

From the **project root** (not inside `send-push/`):

```powershell
cd C:\Users\91878\LifeMate
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
npx supabase functions deploy send-push
npx supabase functions deploy save-reviewed-result
npx supabase functions deploy sign-off-intervention
```

Redeploy the last two after this fix so they pick up their local `send-push-core.ts` copies (push fires automatically on save / finalise).

## Manual test (optional)

From a terminal (replace URL, service key, and patient user id):

```powershell
curl -X POST "https://YOUR_PROJECT.supabase.co/functions/v1/send-push" `
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" `
  -H "Content-Type: application/json" `
  -d "{\"event\":\"results_ready\",\"user_id\":\"PATIENT_UUID\"}"
```

Expected JSON includes `tokens_found`, `sent`, and `errors` (empty if all went well).

## If push does not arrive

- Check `push_tokens` has a row for that patient.
- Confirm they are on an **EAS build**, not Expo Go.
- Check Edge Function logs in Supabase for Expo errors (invalid token, etc.).
- The main save / sign-off still succeeds — push failure never blocks clinical work.

## SQL fallback note

If the admin panel falls back to Postgres RPC (`sign_off_intervention`) because Edge Functions are not deployed, **push will not fire**. Deploy the Edge Functions for the full Phase 4 loop including notifications.
