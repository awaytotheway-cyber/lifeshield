-- PRESCOPE — supplements v2 (Phase E)
--
-- Extends the products catalogue with the fields Phase E needs to render
-- richer supplement detail (contraindications, studies, subscription options)
-- and introduces a per-user medications table so contraindication matching
-- has a data source. The rules-engine integration + Stripe Subscriptions
-- wiring land in later slices — the columns are populated now so admin can
-- author against them.
--
-- HOW TO USE
-- 1. Open Supabase → SQL Editor → New query
-- 2. Paste this whole file and click Run
-- 3. Safe to re-run (IF NOT EXISTS / additive columns only)

-- ========== PRODUCTS — SUPPLEMENT METADATA ==========
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS contraindication_codes TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS subscription_options JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS supporting_studies JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.products.contraindication_codes IS
  'Tags such as "hormones", "blood_thinners". lib/supplements matches these against public.medications.contraindication_codes at render time.';
COMMENT ON COLUMN public.products.subscription_options IS
  '{ intervals: ["monthly","quarterly"], discount_percent: number } — read-only in Phase E (no cart plumbing yet).';
COMMENT ON COLUMN public.products.supporting_studies IS
  'Array of { title, url, source, year? } citations rendered in the product detail.';

-- ========== MEDICATIONS ==========
-- Per-user list of active medications + supplements they're already on.
-- Tags in contraindication_codes are what the product-side match keys on.
CREATE TABLE IF NOT EXISTS public.medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  dosage TEXT,
  frequency TEXT,
  start_date DATE,
  end_date DATE,
  notes TEXT,

  -- Free-form tags; e.g. an oral contraceptive would carry ['hormones'].
  -- Admin CRUD (later slice) will curate a canonical list; for now users can
  -- populate directly via the medications screen (also a later slice).
  contraindication_codes TEXT[] NOT NULL DEFAULT '{}',

  active BOOLEAN NOT NULL DEFAULT TRUE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS medications_user_active_idx
  ON public.medications (user_id, active);

ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_medications" ON public.medications;
CREATE POLICY "own_medications" ON public.medications
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.medications TO authenticated;

COMMENT ON TABLE public.medications IS
  'Per-user medication + supplement register. Feeds lib/supplements contraindication matching. Admin CRUD ships in a follow-up slice.';
