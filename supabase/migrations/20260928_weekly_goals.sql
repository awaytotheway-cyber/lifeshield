-- PRESCOPE — Weekly Goals (feature #1)
--
-- A short, personal target the user works on for one week (or a
-- caller-chosen window). Never a medical prescription. Categories
-- match the areas we already recommend (supplement, exercise,
-- meditation, recipe / food, general habit).
--
-- HOW TO USE
-- 1. Open Supabase → SQL Editor → New query
-- 2. Paste this whole file and click Run
-- 3. Safe to re-run (IF NOT EXISTS on everything)

CREATE TABLE IF NOT EXISTS public.weekly_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  goal_type TEXT NOT NULL CHECK (goal_type IN (
    'supplement','exercise','meditation','recipe','habit'
  )),
  target NUMERIC NOT NULL CHECK (target > 0),
  unit TEXT NOT NULL,
  progress NUMERIC NOT NULL DEFAULT 0 CHECK (progress >= 0),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN (
    'active','completed','missed','cancelled'
  )),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT weekly_goals_range CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS weekly_goals_user_id_idx
  ON public.weekly_goals (user_id);
CREATE INDEX IF NOT EXISTS weekly_goals_user_status_idx
  ON public.weekly_goals (user_id, status);
CREATE INDEX IF NOT EXISTS weekly_goals_end_date_idx
  ON public.weekly_goals (end_date);

-- Keep updated_at fresh on any row change.
CREATE OR REPLACE FUNCTION public.set_weekly_goals_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS weekly_goals_set_updated_at ON public.weekly_goals;
CREATE TRIGGER weekly_goals_set_updated_at
  BEFORE UPDATE ON public.weekly_goals
  FOR EACH ROW EXECUTE FUNCTION public.set_weekly_goals_updated_at();

ALTER TABLE public.weekly_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_weekly_goals" ON public.weekly_goals;
CREATE POLICY "own_weekly_goals" ON public.weekly_goals
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "admin_weekly_goals_read" ON public.weekly_goals;
CREATE POLICY "admin_weekly_goals_read" ON public.weekly_goals
  FOR SELECT
  USING (public.is_admin_staff());

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.weekly_goals
  TO anon, authenticated;

COMMENT ON TABLE public.weekly_goals IS
  'Short user-set targets (one per week by convention). Not medical advice.';
