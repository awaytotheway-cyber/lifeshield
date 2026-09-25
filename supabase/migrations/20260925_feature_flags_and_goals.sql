-- PRESCOPE — feature flags + goals (Phase A slice)
--
-- HOW TO USE
-- 1. Open Supabase → SQL Editor → New query
-- 2. Paste this whole file and click Run
-- 3. Safe to re-run (IF NOT EXISTS / additive columns only)
--
-- What this adds:
--   - profiles.feature_flags jsonb — per-user overrides for gradual rollout
--   - goals — user-defined SMART goals
--   - goal_progress — timestamped progress log per goal

-- ========== PER-USER FEATURE FLAGS ==========
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS feature_flags JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.profiles.feature_flags IS
  'Per-user overrides for gradual rollout. Read via lib/feature-flags.ts. Defaults live in code, not the DB.';

-- ========== GOALS ==========
CREATE TABLE IF NOT EXISTS public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- What kind of goal (steps, sleep hours, servings of veg, minutes meditated, …).
  goal_type TEXT NOT NULL,

  -- Free-text summary shown on the goal card.
  title TEXT NOT NULL,

  -- Structured target: { value: number, unit: string, cadence: 'daily'|'weekly'|'once' }
  target JSONB NOT NULL,

  start_date DATE NOT NULL,
  end_date DATE,

  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'completed', 'archived')),

  -- Where this goal came from (intervention id, recommendation code, or 'self').
  source_kind TEXT NOT NULL DEFAULT 'self'
    CHECK (source_kind IN ('self', 'intervention', 'recommendation', 'test_result')),
  source_ref UUID,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS goals_user_idx ON public.goals (user_id, status);
CREATE INDEX IF NOT EXISTS goals_source_idx ON public.goals (source_kind, source_ref);

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_goals" ON public.goals;
CREATE POLICY "own_goals" ON public.goals
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ========== GOAL PROGRESS ==========
CREATE TABLE IF NOT EXISTS public.goal_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- The recorded amount for this entry (steps that day, minutes meditated, …).
  value NUMERIC NOT NULL,
  note TEXT
);

CREATE INDEX IF NOT EXISTS goal_progress_goal_idx
  ON public.goal_progress (goal_id, recorded_at DESC);

ALTER TABLE public.goal_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_goal_progress" ON public.goal_progress;
CREATE POLICY "own_goal_progress" ON public.goal_progress
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Grant table access; RLS still restricts rows to the signed-in user.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.goals,
  public.goal_progress
TO authenticated;

COMMENT ON TABLE public.goals IS
  'User-defined SMART goals. source_ref links back to interventions when the goal was prefilled from a recommendation.';
COMMENT ON TABLE public.goal_progress IS
  'Timestamped progress entries. One goal has many rows; sum/average server-side or in lib/goals.ts.';
