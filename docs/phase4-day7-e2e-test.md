# Phase 4 Day 7 — End-to-end test (plain English)

This is the **final Phase 4 checklist**. Work through it in order. Each step tells you what you should see.

**Time needed:** about 45–60 minutes the first time (includes one EAS build if you have not done Day 6 yet).

---

## Before you start (one-time setup)

### 1. Supabase SQL

If you already ran `supabase/phase4-schema.sql` on Day 1, you are done.

Otherwise run these in **SQL Editor** (safe to run twice):

- `supabase/phase4-schema.sql`
- `supabase/phase4-day4-sign-off.sql`
- `supabase/phase4-day6-push-tokens.sql`

### 2. Deploy Edge Functions (required for push)

In a terminal (replace with your service role key from Supabase → Settings → API):

```powershell
cd C:\Users\91878\LifeMate
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
npx supabase functions deploy send-push
npx supabase functions deploy save-reviewed-result
npx supabase functions deploy sign-off-intervention
```

You do **not** need an Expo secret — the standard Expo Push API is used.

### 3. EAS development build (required for remote push)

Expo Go **cannot** receive server push. You need a dev build on a **physical phone**:

```powershell
npm install -g eas-cli
eas login
eas build --profile development --platform android
```

Install the APK on your phone. Your EAS project id is in `app.json` → `extra.eas.projectId`.

### 4. Admin panel

```powershell
cd C:\Users\91878\LifeMate\admin
npm install
npm run dev
```

Open `http://localhost:5173` and sign in as a staff account (`owner` or `admin` in `staff_roles`).

### 5. Mobile app

```powershell
cd C:\Users\91878\LifeMate
npx expo start
```

For push tests, use the **EAS dev build** on your phone (not Expo Go).

---

## Full loop checklist

Use two accounts if you can: one **patient** and one **clinician/admin**. You can use one account for founder testing, but use a **second patient user id** when entering results.

| Step | Who | Action | Expected result |
|------|-----|--------|-----------------|
| 1 | Admin | Add a **clinic** and at least one **doctor** linked to your clinician login | Rows appear in Table Editor |
| 2 | Admin | Add or edit a **product** (supplement or test) with a price | Product visible in admin |
| 3 | Patient | Sign up / sign in on the **EAS build** | Home loads, no crash |
| 4 | Patient | Complete triage → consent → questionnaire → see **recommended tests** | Results screen shows suggestions |
| 5 | Patient | Open **Follow-up** → tap **Allow reminders on this phone** | Note about push registration; row in `push_tokens` in Supabase |
| 6 | Patient | Order a test from the **store** and pay (Stripe test mode) | Order succeeds; `lab_orders` row with `pending_manual` |
| 7 | Admin | Mark lab order fulfilled (or update status) if your workflow uses it | Status updates in admin |
| 8 | Clinician | **Enter a reviewed lab result** for the patient (admin app or mobile admin screen) | Row in `test_results` with `clinician_reviewed = true` |
| 9 | Patient | Check phone for push **“Your lab results are ready”** | Notification appears (may take a few seconds) |
| 10 | Patient | Tap the notification | App opens to **Lab results** screen |
| 11 | Patient | Open **Plan** → refresh if needed | Draft interventions from rules engine |
| 12 | Clinician | Admin → **Review Queue** → **Approve** each draft item | Status → `clinician_approved` |
| 13 | Clinician | **Finalise plan** for that patient | Status → `active` on approved rows |
| 14 | Patient | Push **“Your plan is ready”** | Notification appears |
| 15 | Patient | Tap notification → **Plan** screen | Active plan visible |
| 16 | Patient | Open **store** → try to buy a linked supplement | Purchase allowed (not blocked as “pending review”) |
| 17 | Patient | Tap a **symptom re-check** local reminder (or wait for scheduled one) → answer **Yes** | Routes to **Pathway B** — safety still works |

---

## Push-specific checks

### Results ready

1. Confirm patient has a row in **Table Editor → `push_tokens`** before step 8.
2. After saving a result, open **Edge Functions → save-reviewed-result → Logs**.
3. Response should include a `push` object: `tokens_found` ≥ 1, `sent` ≥ 1 if token valid.
4. If `tokens_found: 0`, patient has not registered — repeat step 5 on the EAS build.

### Plan approved

1. Only fires on **Finalise plan**, not on individual Approve clicks.
2. Check **sign-off-intervention** logs for `push` after finalise.
3. Patient tap should open the Plan tab.

### Manual test (optional)

```powershell
curl -X POST "https://YOUR_PROJECT.supabase.co/functions/v1/send-push" `
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" `
  -H "Content-Type: application/json" `
  -d "{\"event\":\"results_ready\",\"user_id\":\"PATIENT_UUID\"}"
```

---

## If something fails

| Problem | What to check |
|---------|----------------|
| No push at all | EAS build (not Expo Go), permission allowed, `push_tokens` row exists |
| Save works, no push | Edge Functions deployed? Using SQL RPC fallback only? Deploy functions. |
| Push sent, app does not open right screen | Tap notification; `notification-routing` maps `results_ready` / `plan_approved` |
| Admin cannot sign off | `staff_roles` row; clinician needs `can_sign_off` on `doctors` |
| Store still blocked | Plan not finalised — all drafts approved, then **Finalise plan** |
| Expo Go user | Expected — show friendly message on Follow-up screen |

---

## Automated checks (developer)

```powershell
cd C:\Users\91878\LifeMate
npm run test:notifications
npm run test:push
npx expo-doctor@latest
```

All tests should print `ok`. Expo-doctor should report no errors (warnings fixed where safe).

---

## Phase 4 complete — what you now have

- **Browser admin** for clinics, doctors, products, orders, thresholds, review queue
- **Rules engine** reading thresholds from the database (with code fallback)
- **Lab orders** after payment (manual provider works without a live lab API)
- **Clinician review** and plan sign-off unlocking the store
- **Local reminders** for follow-ups and symptom re-checks
- **Remote push** when results are ready and when the plan is finalised
- **Safety**: symptom checks still route to Pathway B; no secrets in client code

Phase 4 matches the operational workflow in the source document end to end.
