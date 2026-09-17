-- ============================================================================
-- PRESCOPE Phase 5 booking — PART 2 of 7: lab_slots table
-- Paste this whole block into a NEW Supabase SQL Editor query and click Run
-- before moving on to part 3. Do not mix parts in one paste.
-- Full combined file: supabase/phase5-booking.sql
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 3. LAB_SLOTS — bookable appointment inventory
--    Synced from each provider by a scheduled Edge Function. The app reads
--    this table; the app never calls a provider API directly.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lab_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  starts_at TIMESTAMPTZ NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 15,
  capacity INT NOT NULL DEFAULT 1 CHECK (capacity > 0),
  booked_count INT NOT NULL DEFAULT 0 CHECK (booked_count >= 0),
  price_cents INT,
  currency TEXT NOT NULL DEFAULT 'GBP',
  -- The provider's own id for this slot, so a sync can update instead of duplicate.
  external_ref TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT lab_slots_not_oversold CHECK (booked_count <= capacity)
);

CREATE UNIQUE INDEX IF NOT EXISTS lab_slots_provider_ref_idx
  ON public.lab_slots (clinic_id, external_ref)
  WHERE external_ref IS NOT NULL;

CREATE INDEX IF NOT EXISTS lab_slots_clinic_time_idx
  ON public.lab_slots (clinic_id, starts_at);

ALTER TABLE public.lab_slots ENABLE ROW LEVEL SECURITY;

-- Read: any signed-in user. Write: service role only (the sync function).
DROP POLICY IF EXISTS "lab_slots_select_authenticated" ON public.lab_slots;
CREATE POLICY "lab_slots_select_authenticated"
  ON public.lab_slots FOR SELECT
  TO authenticated
  USING (active IS TRUE);

