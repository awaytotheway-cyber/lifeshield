-- PRESCOPE — genetic testing catalog + orders + results (Phase F)
--
-- Three tables land now so admin can seed a catalogue and users can raise
-- pending_manual orders. The result-ingestion webhook + Stripe payment
-- integration wait on a signed partner contract (plan §18 Q2 / Q6).
--
-- HOW TO USE
-- 1. Open Supabase → SQL Editor → New query
-- 2. Paste this whole file and click Run
-- 3. Safe to re-run (IF NOT EXISTS)

-- ========== GENETIC TESTS ==========
-- Library of orderable panels. Admin-managed via CRUD (follow-up slice).
CREATE TABLE IF NOT EXISTS public.genetic_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  provider_code TEXT NOT NULL DEFAULT 'manual',

  name TEXT NOT NULL,
  description TEXT,

  sample_type TEXT NOT NULL
    CHECK (sample_type IN ('saliva','buccal_swab','blood_dbs','stool','other')),

  price NUMERIC,
  currency TEXT NOT NULL DEFAULT 'INR',

  -- Expected turnaround so the order screen can set expectations.
  turnaround_days INTEGER,

  -- { includes: ['MTHFR', 'COMT', ...] } — free-form so admin can describe a
  -- panel without a schema change per test.
  panel_details JSONB NOT NULL DEFAULT '{}'::jsonb,

  active BOOLEAN NOT NULL DEFAULT TRUE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS genetic_tests_active_idx
  ON public.genetic_tests (active, name);

ALTER TABLE public.genetic_tests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_genetic_tests" ON public.genetic_tests;
CREATE POLICY "read_genetic_tests" ON public.genetic_tests
  FOR SELECT USING (auth.role() = 'authenticated');

GRANT SELECT ON public.genetic_tests TO authenticated;

COMMENT ON TABLE public.genetic_tests IS
  'Bookable genetic panels. Read by any authenticated account; writes gated by the admin policy in 20260926_genetic_tests_admin_policies.sql.';

-- ========== GENETIC TEST ORDERS ==========
CREATE TABLE IF NOT EXISTS public.genetic_test_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  genetic_test_id UUID NOT NULL REFERENCES public.genetic_tests(id),

  -- Same vocabulary as public.lab_orders so downstream tracking / analytics
  -- can share formatting helpers.
  status TEXT NOT NULL DEFAULT 'pending_manual'
    CHECK (status IN (
      'pending_manual',
      'created',
      'kit_dispatched',
      'sample_received',
      'processing',
      'resulted',
      'cancelled'
    )),

  tracking TEXT,

  -- { name, line1, line2?, city, region?, postcode, country }
  shipping_address JSONB NOT NULL DEFAULT '{}'::jsonb,

  notes TEXT,

  ordered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS genetic_test_orders_user_status_idx
  ON public.genetic_test_orders (user_id, status);

ALTER TABLE public.genetic_test_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_genetic_test_orders" ON public.genetic_test_orders;
CREATE POLICY "own_genetic_test_orders" ON public.genetic_test_orders
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.genetic_test_orders TO authenticated;

COMMENT ON TABLE public.genetic_test_orders IS
  'Per-user genetic panel requests. status defaults to pending_manual until a partner webhook flips it.';

-- ========== GENETIC TEST RESULTS ==========
-- Container only for now — the concrete `structured` shape lands with the
-- partner contract. raw_report holds whatever the vendor sent, unmodified.
CREATE TABLE IF NOT EXISTS public.genetic_test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.genetic_test_orders(id) ON DELETE CASCADE,
  -- Denormalised so RLS can key on the caller without a join.
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  raw_report JSONB NOT NULL DEFAULT '{}'::jsonb,
  structured JSONB NOT NULL DEFAULT '{}'::jsonb,

  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS genetic_test_results_order_idx
  ON public.genetic_test_results (order_id);
CREATE INDEX IF NOT EXISTS genetic_test_results_user_idx
  ON public.genetic_test_results (user_id, received_at DESC);

ALTER TABLE public.genetic_test_results ENABLE ROW LEVEL SECURITY;

-- Users read their own results. Writes come from a service-role webhook
-- (a later slice) — no client-side insert path today.
DROP POLICY IF EXISTS "own_genetic_test_results_read"
  ON public.genetic_test_results;
CREATE POLICY "own_genetic_test_results_read" ON public.genetic_test_results
  FOR SELECT USING (auth.uid() = user_id);

GRANT SELECT ON public.genetic_test_results TO authenticated;

COMMENT ON TABLE public.genetic_test_results IS
  'Per-user genetic panel results. Written by the (future) partner webhook using a service-role key; the client-side policy is read-only.';
