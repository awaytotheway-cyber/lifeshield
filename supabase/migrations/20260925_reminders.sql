-- PRESCOPE — user-defined reminders (Phase A)
--
-- HOW TO USE
-- 1. Open Supabase → SQL Editor → New query
-- 2. Paste this whole file and click Run
-- 3. Safe to re-run (IF NOT EXISTS / additive columns only)
--
-- Distinct from public.follow_ups, which holds clinical retests / reviews /
-- symptom re-checks. These reminders are user-defined: "take my supplement
-- daily at 9am", "log a walk every Tuesday", "reorder kits monthly".
-- Local notifications are scheduled via expo-notifications; the platform
-- notification id is stored on local_notification_id so the app can cancel
-- it on edit or delete.

CREATE TABLE IF NOT EXISTS public.reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  title TEXT NOT NULL,
  body TEXT,

  cadence TEXT NOT NULL
    CHECK (cadence IN ('once', 'daily', 'weekly', 'monthly')),

  -- The reference fire time. For 'once' it is the fire time itself; for
  -- recurring cadences the time-of-day (and day-of-week / day-of-month) come
  -- from this value.
  start_at TIMESTAMPTZ NOT NULL,

  -- The next scheduled fire time. Computed by lib/reminders.nextOccurrence
  -- and updated whenever the row is saved or the reminder fires.
  next_fire_at TIMESTAMPTZ,
  last_fired_at TIMESTAMPTZ,

  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'completed')),

  -- Where this reminder came from. source_ref is the id of the source row
  -- (e.g. a goal id when the reminder was seeded from a goal). Kept flexible
  -- so Phase L (journey/analytics) can follow the chain back.
  source_kind TEXT NOT NULL DEFAULT 'self'
    CHECK (source_kind IN ('self', 'goal', 'intervention', 'supplement', 'test_order')),
  source_ref UUID,

  -- Handle for cancelling the scheduled Expo notification. Null when nothing
  -- is scheduled (e.g. paused, or notifications permission denied).
  local_notification_id TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS reminders_user_idx
  ON public.reminders (user_id, status, next_fire_at);
CREATE INDEX IF NOT EXISTS reminders_source_idx
  ON public.reminders (source_kind, source_ref);

ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_reminders" ON public.reminders;
CREATE POLICY "own_reminders" ON public.reminders
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.reminders TO authenticated;

COMMENT ON TABLE public.reminders IS
  'User-defined reminders (Phase A). Distinct from clinical follow_ups. Scheduling is local (expo-notifications); the platform id lives in local_notification_id.';
