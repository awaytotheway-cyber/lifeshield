-- =============================================================================
-- Phase 4 Day 4 — clinician sign-off (SQL fallback)
-- Paste into Supabase → SQL Editor → Run.
-- This is SQL, not an Edge Function.
--
-- The admin panel tries the sign-off-intervention Edge Function first.
-- If that is not deployed, it falls back to sign_off_intervention() below.
-- Both paths check the caller server-side (never trust the browser alone).
-- =============================================================================

-- Returns TRUE when the signed-in user may approve / finalise plans.
CREATE OR REPLACE FUNCTION public.caller_can_sign_off()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_admin_staff()
    OR EXISTS (
      SELECT 1
      FROM public.doctors d
      WHERE d.auth_user_id = auth.uid()
        AND d.active = TRUE
        AND d.can_sign_off = TRUE
    );
$$;

-- Name stored on interventions.approved_by (matches clinician_can_view_patient).
CREATE OR REPLACE FUNCTION public.caller_sign_off_label()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT d.name
      FROM public.doctors d
      WHERE d.auth_user_id = auth.uid()
        AND d.active = TRUE
      LIMIT 1
    ),
    lower(trim(COALESCE(auth.jwt() ->> 'email', 'clinician')))
  );
$$;

-- Approve / decline / edit dosage note / finalise plan for one patient.
CREATE OR REPLACE FUNCTION public.sign_off_intervention(
  p_action text,
  p_intervention_id uuid DEFAULT NULL,
  p_patient_user_id uuid DEFAULT NULL,
  p_dosage_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action text;
  v_row public.interventions%ROWTYPE;
  v_label text;
  v_updated integer := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Please sign in first.'
      USING ERRCODE = '42501';
  END IF;

  IF NOT public.caller_can_sign_off() THEN
    RAISE EXCEPTION 'This account is not allowed to sign off plans.'
      USING ERRCODE = '42501';
  END IF;

  v_action := lower(trim(COALESCE(p_action, '')));
  v_label := public.caller_sign_off_label();

  IF v_action = 'approve' THEN
    IF p_intervention_id IS NULL THEN
      RAISE EXCEPTION 'Missing intervention id.';
    END IF;

    SELECT * INTO v_row
    FROM public.interventions
    WHERE id = p_intervention_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Intervention not found.';
    END IF;

    IF NOT public.is_admin_staff()
       AND NOT public.clinician_can_view_patient(v_row.user_id) THEN
      RAISE EXCEPTION 'You are not allowed to review this patient.'
        USING ERRCODE = '42501';
    END IF;

    IF v_row.status <> 'draft' THEN
      RAISE EXCEPTION 'Only draft interventions can be approved.';
    END IF;

    UPDATE public.interventions
    SET
      status = 'clinician_approved',
      approved_by = v_label,
      approved_at = NOW()
    WHERE id = p_intervention_id;

    RETURN jsonb_build_object(
      'action', 'approve',
      'intervention_id', p_intervention_id,
      'status', 'clinician_approved'
    );
  END IF;

  IF v_action = 'decline' THEN
    IF p_intervention_id IS NULL THEN
      RAISE EXCEPTION 'Missing intervention id.';
    END IF;

    SELECT * INTO v_row
    FROM public.interventions
    WHERE id = p_intervention_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Intervention not found.';
    END IF;

    IF NOT public.is_admin_staff()
       AND NOT public.clinician_can_view_patient(v_row.user_id) THEN
      RAISE EXCEPTION 'You are not allowed to review this patient.'
        USING ERRCODE = '42501';
    END IF;

    IF v_row.status <> 'draft' THEN
      RAISE EXCEPTION 'Only draft interventions can be declined.';
    END IF;

    UPDATE public.interventions
    SET status = 'declined'
    WHERE id = p_intervention_id;

    RETURN jsonb_build_object(
      'action', 'decline',
      'intervention_id', p_intervention_id,
      'status', 'declined'
    );
  END IF;

  IF v_action = 'edit' THEN
    IF p_intervention_id IS NULL THEN
      RAISE EXCEPTION 'Missing intervention id.';
    END IF;

    SELECT * INTO v_row
    FROM public.interventions
    WHERE id = p_intervention_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Intervention not found.';
    END IF;

    IF NOT public.is_admin_staff()
       AND NOT public.clinician_can_view_patient(v_row.user_id) THEN
      RAISE EXCEPTION 'You are not allowed to review this patient.'
        USING ERRCODE = '42501';
    END IF;

    IF v_row.status NOT IN ('draft', 'clinician_approved') THEN
      RAISE EXCEPTION 'This intervention can no longer be edited.';
    END IF;

    UPDATE public.interventions
    SET description = NULLIF(trim(COALESCE(p_dosage_note, '')), '')
    WHERE id = p_intervention_id;

    RETURN jsonb_build_object(
      'action', 'edit',
      'intervention_id', p_intervention_id
    );
  END IF;

  IF v_action = 'finalise_plan' THEN
    IF p_patient_user_id IS NULL THEN
      RAISE EXCEPTION 'Missing patient user id.';
    END IF;

    IF NOT public.is_admin_staff()
       AND NOT public.clinician_can_view_patient(p_patient_user_id) THEN
      RAISE EXCEPTION 'You are not allowed to finalise this patient plan.'
        USING ERRCODE = '42501';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM public.interventions i
      WHERE i.user_id = p_patient_user_id
        AND i.status = 'draft'
    ) THEN
      RAISE EXCEPTION 'Approve or decline every draft item before finalising.';
    END IF;

    UPDATE public.interventions
    SET status = 'active'
    WHERE user_id = p_patient_user_id
      AND status = 'clinician_approved';

    GET DIAGNOSTICS v_updated = ROW_COUNT;

    RETURN jsonb_build_object(
      'action', 'finalise_plan',
      'patient_user_id', p_patient_user_id,
      'activated_count', v_updated
    );
  END IF;

  RAISE EXCEPTION 'Unknown action. Use approve, decline, edit, or finalise_plan.';
END;
$$;

REVOKE ALL ON FUNCTION public.sign_off_intervention(text, uuid, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sign_off_intervention(text, uuid, uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.sign_off_intervention(text, uuid, uuid, text) TO authenticated;

COMMENT ON FUNCTION public.sign_off_intervention(text, uuid, uuid, text) IS
  'Clinician sign-off fallback. Checks caller_can_sign_off() server-side. Approve/decline/edit/finalise plan.';
