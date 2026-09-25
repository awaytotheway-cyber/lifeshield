-- PRESCOPE — clinician review of user goals and meal plans
--
-- Adds a lightweight review workflow: an admin/clinician can mark a goal
-- or a meal plan as reviewed, leaving a note. The mobile app shows a
-- "Reviewed" chip on cards where clinician_reviewed = true so the user
-- knows their goal / plan has been looked at.
--
-- HOW TO USE
-- 1. Open Supabase → SQL Editor → New query
-- 2. Paste this whole file and click Run
-- 3. Safe to re-run (IF NOT EXISTS / additive columns only)

-- ========== COLUMNS ==========
ALTER TABLE public.goals
  ADD COLUMN IF NOT EXISTS clinician_reviewed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reviewed_by TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewer_note TEXT;

ALTER TABLE public.meal_plans
  ADD COLUMN IF NOT EXISTS clinician_reviewed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reviewed_by TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewer_note TEXT;

CREATE INDEX IF NOT EXISTS goals_review_idx
  ON public.goals (clinician_reviewed, reviewed_at DESC);
CREATE INDEX IF NOT EXISTS meal_plans_review_idx
  ON public.meal_plans (clinician_reviewed, reviewed_at DESC);

COMMENT ON COLUMN public.goals.clinician_reviewed IS
  'Set true by an admin/clinician via the Refine dashboard. Renders a "Reviewed" chip on the mobile goals list.';
COMMENT ON COLUMN public.meal_plans.clinician_reviewed IS
  'Set true by an admin/clinician via the Refine dashboard. Renders a "Reviewed" chip on the mobile meal-plans list.';

-- ========== ADMIN READ / UPDATE POLICIES ==========
-- Existing own_goals / own_meal_plans policies stay: patients still see
-- and edit their own rows. These add-on policies let admin staff read
-- ALL rows (for triage) and update the review fields (without letting
-- them mutate target / plan payloads casually — that's not blocked at
-- the DB level since we don't want to fight the admin UI over legit
-- edits, but the Refine screens only expose the review-flip form.)

DROP POLICY IF EXISTS "admin_goals_read" ON public.goals;
CREATE POLICY "admin_goals_read"
  ON public.goals
  FOR SELECT
  USING (public.is_admin_staff());

DROP POLICY IF EXISTS "admin_goals_update" ON public.goals;
CREATE POLICY "admin_goals_update"
  ON public.goals
  FOR UPDATE
  USING (public.is_admin_staff())
  WITH CHECK (public.is_admin_staff());

DROP POLICY IF EXISTS "admin_meal_plans_read" ON public.meal_plans;
CREATE POLICY "admin_meal_plans_read"
  ON public.meal_plans
  FOR SELECT
  USING (public.is_admin_staff());

DROP POLICY IF EXISTS "admin_meal_plans_update" ON public.meal_plans;
CREATE POLICY "admin_meal_plans_update"
  ON public.meal_plans
  FOR UPDATE
  USING (public.is_admin_staff())
  WITH CHECK (public.is_admin_staff());

COMMENT ON POLICY "admin_goals_read" ON public.goals IS
  'Admin staff can read every goal (for the review queue). Patients still see only their own rows via own_goals.';
COMMENT ON POLICY "admin_meal_plans_read" ON public.meal_plans IS
  'Admin staff can read every meal plan (for the review queue). Patients still see only their own rows via own_meal_plans.';
