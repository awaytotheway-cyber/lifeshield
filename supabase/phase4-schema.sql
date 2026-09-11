-- =============================================================================
-- THIS IS SQL for the Supabase SQL Editor, NOT Edge Functions.
-- Never paste import / Deno.serve here.
--
-- Phase 4 Day 1 — back-office tables + role-based RLS.
--
-- How to run (no code needed):
--   1. Open supabase.com → your project → SQL Editor
--   2. Paste this whole file
--   3. Click Run
--
-- Safe to run more than once. Creates missing tables only.
-- NEVER DROP TABLES — we only drop-and-recreate policies if they already exist.
-- clinical_thresholds seeds use ON CONFLICT (key) so re-runs do not duplicate rows.
--
-- Execution order (required — do not rearrange):
--   1. CREATE TABLE (all new tables)
--   2. Helper functions (reference staff_roles, doctors, interventions)
--   3. RLS policies (reference helper functions)
--   4. GRANTS
--
-- Plain-English explanation of every policy:
--   see supabase/phase4-rls-explained.md
-- =============================================================================

-- =============================================================================
-- NEW TABLES (Phase 4 Section 2)
-- Must come BEFORE helper functions and policies that reference them.
-- =============================================================================

-- ========== CLINICS ==========
CREATE TABLE IF NOT EXISTS public.clinics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  phone TEXT,
  email TEXT,
  offers_home_collection BOOLEAN DEFAULT FALSE,
  operating_hours TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;

-- ========== DOCTORS / PRACTITIONERS ==========
CREATE TABLE IF NOT EXISTS public.doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  qualifications TEXT,
  specialty TEXT,
  clinic_id UUID REFERENCES public.clinics(id),
  can_sign_off BOOLEAN DEFAULT FALSE,
  consultation_fee NUMERIC,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS doctors_auth_user_id_idx
  ON public.doctors (auth_user_id)
  WHERE auth_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS doctors_clinic_id_idx
  ON public.doctors (clinic_id)
  WHERE clinic_id IS NOT NULL;

ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;

-- ========== EDITABLE CLINICAL THRESHOLDS ==========
-- Mirrors lib/clinical-thresholds.ts — admin can edit in Refine (Day 3).
CREATE TABLE IF NOT EXISTS public.clinical_thresholds (
  key TEXT PRIMARY KEY,
  value NUMERIC NOT NULL,
  label TEXT,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'assumed')),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.clinical_thresholds ENABLE ROW LEVEL SECURITY;

INSERT INTO public.clinical_thresholds (key, value, label, status) VALUES
  ('fastingInsulin_elevated', 8, 'Fasting insulin elevated cut-off (μIU/mL)', 'confirmed'),
  ('bmi_obesityThreshold', 30, 'Obesity BMI threshold', 'confirmed'),
  ('tsh_subclinicalHypo', 4.5, 'TSH subclinical hypothyroid cut-off', 'confirmed'),
  ('liverEnzyme_altAstElevated', 40, 'ALT/AST elevated cut-off', 'assumed')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  label = EXCLUDED.label,
  status = EXCLUDED.status,
  updated_at = NOW();

-- ========== STAFF ROLES ==========
-- Links auth.users to a back-office role. One row per staff member.
CREATE TABLE IF NOT EXISTS public.staff_roles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'clinician', 'clinic_staff')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS staff_roles_role_idx
  ON public.staff_roles (role);

ALTER TABLE public.staff_roles ENABLE ROW LEVEL SECURITY;

-- ========== LAB ORDER TRACKING ==========
CREATE TABLE IF NOT EXISTS public.lab_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_order_id UUID REFERENCES public.test_orders(id),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  lab_provider TEXT,
  external_order_id TEXT,
  status TEXT DEFAULT 'created' CHECK (status IN (
    'created', 'kit_dispatched', 'sample_received', 'processing', 'resulted', 'cancelled'
  )),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS lab_orders_user_id_idx
  ON public.lab_orders (user_id);

CREATE INDEX IF NOT EXISTS lab_orders_test_order_id_idx
  ON public.lab_orders (test_order_id)
  WHERE test_order_id IS NOT NULL;

ALTER TABLE public.lab_orders ENABLE ROW LEVEL SECURITY;

-- ========== PUSH TOKENS ==========
CREATE TABLE IF NOT EXISTS public.push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  expo_push_token TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, expo_push_token)
);

CREATE INDEX IF NOT EXISTS push_tokens_user_id_idx
  ON public.push_tokens (user_id);

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- HELPER FUNCTIONS (SECURITY DEFINER — used by RLS policies)
-- Created AFTER tables above exist (staff_roles, doctors, interventions).
-- Documented in phase4-rls-explained.md.
-- =============================================================================

-- Returns TRUE when the signed-in user has the exact staff role (e.g. 'owner').
CREATE OR REPLACE FUNCTION public.is_staff_role(p_role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.staff_roles sr
    WHERE sr.user_id = auth.uid()
      AND sr.role = p_role
  );
$$;

-- Returns TRUE for owner OR admin (broad back-office access).
CREATE OR REPLACE FUNCTION public.is_admin_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.staff_roles sr
    WHERE sr.user_id = auth.uid()
      AND sr.role IN ('owner', 'admin')
  );
$$;

-- Returns TRUE when the signed-in user is a clinician in staff_roles.
CREATE OR REPLACE FUNCTION public.is_clinician_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_staff_role('clinician');
$$;

-- Returns TRUE when the signed-in user is clinic_staff (fulfilment only).
CREATE OR REPLACE FUNCTION public.is_clinic_staff_role()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_staff_role('clinic_staff');
$$;

-- The doctor row linked to the signed-in auth user (NULL if not a doctor).
CREATE OR REPLACE FUNCTION public.get_my_doctor_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT d.id
  FROM public.doctors d
  WHERE d.auth_user_id = auth.uid()
    AND d.active = TRUE
  LIMIT 1;
$$;

-- Clinician patient linkage (Day 1 foundation):
--   • ANY patient with a draft intervention is in the sign-off queue (all clinicians).
--   • OR the clinician previously approved an intervention for that patient
--     (approved_by matches their doctor name).
-- Clinicians CANNOT browse the whole patient database.
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

REVOKE ALL ON FUNCTION public.is_staff_role(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_admin_staff() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_clinician_staff() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_clinic_staff_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_my_doctor_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.clinician_can_view_patient(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.is_staff_role(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_clinician_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_clinic_staff_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_doctor_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.clinician_can_view_patient(uuid) TO authenticated;

COMMENT ON FUNCTION public.is_staff_role(text) IS
  'RLS helper: TRUE when auth.uid() has the given staff_roles.role value.';
COMMENT ON FUNCTION public.clinician_can_view_patient(uuid) IS
  'RLS helper: owner/admin see all patients; clinicians see draft-queue or linked patients.';

-- =============================================================================
-- RLS — NEW TABLES
-- =============================================================================

-- ----- clinics -----
-- Plain English: owner/admin manage all clinics; clinicians & clinic_staff can read active clinics.
DROP POLICY IF EXISTS "admin_clinics_all" ON public.clinics;
CREATE POLICY "admin_clinics_all" ON public.clinics
  FOR ALL
  USING (public.is_admin_staff())
  WITH CHECK (public.is_admin_staff());

DROP POLICY IF EXISTS "staff_clinics_read" ON public.clinics;
CREATE POLICY "staff_clinics_read" ON public.clinics
  FOR SELECT
  USING (
    public.is_clinician_staff()
    OR public.is_clinic_staff_role()
  );

-- ----- doctors -----
-- Plain English: owner/admin manage all doctors; clinicians read their own doctor row + colleagues.
DROP POLICY IF EXISTS "admin_doctors_all" ON public.doctors;
CREATE POLICY "admin_doctors_all" ON public.doctors
  FOR ALL
  USING (public.is_admin_staff())
  WITH CHECK (public.is_admin_staff());

DROP POLICY IF EXISTS "clinician_doctors_read" ON public.doctors;
CREATE POLICY "clinician_doctors_read" ON public.doctors
  FOR SELECT
  USING (
    public.is_clinician_staff()
    AND (
      auth_user_id = auth.uid()
      OR clinic_id IN (
        SELECT d.clinic_id
        FROM public.doctors d
        WHERE d.auth_user_id = auth.uid()
          AND d.active = TRUE
          AND d.clinic_id IS NOT NULL
      )
      OR active = TRUE
    )
  );

DROP POLICY IF EXISTS "clinic_staff_doctors_read" ON public.doctors;
CREATE POLICY "clinic_staff_doctors_read" ON public.doctors
  FOR SELECT
  USING (public.is_clinic_staff_role() AND active = TRUE);

-- ----- clinical_thresholds -----
-- Plain English: owner/admin read & edit; clinicians read only (for review context).
DROP POLICY IF EXISTS "admin_thresholds_all" ON public.clinical_thresholds;
CREATE POLICY "admin_thresholds_all" ON public.clinical_thresholds
  FOR ALL
  USING (public.is_admin_staff())
  WITH CHECK (public.is_admin_staff());

DROP POLICY IF EXISTS "clinician_thresholds_read" ON public.clinical_thresholds;
CREATE POLICY "clinician_thresholds_read" ON public.clinical_thresholds
  FOR SELECT
  USING (public.is_clinician_staff());

-- Plain English: any signed-in mobile user can read cut-offs (not PHI).
DROP POLICY IF EXISTS "authenticated_thresholds_read" ON public.clinical_thresholds;
CREATE POLICY "authenticated_thresholds_read" ON public.clinical_thresholds
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ----- staff_roles -----
-- Plain English: you can see your own role; only owner/admin can assign roles.
DROP POLICY IF EXISTS "own_staff_role_read" ON public.staff_roles;
CREATE POLICY "own_staff_role_read" ON public.staff_roles
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "admin_staff_roles_all" ON public.staff_roles;
CREATE POLICY "admin_staff_roles_all" ON public.staff_roles
  FOR ALL
  USING (public.is_admin_staff())
  WITH CHECK (public.is_admin_staff());

-- ----- lab_orders -----
-- Plain English: patients see own; admin all; clinic_staff fulfilment; clinician linked patients only.
DROP POLICY IF EXISTS "own_lab_orders" ON public.lab_orders;
CREATE POLICY "own_lab_orders" ON public.lab_orders
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "admin_lab_orders_all" ON public.lab_orders;
CREATE POLICY "admin_lab_orders_all" ON public.lab_orders
  FOR ALL
  USING (public.is_admin_staff())
  WITH CHECK (public.is_admin_staff());

DROP POLICY IF EXISTS "clinic_staff_lab_orders_fulfil" ON public.lab_orders;
CREATE POLICY "clinic_staff_lab_orders_fulfil" ON public.lab_orders
  FOR SELECT
  USING (public.is_clinic_staff_role());

DROP POLICY IF EXISTS "clinic_staff_lab_orders_update" ON public.lab_orders;
CREATE POLICY "clinic_staff_lab_orders_update" ON public.lab_orders
  FOR UPDATE
  USING (public.is_clinic_staff_role())
  WITH CHECK (public.is_clinic_staff_role());

DROP POLICY IF EXISTS "clinician_lab_orders_read" ON public.lab_orders;
CREATE POLICY "clinician_lab_orders_read" ON public.lab_orders
  FOR SELECT
  USING (public.clinician_can_view_patient(user_id));

-- ----- push_tokens -----
-- Plain English: patients manage own tokens; admin can read all (for push Edge Function via client later).
DROP POLICY IF EXISTS "own_push_tokens" ON public.push_tokens;
CREATE POLICY "own_push_tokens" ON public.push_tokens
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "admin_push_tokens_read" ON public.push_tokens;
CREATE POLICY "admin_push_tokens_read" ON public.push_tokens
  FOR SELECT
  USING (public.is_admin_staff());

-- =============================================================================
-- RLS — EXISTING TABLES (staff policies ADDED; patient policies UNCHANGED)
-- Phase 1–3 mobile app policies (own_profile, own_orders, etc.) stay as-is.
-- =============================================================================

-- ----- products (Phase 3) -----
-- Plain English: owner/admin can add, edit, deactivate products in the catalog.
DROP POLICY IF EXISTS "admin_products_write" ON public.products;
CREATE POLICY "admin_products_write" ON public.products
  FOR ALL
  USING (public.is_admin_staff())
  WITH CHECK (public.is_admin_staff());

-- ----- orders (Phase 3) -----
-- Plain English: owner/admin see & manage all orders; clinic_staff see all & update fulfilment.
DROP POLICY IF EXISTS "admin_orders_all" ON public.orders;
CREATE POLICY "admin_orders_all" ON public.orders
  FOR ALL
  USING (public.is_admin_staff())
  WITH CHECK (public.is_admin_staff());

DROP POLICY IF EXISTS "clinic_staff_orders_read" ON public.orders;
CREATE POLICY "clinic_staff_orders_read" ON public.orders
  FOR SELECT
  USING (public.is_clinic_staff_role());

DROP POLICY IF EXISTS "clinic_staff_orders_fulfil" ON public.orders;
CREATE POLICY "clinic_staff_orders_fulfil" ON public.orders
  FOR UPDATE
  USING (public.is_clinic_staff_role())
  WITH CHECK (public.is_clinic_staff_role());

-- ----- order_items (Phase 3) -----
-- Plain English: owner/admin all; clinic_staff read line items for packing/shipping.
DROP POLICY IF EXISTS "admin_order_items_all" ON public.order_items;
CREATE POLICY "admin_order_items_all" ON public.order_items
  FOR ALL
  USING (public.is_admin_staff())
  WITH CHECK (public.is_admin_staff());

DROP POLICY IF EXISTS "clinic_staff_order_items_read" ON public.order_items;
CREATE POLICY "clinic_staff_order_items_read" ON public.order_items
  FOR SELECT
  USING (public.is_clinic_staff_role());

-- ----- profiles (Phase 1) -----
-- Plain English: owner/admin patient list; clinicians ONLY linked/queue patients — NOT whole DB.
DROP POLICY IF EXISTS "admin_profiles_all" ON public.profiles;
CREATE POLICY "admin_profiles_all" ON public.profiles
  FOR ALL
  USING (public.is_admin_staff())
  WITH CHECK (public.is_admin_staff());

DROP POLICY IF EXISTS "clinician_profiles_read" ON public.profiles;
CREATE POLICY "clinician_profiles_read" ON public.profiles
  FOR SELECT
  USING (public.clinician_can_view_patient(id));

-- clinic_staff: NO policy on profiles — they cannot browse the patient database.

-- ----- test_orders (Phase 1) -----
-- Plain English: admin all; clinician sees test orders for linked/queue patients only.
DROP POLICY IF EXISTS "admin_test_orders_all" ON public.test_orders;
CREATE POLICY "admin_test_orders_all" ON public.test_orders
  FOR ALL
  USING (public.is_admin_staff())
  WITH CHECK (public.is_admin_staff());

DROP POLICY IF EXISTS "clinician_test_orders_read" ON public.test_orders;
CREATE POLICY "clinician_test_orders_read" ON public.test_orders
  FOR SELECT
  USING (public.clinician_can_view_patient(user_id));

-- clinic_staff: NO policy — they use orders/lab_orders, not clinical test recommendations.

-- ----- test_results (Phase 2) -----
-- Plain English: admin all; clinician reads results for linked/queue patients.
-- clinic_staff: deliberately NO policy — they cannot see clinical result values.
DROP POLICY IF EXISTS "admin_test_results_all" ON public.test_results;
CREATE POLICY "admin_test_results_all" ON public.test_results
  FOR ALL
  USING (public.is_admin_staff())
  WITH CHECK (public.is_admin_staff());

DROP POLICY IF EXISTS "clinician_test_results_read" ON public.test_results;
CREATE POLICY "clinician_test_results_read" ON public.test_results
  FOR SELECT
  USING (public.clinician_can_view_patient(user_id));

-- ----- interventions (Phase 2) -----
-- Plain English: admin all; clinician sees draft queue + linked patients; can update for review.
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

-- clinic_staff: NO policy on interventions.

-- ----- questionnaire_responses (Phase 1) -----
-- Plain English: admin reads all; clinician reads ONLY for linked/queue patients.
-- clinic_staff: NO policy — cannot see questionnaire clinical data.
DROP POLICY IF EXISTS "admin_questionnaire_all" ON public.questionnaire_responses;
CREATE POLICY "admin_questionnaire_all" ON public.questionnaire_responses
  FOR SELECT
  USING (public.is_admin_staff());

DROP POLICY IF EXISTS "clinician_questionnaire_read" ON public.questionnaire_responses;
CREATE POLICY "clinician_questionnaire_read" ON public.questionnaire_responses
  FOR SELECT
  USING (public.clinician_can_view_patient(user_id));

-- ----- triage_responses (Phase 1) -----
-- Plain English: admin reads all; clinician reads ONLY for linked/queue patients.
DROP POLICY IF EXISTS "admin_triage_read" ON public.triage_responses;
CREATE POLICY "admin_triage_read" ON public.triage_responses
  FOR SELECT
  USING (public.is_admin_staff());

DROP POLICY IF EXISTS "clinician_triage_read" ON public.triage_responses;
CREATE POLICY "clinician_triage_read" ON public.triage_responses
  FOR SELECT
  USING (public.clinician_can_view_patient(user_id));

-- ----- consent_records (Phase 1) -----
DROP POLICY IF EXISTS "admin_consent_read" ON public.consent_records;
CREATE POLICY "admin_consent_read" ON public.consent_records
  FOR SELECT
  USING (public.is_admin_staff());

DROP POLICY IF EXISTS "clinician_consent_read" ON public.consent_records;
CREATE POLICY "clinician_consent_read" ON public.consent_records
  FOR SELECT
  USING (public.clinician_can_view_patient(user_id));

-- ----- follow_ups (Phase 2) -----
DROP POLICY IF EXISTS "admin_followups_all" ON public.follow_ups;
CREATE POLICY "admin_followups_all" ON public.follow_ups
  FOR ALL
  USING (public.is_admin_staff())
  WITH CHECK (public.is_admin_staff());

DROP POLICY IF EXISTS "clinician_followups_read" ON public.follow_ups;
CREATE POLICY "clinician_followups_read" ON public.follow_ups
  FOR SELECT
  USING (public.clinician_can_view_patient(user_id));

-- ----- cart_items (Phase 3) -----
-- Admin read-only for support; patients keep own_cart policy.
DROP POLICY IF EXISTS "admin_cart_read" ON public.cart_items;
CREATE POLICY "admin_cart_read" ON public.cart_items
  FOR SELECT
  USING (public.is_admin_staff());

-- =============================================================================
-- GRANTS (authenticated staff + patients)
-- =============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.clinics,
  public.doctors,
  public.clinical_thresholds,
  public.staff_roles,
  public.lab_orders,
  public.push_tokens
TO authenticated;

-- Patients already have grants from Phase 1–3 scripts; re-grant is harmless.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.profiles,
  public.triage_responses,
  public.consent_records,
  public.questionnaire_responses,
  public.test_orders,
  public.test_results,
  public.interventions,
  public.follow_ups,
  public.products,
  public.cart_items,
  public.orders,
  public.order_items
TO authenticated;
