-- PRESCOPE — activity snapshots (Phase G)
--
-- One row per (user, source, kind, recorded_at) reading. Sources start as
-- 'manual' (typed on the phone) and grow to 'healthkit' / 'google_fit'
-- when the native bridges land in a follow-up slice.
--
-- kind values match lib/activity.ts (see the CHECK below). value_json
-- carries the source-native payload for auditability; value + unit are
-- the canonical numeric a screen renders — the parser in lib/activity.ts
-- populates both so a later ingest change never breaks the summary card.
--
-- HOW TO USE
-- 1. Open Supabase → SQL Editor → New query
-- 2. Paste this whole file and click Run
-- 3. Safe to re-run (IF NOT EXISTS)

CREATE TABLE IF NOT EXISTS public.activity_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  source TEXT NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual', 'healthkit', 'google_fit', 'fitbit', 'other')),

  kind TEXT NOT NULL
    CHECK (kind IN (
      'steps',
      'active_minutes',
      'resting_heart_rate',
      'sleep_minutes',
      'weight_kg'
    )),

  -- Canonical numeric + unit the app renders directly. Parsers in
  -- lib/activity.ts normalise vendor units into these before insert.
  value NUMERIC NOT NULL,
  unit TEXT NOT NULL,

  -- Optional vendor payload — kept for debugging + future re-parsing.
  value_json JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- The wall-clock time the reading represents (start of the day for
  -- steps / active_minutes; the sample time for heart-rate). Not the
  -- insert time — use created_at for that.
  recorded_at TIMESTAMPTZ NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One reading per (source, kind, day) so re-syncing HealthKit doesn't
  -- pile up duplicates. Manual entries also collapse to one per kind per
  -- day; a second manual insert replaces (see lib/activity-io.upsert).
  CONSTRAINT activity_snapshots_daily_unique
    UNIQUE (user_id, source, kind, recorded_at)
);

CREATE INDEX IF NOT EXISTS activity_snapshots_user_kind_idx
  ON public.activity_snapshots (user_id, kind, recorded_at DESC);

ALTER TABLE public.activity_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_activity_snapshots" ON public.activity_snapshots;
CREATE POLICY "own_activity_snapshots" ON public.activity_snapshots
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.activity_snapshots TO authenticated;

COMMENT ON TABLE public.activity_snapshots IS
  'One row per (user, source, kind, day) activity reading. Sources: manual, healthkit, google_fit, fitbit, other. Unit is canonical (steps, minutes, bpm, kg). Native bridges write here via lib/activity-source.ts.';
