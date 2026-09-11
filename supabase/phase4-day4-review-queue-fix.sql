-- =============================================================================
-- Phase 4 Day 4 — Review Queue patient page fix
-- Paste into Supabase → SQL Editor → Run.
-- Safe to run more than once (idempotent).
--
-- Problem: owner/admin could open the review queue but the patient detail page
-- failed or showed empty profile / interventions when admin_* policies were
-- missing or clinician_* policies required is_clinician_staff() (owner is not
-- a clinician).
--
-- Fix:
--   1. clinician_can_view_patient() returns TRUE for owner/admin.
--   2. Clinician intervention policies also allow is_admin_staff().
--   3. Re-create admin read/write policies on review tables (belt + suspenders).
-- =============================================================================

-- Owner/admin may view any patient in the review workflow (not only assigned).
CREATE OR REPLACE FUNCTION public.clinician_can_view_patient(p_patient_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_admin_staff()
    OR (
      public.is_clinician_staff()
      AND p_patient_user_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.interventions i
        WHERE i.user_id = p_patient_user_id
          AND (
            i.status = 'draft'
            OR i.approved_by IN (
              SELECT d.name
              FROM public.doctors d
              WHERE d.auth_user_id = auth.uid()
                AND d.active = TRUE
            )
          )
      )
    );
$$;

REVOKE ALL ON FUNCTION public.clinician_can_view_patient(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.clinician_can_view_patient(uuid) TO authenticated;

COMMENT ON FUNCTION public.clinician_can_view_patient(uuid) IS
  'RLS helper: owner/admin see all patients; clinicians see draft-queue or linked patients.';

-- ----- profiles -----
DROP POLICY IF EXISTS "admin_profiles_all" ON public.profiles;
CREATE POLICY "admin_profiles_all" ON public.profiles
  FOR ALL
  USING (public.is_admin_staff())
  WITH CHECK (public.is_admin_staff());

DROP POLICY IF EXISTS "clinician_profiles_read" ON public.profiles;
CREATE POLICY "clinician_profiles_read" ON public.profiles
  FOR SELECT
  USING (public.clinician_can_view_patient(id));

-- ----- interventions -----
DROP POLICY IF EXISTS "admin_interventions_all" ON public.interventions;
CREATE POLICY "admin_interventions_all" ON public.interventions
  FOR ALL
  USING (public.is_admin_staff())
  WITH CHECK (public.is_admin_staff());

DROP POLICY IF EXISTS "clinician_interventions_read" ON public.interventions;
CREATE POLICY "clinician_interventions_read" ON public.interventions
  FOR SELECT
  USING (
    public.is_admin_staff()
    OR (
      public.is_clinician_staff()
      AND (
        status = 'draft'
        OR public.clinician_can_view_patient(user_id)
      )
    )
  );

DROP POLICY IF EXISTS "clinician_interventions_update" ON public.interventions;
CREATE POLICY "clinician_interventions_update" ON public.interventions
  FOR UPDATE
  USING (
    public.is_admin_staff()
    OR (
      public.is_clinician_staff()
      AND public.clinician_can_view_patient(user_id)
    )
  )
  WITH CHECK (
    public.is_admin_staff()
    OR (
      public.is_clinician_staff()
      AND public.clinician_can_view_patient(user_id)
    )
  );

-- ----- test_results -----
DROP POLICY IF EXISTS "admin_test_results_all" ON public.test_results;
CREATE POLICY "admin_test_results_all" ON public.test_results
  FOR ALL
  USING (public.is_admin_staff())
  WITH CHECK (public.is_admin_staff());

DROP POLICY IF EXISTS "clinician_test_results_read" ON public.test_results;
CREATE POLICY "clinician_test_results_read" ON public.test_results
  FOR SELECT
  USING (public.clinician_can_view_patient(user_id));

-- ----- questionnaire_responses -----
DROP POLICY IF EXISTS "admin_questionnaire_all" ON public.questionnaire_responses;
CREATE POLICY "admin_questionnaire_all" ON public.questionnaire_responses
  FOR SELECT
  USING (public.is_admin_staff());

DROP POLICY IF EXISTS "clinician_questionnaire_read" ON public.questionnaire_responses;
CREATE POLICY "clinician_questionnaire_read" ON public.questionnaire_responses
  FOR SELECT
  USING (public.clinician_can_view_patient(user_id));

-- ----- test_orders (review context) -----
DROP POLICY IF EXISTS "admin_test_orders_all" ON public.test_orders;
CREATE POLICY "admin_test_orders_all" ON public.test_orders
  FOR ALL
  USING (public.is_admin_staff())
  WITH CHECK (public.is_admin_staff());

DROP POLICY IF EXISTS "clinician_test_orders_read" ON public.test_orders;
CREATE POLICY "clinician_test_orders_read" ON public.test_orders
  FOR SELECT
  USING (public.clinician_can_view_patient(user_id));
