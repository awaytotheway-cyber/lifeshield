-- PRESCOPE — labs + booking (Phase D)
--
-- Adds a labs library, extends lab_orders with booking fields, and adds
-- location fields to profiles so lib/lab-search can rank labs by proximity.
--
-- No PostGIS — proximity uses country + postcode (exact / prefix) rather
-- than lat/lng. If PostGIS lands on the Supabase project later, a follow-up
-- migration can add `coords geography(point)` and lib/lab-search grows a
-- distance-sorted tier without breaking existing rows.
--
-- HOW TO USE
-- 1. Open Supabase → SQL Editor → New query
-- 2. Paste this whole file and click Run
-- 3. Safe to re-run (IF NOT EXISTS / additive columns only)

-- ========== PROFILE LOCATION FIELDS ==========
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS location_postcode TEXT,
  ADD COLUMN IF NOT EXISTS location_country TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_location_country_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_location_country_check
      CHECK (
        location_country IS NULL
        OR location_country ~ '^[A-Z]{2}$'
      );
  END IF;
END $$;

COMMENT ON COLUMN public.profiles.location_postcode IS
  'User-entered postcode / ZIP. Free-form so international formats work; lib/lab-search normalises before comparing.';
COMMENT ON COLUMN public.profiles.location_country IS
  'ISO 3166-1 alpha-2 country code, uppercase. Constrains the labs lib/lab-search returns to the user''s country.';

-- ========== LABS ==========
CREATE TABLE IF NOT EXISTS public.labs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Vendor code for the fulfilment side. 'manual' means the admin does the
  -- coordination out-of-band; a live provider maps to whatever lib/lab-provider
  -- knows how to talk to.
  provider_code TEXT NOT NULL DEFAULT 'manual',

  name TEXT NOT NULL,

  -- Full structured address: { street, city, region, postcode, country }.
  address JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Denormalised for indexed lookup + lib/lab-search filtering. Both are
  -- optional so a lab that supports mail-in only (no physical address) can
  -- still list.
  postcode TEXT,
  country TEXT,

  -- Currency + optional headline price so the list can show a quick figure
  -- alongside the lab name. Per-test prices live in the products catalogue.
  price NUMERIC,
  currency TEXT NOT NULL DEFAULT 'INR',

  -- { home_collection: bool, walk_in: bool, mail_kit: bool, slots: string[] }
  availability JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- { phone, email, website }
  contact JSONB NOT NULL DEFAULT '{}'::jsonb,

  active BOOLEAN NOT NULL DEFAULT TRUE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'labs_country_check'
  ) THEN
    ALTER TABLE public.labs
      ADD CONSTRAINT labs_country_check
      CHECK (country IS NULL OR country ~ '^[A-Z]{2}$');
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS labs_country_postcode_active_idx
  ON public.labs (country, postcode)
  WHERE active = TRUE;

ALTER TABLE public.labs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_labs" ON public.labs;
CREATE POLICY "read_labs" ON public.labs
  FOR SELECT USING (auth.role() = 'authenticated');

GRANT SELECT ON public.labs TO authenticated;

COMMENT ON TABLE public.labs IS
  'Bookable lab / clinic library. Read by any authenticated account; writes gated by admin policy (see 20260926_labs_admin_policies.sql).';

-- ========== LAB ORDERS — BOOKING FIELDS ==========
ALTER TABLE public.lab_orders
  ADD COLUMN IF NOT EXISTS lab_id UUID REFERENCES public.labs(id)
    ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS booking_slot_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS booking_confirmation TEXT,
  ADD COLUMN IF NOT EXISTS preparation_instructions TEXT;

CREATE INDEX IF NOT EXISTS lab_orders_lab_idx
  ON public.lab_orders (lab_id)
  WHERE lab_id IS NOT NULL;

COMMENT ON COLUMN public.lab_orders.lab_id IS
  'Which lab is fulfilling this booking. Null for legacy rows created before Phase D or for lab_orders driven by store purchases with no physical booking.';
COMMENT ON COLUMN public.lab_orders.booking_slot_at IS
  'Slot the user chose. Optional — kit dispatch or walk-in orders may leave this null.';
COMMENT ON COLUMN public.lab_orders.booking_confirmation IS
  'Free-form confirmation string from the lab (reference number, booking id).';
COMMENT ON COLUMN public.lab_orders.preparation_instructions IS
  'Fasting / abstain instructions the lab sent through. Displayed on the confirmation screen.';
