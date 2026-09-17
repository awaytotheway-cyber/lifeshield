-- ============================================================================
-- PRESCOPE Phase 5 booking — PART 3 of 7: bookings table + RLS policies
-- Paste this whole block into a NEW Supabase SQL Editor query and click Run
-- before moving on to part 4. Do not mix parts in one paste.
-- Full combined file: supabase/phase5-booking.sql
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 4. BOOKINGS — the patient's appointment or home kit
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Links back to the fulfilment row created after payment (Phase 4 Day 5).
  lab_order_id UUID REFERENCES public.lab_orders(id) ON DELETE SET NULL,
  -- The recommended test this booking is for, when we know it.
  test_order_id UUID REFERENCES public.test_orders(id) ON DELETE SET NULL,
  slot_id UUID REFERENCES public.lab_slots(id) ON DELETE SET NULL,
  clinic_id UUID REFERENCES public.clinics(id) ON DELETE SET NULL,
  kind TEXT NOT NULL CHECK (kind IN ('clinic', 'home_kit')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'sample_taken', 'cancelled', 'no_show', 'expired')),
  scheduled_for TIMESTAMPTZ,
  -- Home kit delivery only.
  address_line TEXT,
  postcode TEXT,
  -- Set when the patient confirms they have read the preparation steps.
  -- We do not take payment for a fasting test until this is set.
  prep_ack_at TIMESTAMPTZ,
  -- Snapshot of the prep steps they acknowledged, so the record is honest
  -- even if the catalog copy changes later.
  prep_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
  external_ref TEXT,
  notes TEXT,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS bookings_user_idx
  ON public.bookings (user_id, scheduled_for DESC);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- A patient sees and changes only their own bookings.
DROP POLICY IF EXISTS "bookings_select_own" ON public.bookings;
CREATE POLICY "bookings_select_own"
  ON public.bookings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "bookings_insert_own" ON public.bookings;
CREATE POLICY "bookings_insert_own"
  ON public.bookings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "bookings_update_own" ON public.bookings;
CREATE POLICY "bookings_update_own"
  ON public.bookings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

