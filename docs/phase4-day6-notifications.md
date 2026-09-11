# Phase 4 Day 6 — Notifications (plain English)

This step adds **reminders on the phone** and **registers the device** for server push later (Day 7).

## Two kinds of notification

| Kind | What it is | Needs server? | Works in Expo Go? |
|------|------------|---------------|-------------------|
| **Local** | Scheduled on the phone when follow-ups are due | No | Yes (if you allow permission) |
| **Remote push** | Message sent from Supabase when results/plan are ready | Yes (Day 7) | **No** — needs an EAS build |

The app **never crashes** if you deny permission or stay on Expo Go.

## What you need to do once

### 1. Supabase SQL

If you already ran `supabase/phase4-schema.sql` on Day 1, you are done.

Otherwise run **`supabase/phase4-day6-push-tokens.sql`** in **SQL Editor** (safe to run twice).

### 2. EAS development build (for remote push token)

Expo Go cannot save an Expo push token. Before testing “results ready” push in Day 7:

```bash
npm install -g eas-cli
eas login
eas build --profile development --platform android
```

`eas.json` already has a `development` profile. Your EAS project id is in `app.json` → `extra.eas.projectId`.

Install the built APK on a physical Android phone (or use iOS dev build on a Mac).

### 3. Keep using Expo Go for everything else

Local follow-up reminders (re-test, review, symptom re-check) work in Expo Go after you tap **Allow reminders on this phone** on the Follow-up screen.

## How to test local reminders

1. Sign in and open **Follow-up** (from Home or Plan).
2. Tap **Allow reminders on this phone**.
3. You should see a note that local reminders are on.
4. For a quick test, `lib/clinical-thresholds.ts` sets the first symptom check **due today** (`visibleDueDays: 0`).
5. Schedule fires at **9:00 AM** on the due date (or ~15 seconds later if the date is already past).
6. Tap the **symptom** notification → you land on the safety question → **Yes** still goes to Pathway B.

## How to test push token registration (EAS build only)

1. Install the EAS **development** build (not Expo Go).
2. Sign in and open Follow-up → allow reminders.
3. In Supabase → **Table Editor** → `push_tokens`: you should see your `expo_push_token` row.

In Expo Go you will see a friendly message that remote push needs a dev build — that is expected.

## What Day 7 added

- `send-push` Edge Function when results are reviewed or a plan is finalised.
- See **`docs/phase4-day7-e2e-test.md`** for the full end-to-end checklist.

## Changing reminder timing

Edit numbers in `lib/clinical-thresholds.ts` → `FOLLOW_UP_TIMING` (symptom interval, review days, re-test days).
