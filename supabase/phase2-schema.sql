-- =============================================================================
-- THIS IS SQL for the Supabase SQL Editor, NOT Edge Functions.
-- Never paste import / Deno.serve here.
--
-- How to run (no code needed):
--   1. Open supabase.com → your project → SQL Editor
--   2. Paste this whole file
--   3. Click Run
--
-- Safe to run more than once. Creates missing tables only.
-- NEVER DROP TABLES — we only drop-and-recreate policies if they already exist.
-- test_results: people can READ their own rows. Regular users cannot insert.
-- Inserts go through either:
--   A) the save-reviewed-result Edge Function (optional), or
--   B) the save_reviewed_result SQL function below (uses the signed-in
--      person's login token — NOT a service-role key on the phone).
-- Draft plan rows: people can write their own interventions (RLS).
-- replace_draft_interventions() swaps drafts in one step and keeps approved rows.
-- =============================================================================

-- ========== TEST RESULTS ==========
CREATE TABLE IF NOT EXISTS public.test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  test_order_id UUID REFERENCES public.test_orders(id),
  test_name TEXT NOT NULL,          -- exact clinical marker name
  plain_name TEXT,                  -- everyday name shown to user
  result_value TEXT,
  result_unit TEXT,
  reference_range TEXT,
  flag TEXT CHECK (flag IN ('normal','low','high','critical','positive','negative')),
  lab_report_url TEXT,              -- optional PDF in Supabase Storage
  clinician_reviewed BOOLEAN DEFAULT FALSE,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.test_results ENABLE ROW LEVEL SECURITY;
-- People can read their own rows. They cannot insert or edit with a normal
-- table write. Admin saves go through save_reviewed_result() below (or the
-- optional Edge Function). No service-role key is needed on the phone.
DROP POLICY IF EXISTS "own_results" ON public.test_results;
DROP POLICY IF EXISTS "own_results_select" ON public.test_results;
DROP POLICY IF EXISTS "own_results_insert" ON public.test_results;
DROP POLICY IF EXISTS "own_results_update" ON public.test_results;
CREATE POLICY "own_results_select" ON public.test_results
  FOR SELECT USING (auth.uid() = user_id);

-- =============================================================================
-- ADMIN SAVE HELPER (Postgres RPC)
-- Safe to re-run. This is SQL, not an Edge Function.
--
-- Why this exists: Expo on localhost often cannot reach an Edge Function
-- (not deployed, or CORS). The app then calls this function instead.
-- It still uses the caller's login (JWT). Regular users are rejected.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.save_reviewed_result(
  p_user_id uuid,
  p_test_name text,
  p_plain_name text DEFAULT NULL,
  p_result_value text DEFAULT NULL,
  p_result_unit text DEFAULT NULL,
  p_reference_range text DEFAULT NULL,
  p_flag text DEFAULT NULL,
  p_test_order_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_id uuid;
  v_flag text;
  v_plain text;
  v_value text;
  v_unit text;
  v_range text;
BEGIN
  -- Must be a signed-in person. Guests cannot write results.
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Please sign in first.'
      USING ERRCODE = '42501';
  END IF;

  -- Email comes from the login token, not from the phone body.
  -- Change this list if you add another clinician later.
  v_email := lower(trim(COALESCE(auth.jwt() ->> 'email', '')));
  IF v_email IS NULL OR v_email <> 'awaytotheway@gmail.com' THEN
    RAISE EXCEPTION 'This account is not allowed to enter results.'
      USING ERRCODE = '42501';
  END IF;

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Missing required fields';
  END IF;

  IF p_test_name IS NULL OR length(trim(p_test_name)) = 0 THEN
    RAISE EXCEPTION 'Missing required fields';
  END IF;

  v_flag := NULLIF(trim(p_flag), '');
  IF v_flag IS NOT NULL AND v_flag NOT IN (
    'normal','low','high','critical','positive','negative'
  ) THEN
    RAISE EXCEPTION 'flag is not an allowed value.';
  END IF;

  v_plain := NULLIF(trim(p_plain_name), '');
  v_value := NULLIF(trim(p_result_value), '');
  v_unit := NULLIF(trim(p_result_unit), '');
  v_range := NULLIF(trim(p_reference_range), '');

  -- Only these columns. Extra keys from the phone are never written.
  INSERT INTO public.test_results (
    user_id,
    test_name,
    plain_name,
    result_value,
    result_unit,
    reference_range,
    flag,
    test_order_id,
    clinician_reviewed,
    reviewed_by,
    reviewed_at
  ) VALUES (
    p_user_id,
    trim(p_test_name),
    v_plain,
    v_value,
    v_unit,
    v_range,
    v_flag,
    p_test_order_id,
    TRUE,
    v_email,
    NOW()
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- Default Postgres lets everyone run new functions. Lock that down.
REVOKE ALL ON FUNCTION public.save_reviewed_result(
  uuid, text, text, text, text, text, text, uuid
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_reviewed_result(
  uuid, text, text, text, text, text, text, uuid
) FROM anon;
GRANT EXECUTE ON FUNCTION public.save_reviewed_result(
  uuid, text, text, text, text, text, text, uuid
) TO authenticated;

COMMENT ON FUNCTION public.save_reviewed_result(
  uuid, text, text, text, text, text, text, uuid
) IS
  'Admin-only insert into test_results. Checks auth.uid() and admin email. No service-role key on the phone.';

-- ========== INTERVENTIONS (the personalised plan) ==========
CREATE TABLE IF NOT EXISTS public.interventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  trigger_finding TEXT NOT NULL,    -- which result/answer triggered this (exact term)
  plain_reason TEXT,                -- plain-language "why you're seeing this"
  category TEXT NOT NULL CHECK (category IN (
    'supplement','diet','lifestyle','therapy','referral','coaching'
  )),
  title TEXT NOT NULL,              -- plain-language action title
  description TEXT,
  clinical_basis TEXT,              -- exact intervention text from the protocol
  status TEXT DEFAULT 'draft' CHECK (status IN (
    'draft','clinician_approved','active','paused','completed','declined'
  )),
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  clinician_interaction_check BOOLEAN DEFAULT FALSE
);
ALTER TABLE public.interventions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_interventions" ON public.interventions;
CREATE POLICY "own_interventions" ON public.interventions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Older projects created this table without the interaction-check column.
ALTER TABLE public.interventions
  ADD COLUMN IF NOT EXISTS clinician_interaction_check BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN public.interventions.clinician_interaction_check IS
  'TRUE when DIM/I3C or high-dose omega-3 needs practitioner review because the patient reported hormone therapy/contraceptive use or blood thinners. Set by mapResultsToInterventions in the rules engine.';

-- =============================================================================
-- REPLACE DRAFT PLAN (Postgres RPC)
-- Safe to re-run. This is SQL, not an Edge Function.
--
-- Deletes this signed-in person's draft rows, then inserts the new drafts.
-- Rows that are not status=draft (for example clinician_approved) are kept.
-- Only works when auth.uid() = the user_id you pass in.
-- =============================================================================
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
  'Replace the signed-in person''s draft interventions only. Keeps non-draft rows. No service-role key.';

-- ========== FOLLOW-UPS ==========
CREATE TABLE IF NOT EXISTS public.follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('retest','review','symptom_check','coaching')),
  title TEXT NOT NULL,
  plain_note TEXT,
  due_date DATE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','completed','missed','rescheduled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_followups" ON public.follow_ups;
CREATE POLICY "own_followups" ON public.follow_ups
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- FOLLOW-UP HELPERS (Postgres RPC)
-- Safe to re-run. This is SQL, not an Edge Function.
--
-- ensure_follow_up: insert one row, or return the existing pending row
-- with the same type + title (no duplicates).
-- complete_follow_up: mark your own row completed.
-- Use these if a normal table insert/update is blocked by RLS.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.ensure_follow_up(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_plain_note text DEFAULT NULL,
  p_due_date date DEFAULT CURRENT_DATE
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_type text;
  v_title text;
  v_note text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Please sign in first.'
      USING ERRCODE = '42501';
  END IF;

  IF p_user_id IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'You can only create your own follow-ups.'
      USING ERRCODE = '42501';
  END IF;

  v_type := NULLIF(trim(p_type), '');
  v_title := NULLIF(trim(p_title), '');

  IF v_type IS NULL OR v_title IS NULL OR p_due_date IS NULL THEN
    RAISE EXCEPTION 'Missing required fields';
  END IF;

  IF v_type NOT IN ('retest','review','symptom_check','coaching') THEN
    RAISE EXCEPTION 'type is not an allowed value.';
  END IF;

  v_note := NULLIF(trim(p_plain_note), '');

  SELECT id INTO v_id
  FROM public.follow_ups
  WHERE user_id = p_user_id
    AND type = v_type
    AND lower(title) = lower(v_title)
    AND status = 'pending'
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_id IS NOT NULL THEN
    RETURN v_id;
  END IF;

  INSERT INTO public.follow_ups (
    user_id,
    type,
    title,
    plain_note,
    due_date,
    status
  ) VALUES (
    p_user_id,
    v_type,
    v_title,
    v_note,
    p_due_date,
    'pending'
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_follow_up(uuid, text, text, text, date) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ensure_follow_up(uuid, text, text, text, date) FROM anon;
GRANT EXECUTE ON FUNCTION public.ensure_follow_up(uuid, text, text, text, date) TO authenticated;

COMMENT ON FUNCTION public.ensure_follow_up(uuid, text, text, text, date) IS
  'Idempotent insert of one pending follow-up for the signed-in person. Same type+title is reused.';

CREATE OR REPLACE FUNCTION public.complete_follow_up(
  p_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Please sign in first.'
      USING ERRCODE = '42501';
  END IF;

  IF p_id IS NULL THEN
    RAISE EXCEPTION 'Missing required fields';
  END IF;

  SELECT user_id INTO v_user
  FROM public.follow_ups
  WHERE id = p_id;

  IF v_user IS NULL THEN
    RETURN FALSE;
  END IF;

  IF v_user <> auth.uid() THEN
    RAISE EXCEPTION 'You can only complete your own follow-ups.'
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.follow_ups
  SET status = 'completed'
  WHERE id = p_id
    AND user_id = auth.uid();

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_follow_up(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.complete_follow_up(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.complete_follow_up(uuid) TO authenticated;

COMMENT ON FUNCTION public.complete_follow_up(uuid) IS
  'Mark the signed-in person''s follow-up as completed. No service-role key.';
