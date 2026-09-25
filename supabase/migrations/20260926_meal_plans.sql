-- PRESCOPE — meal plans (Phase C)
--
-- Per-user meal plan rows: title, date range, structured plan jsonb, and the
-- preferences that generated it (kept so a future "regenerate with the same
-- knobs" or "diff against last week" flow doesn't have to re-derive them).
--
-- HOW TO USE
-- 1. Open Supabase → SQL Editor → New query
-- 2. Paste this whole file and click Run
-- 3. Safe to re-run (IF NOT EXISTS)

CREATE TABLE IF NOT EXISTS public.meal_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  title TEXT NOT NULL,

  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  CONSTRAINT meal_plans_dates_ordered CHECK (end_date >= start_date),

  -- { "days": [{ "date": "YYYY-MM-DD", "meals": [{ "slot": "…", "recipe_id": "…",
  --   "recipe_slug": "…", "recipe_name": "…" }] }] }
  -- lib/meal-planner writes this; lib/meal-plans-io reads it back.
  plan JSONB NOT NULL DEFAULT '{"days":[]}'::jsonb,

  -- Snapshot of the knobs used to generate the plan. Same shape as
  -- MealPlanPreferences in lib/meal-planner.
  preferences JSONB NOT NULL DEFAULT '{}'::jsonb,

  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'archived')),

  source_kind TEXT NOT NULL DEFAULT 'self'
    CHECK (source_kind IN ('self', 'goal', 'intervention')),
  source_ref UUID,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS meal_plans_user_idx
  ON public.meal_plans (user_id, status, start_date DESC);

ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_meal_plans" ON public.meal_plans;
CREATE POLICY "own_meal_plans" ON public.meal_plans
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.meal_plans TO authenticated;

COMMENT ON TABLE public.meal_plans IS
  'User-generated meal plans. plan jsonb structure documented in lib/meal-planner.ts. preferences stores the generator inputs for future "regenerate" and Phase L journey analytics.';
