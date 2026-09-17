-- ============================================================================
-- PRESCOPE — Phase 5, Wave A: Guided test booking
--
-- Run this whole file in the Supabase SQL Editor (Dashboard → SQL → New query).
-- It is safe to run more than once: every statement is IF NOT EXISTS / OR REPLACE.
--
-- What it adds, in plain English:
--   1. Extra columns on `clinics` so we can show distance and opening info.
--   2. Extra columns on `products` so a test can carry its preparation rules
--      (fasting, medication timing, cycle day) — these are safety-critical.
--   3. `lab_slots`  — the appointment times a clinic has available.
--   4. `bookings`   — the appointment (or home kit) a patient has taken.
--   5. `book_lab_slot()` — books a slot atomically so two people cannot take
--      the same one, and `cancel_booking()` which frees it again.
--
-- Security model: a patient can only ever see and change their OWN bookings.
-- Slots are readable by any signed-in user but only staff/service role can
-- write them (they are synced from the lab providers, never by the phone).
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

-- ---------------------------------------------------------------------------
-- 5. BOOK A SLOT ATOMICALLY
--    Re-checks availability inside the transaction and locks the slot row, so
--    two people tapping "Confirm" at the same second cannot both get it.
--    Returns JSON the app can read: { ok, booking_id, reason }.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.book_lab_slot(
  p_slot_id UUID,
  p_lab_order_id UUID DEFAULT NULL,
  p_test_order_id UUID DEFAULT NULL,
  p_prep_snapshot JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_slot public.lab_slots%ROWTYPE;
  v_booking_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_signed_in');
  END IF;

  -- Lock this one slot row until the transaction ends.
  SELECT * INTO v_slot
  FROM public.lab_slots
  WHERE id = p_slot_id
  FOR UPDATE;

  IF NOT FOUND OR v_slot.active IS NOT TRUE THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'slot_missing');
  END IF;

  IF v_slot.starts_at <= NOW() THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'slot_past');
  END IF;

  IF v_slot.booked_count >= v_slot.capacity THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'slot_taken');
  END IF;

  UPDATE public.lab_slots
  SET booked_count = booked_count + 1
  WHERE id = v_slot.id;

  INSERT INTO public.bookings (
    user_id, lab_order_id, test_order_id, slot_id, clinic_id,
    kind, status, scheduled_for, prep_ack_at, prep_snapshot
  )
  VALUES (
    v_user_id, p_lab_order_id, p_test_order_id, v_slot.id, v_slot.clinic_id,
    'clinic', 'confirmed', v_slot.starts_at, NOW(), COALESCE(p_prep_snapshot, '[]'::jsonb)
  )
  RETURNING id INTO v_booking_id;

  RETURN jsonb_build_object('ok', true, 'booking_id', v_booking_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.book_lab_slot(UUID, UUID, UUID, JSONB) TO authenticated;

-- ---------------------------------------------------------------------------
-- 6. CANCEL — frees the slot back up for someone else
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cancel_booking(p_booking_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_booking public.bookings%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_signed_in');
  END IF;

  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id AND user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'booking_missing');
  END IF;

  IF v_booking.status IN ('cancelled', 'sample_taken') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_cancellable');
  END IF;

  UPDATE public.bookings
  SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW()
  WHERE id = v_booking.id;

  IF v_booking.slot_id IS NOT NULL THEN
    UPDATE public.lab_slots
    SET booked_count = GREATEST(booked_count - 1, 0)
    WHERE id = v_booking.slot_id;
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_booking(UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- 7. NEARBY CLINICS — what the "choose a lab" screen reads
--    Matches on postcode area when we have no coordinates, and always returns
--    the next available slot time so the card can show it.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.clinics_with_next_slot(p_postcode_area TEXT DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  name TEXT,
  address TEXT,
  city TEXT,
  postcode TEXT,
  postcode_area TEXT,
  offers_home_collection BOOLEAN,
  operating_hours TEXT,
  next_slot_at TIMESTAMPTZ,
  open_slot_count BIGINT,
  from_price_cents INT
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    c.id,
    c.name,
    c.address,
    c.city,
    c.postcode,
    c.postcode_area,
    COALESCE(c.offers_home_collection, FALSE) AS offers_home_collection,
    c.operating_hours,
    MIN(s.starts_at) AS next_slot_at,
    COUNT(s.id) AS open_slot_count,
    MIN(s.price_cents) AS from_price_cents
  FROM public.clinics c
  LEFT JOIN public.lab_slots s
    ON s.clinic_id = c.id
   AND s.active IS TRUE
   AND s.starts_at > NOW()
   AND s.booked_count < s.capacity
  WHERE c.active IS TRUE
    AND (
      p_postcode_area IS NULL
      OR c.postcode_area IS NULL
      OR UPPER(c.postcode_area) = UPPER(p_postcode_area)
    )
  GROUP BY c.id
  ORDER BY (MIN(s.starts_at) IS NULL), MIN(s.starts_at) ASC, c.name ASC;
$$;

GRANT EXECUTE ON FUNCTION public.clinics_with_next_slot(TEXT) TO authenticated;

-- ---------------------------------------------------------------------------
-- 8. Keep updated_at honest on bookings
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.touch_bookings_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bookings_touch_updated_at ON public.bookings;
CREATE TRIGGER bookings_touch_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.touch_bookings_updated_at();
