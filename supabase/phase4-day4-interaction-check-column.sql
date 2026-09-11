-- =============================================================================
-- Phase 4 Day 4 — interventions.clinician_interaction_check column
-- Paste into Supabase → SQL Editor → Run.
-- Safe to run more than once (idempotent).
--
-- Problem: Admin review queue patient page queries
--   interventions.clinician_interaction_check
-- but older databases created the interventions table before this column existed
-- (Postgres error 42703: column does not exist).
--
-- Purpose: When the rules engine recommends DIM/I3C or high-dose omega-3 and the
-- patient reported hormone therapy or blood thinners, this flag is TRUE so the
-- mobile app shows "needs practitioner check" and the admin review queue
-- surfaces a DIM/omega-3 interaction warning.
-- =============================================================================

ALTER TABLE public.interventions
  ADD COLUMN IF NOT EXISTS clinician_interaction_check BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN public.interventions.clinician_interaction_check IS
  'TRUE when DIM/I3C or high-dose omega-3 needs practitioner review because the patient reported hormone therapy/contraceptive use or blood thinners. Set by mapResultsToInterventions in the rules engine.';

-- Backfill: infer the flag on existing draft rows from title/finding text when
-- the column was just added (all rows default to FALSE).
UPDATE public.interventions
SET clinician_interaction_check = TRUE
WHERE clinician_interaction_check IS NOT TRUE
  AND status = 'draft'
  AND (
    lower(coalesce(title, '')) LIKE '%dim%'
    OR lower(coalesce(title, '')) LIKE '%i3c%'
    OR lower(coalesce(title, '')) LIKE '%omega-3%'
    OR lower(coalesce(title, '')) LIKE '%omega 3%'
    OR lower(coalesce(title, '')) LIKE '%fish oil%'
    OR lower(coalesce(trigger_finding, '')) LIKE '%dim%'
    OR lower(coalesce(trigger_finding, '')) LIKE '%i3c%'
    OR lower(coalesce(trigger_finding, '')) LIKE '%omega%'
  );

-- Ensure replace_draft_interventions persists the flag on new draft rows.
CREATE OR REPLACE FUNCTION public.replace_draft_interventions(
  p_user_id uuid,
  p_rows jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
  v_item jsonb;
  v_category text;
  v_title text;
  v_finding text;
  v_check boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Please sign in first.'
      USING ERRCODE = '42501';
  END IF;

  IF p_user_id IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'You can only replace your own draft plan.'
      USING ERRCODE = '42501';
  END IF;

  IF p_rows IS NULL OR jsonb_typeof(p_rows) <> 'array' THEN
    RAISE EXCEPTION 'Missing required fields';
  END IF;

  DELETE FROM public.interventions
  WHERE user_id = p_user_id
    AND status = 'draft';

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_rows)
  LOOP
    v_finding := NULLIF(trim(v_item ->> 'trigger_finding'), '');
    v_title := NULLIF(trim(v_item ->> 'title'), '');
    v_category := NULLIF(trim(v_item ->> 'category'), '');

    IF v_finding IS NULL OR v_title IS NULL OR v_category IS NULL THEN
      RAISE EXCEPTION 'Missing required fields';
    END IF;

    IF v_category NOT IN (
      'supplement','diet','lifestyle','therapy','referral','coaching'
    ) THEN
      RAISE EXCEPTION 'category is not an allowed value.';
    END IF;

    v_check := COALESCE((v_item ->> 'clinician_interaction_check')::boolean, FALSE);

    INSERT INTO public.interventions (
      user_id,
      trigger_finding,
      plain_reason,
      category,
      title,
      description,
      clinical_basis,
      status,
      clinician_interaction_check
    ) VALUES (
      p_user_id,
      v_finding,
      NULLIF(trim(v_item ->> 'plain_reason'), ''),
      v_category,
      v_title,
      NULLIF(trim(v_item ->> 'description'), ''),
      NULLIF(trim(v_item ->> 'clinical_basis'), ''),
      'draft',
      v_check
    );

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.replace_draft_interventions(uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.replace_draft_interventions(uuid, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.replace_draft_interventions(uuid, jsonb) TO authenticated;

COMMENT ON FUNCTION public.replace_draft_interventions(uuid, jsonb) IS
  'Replace the signed-in person''s draft interventions only. Keeps non-draft rows. Persists clinician_interaction_check. No service-role key.';
