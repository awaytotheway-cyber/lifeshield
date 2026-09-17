-- ============================================================================
-- PRESCOPE Phase 5 booking — PART 1 of 7: clinics + products columns
-- Paste this whole block into a NEW Supabase SQL Editor query and click Run
-- before moving on to part 2. Do not mix parts in one paste.
-- Full combined file: supabase/phase5-booking.sql
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. CLINICS — add location fields used by the "labs near me" list
-- ---------------------------------------------------------------------------
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS postcode TEXT;
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS latitude NUMERIC;
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS longitude NUMERIC;
-- Coarse area key (e.g. "SW1" from "SW1A 1AA"). Lets us match on postcode
-- alone when we have no coordinates, which is the common case early on.
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS postcode_area TEXT;

-- Any signed-in user may read the clinic list (it is public information).
DROP POLICY IF EXISTS "clinics_select_authenticated" ON public.clinics;
CREATE POLICY "clinics_select_authenticated"
  ON public.clinics FOR SELECT
  TO authenticated
  USING (active IS TRUE);

-- ---------------------------------------------------------------------------
-- 2. PRODUCTS — preparation rules for test products
--    Shown BEFORE payment, repeated in the confirmation and in the T-24h
--    reminder. A wrong prep means a wasted sample and a wasted trip.
-- ---------------------------------------------------------------------------
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS prep_instructions TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS fasting_required BOOLEAN DEFAULT FALSE;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS fasting_hours INT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS cycle_day_window TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS home_kit_available BOOLEAN DEFAULT FALSE;

