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
-- Product seeds use ON CONFLICT (clinical_name) so re-runs do not duplicate rows.
-- =============================================================================

-- ========== PRODUCT CATALOG ==========
-- Supplements AND tests both live here, distinguished by product_type.
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_type TEXT NOT NULL CHECK (product_type IN ('supplement','test')),
  plain_name TEXT NOT NULL,
  plain_description TEXT,
  clinical_name TEXT NOT NULL,
  linked_finding TEXT,
  test_tier INTEGER CHECK (test_tier IN (1,2,3,4)),
  price NUMERIC NOT NULL,
  currency TEXT DEFAULT 'INR',
  requires_consent BOOLEAN DEFAULT FALSE,
  interaction_flags TEXT[],
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS products_clinical_name_key
  ON public.products (clinical_name);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_products" ON public.products;
CREATE POLICY "read_products" ON public.products
  FOR SELECT USING (true);

-- Everyone can browse the catalog. Writes stay admin-only until Phase 4.
GRANT SELECT ON public.products TO anon, authenticated;

-- ========== CART ==========
CREATE TABLE IF NOT EXISTS public.cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  quantity INTEGER DEFAULT 1 CHECK (quantity > 0),
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, product_id)
);

ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_cart" ON public.cart_items;
CREATE POLICY "own_cart" ON public.cart_items
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cart_items TO authenticated;

-- ========== ORDERS ==========
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  total_amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'INR',
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN (
    'pending','paid','failed','refunded'
  )),
  payment_provider TEXT,
  payment_ref TEXT,
  fulfilment_status TEXT DEFAULT 'awaiting_payment' CHECK (fulfilment_status IN (
    'awaiting_payment','processing','shipped','delivered','sample_collected','cancelled'
  )),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_orders" ON public.orders;
CREATE POLICY "own_orders" ON public.orders
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;

-- Day 6 — webhook looks up orders by Stripe payment intent id (payment_ref).
CREATE INDEX IF NOT EXISTS orders_payment_ref_idx
  ON public.orders (payment_ref)
  WHERE payment_ref IS NOT NULL;

-- ========== ORDER LINE ITEMS ==========
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  product_name TEXT NOT NULL,
  unit_price NUMERIC NOT NULL,
  quantity INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_order_items" ON public.order_items;
CREATE POLICY "own_order_items" ON public.order_items
  FOR ALL USING (
    auth.uid() = (SELECT user_id FROM public.orders WHERE id = order_id)
  )
  WITH CHECK (
    auth.uid() = (SELECT user_id FROM public.orders WHERE id = order_id)
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO authenticated;

-- ========== ORDER FROM CART (Day 5 fallback if RLS insert is blocked) ==========
-- Idempotent when p_payment_ref is set — safe to retry after Payment Sheet success.
CREATE OR REPLACE FUNCTION public.create_order_from_cart(
  p_cart_item_ids uuid[],
  p_total_amount numeric,
  p_currency text DEFAULT 'INR',
  p_payment_ref text DEFAULT NULL,
  p_payment_provider text DEFAULT 'stripe'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_order_id uuid;
  v_cart_id uuid;
  v_row record;
  v_computed numeric := 0;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Please sign in first.'
      USING ERRCODE = '42501';
  END IF;

  IF p_cart_item_ids IS NULL OR array_length(p_cart_item_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'Cart is empty.';
  END IF;

  -- Retry-safe: same Stripe payment intent → return existing order.
  IF p_payment_ref IS NOT NULL AND length(trim(p_payment_ref)) > 0 THEN
    SELECT id INTO v_order_id
    FROM public.orders
    WHERE user_id = v_user_id AND payment_ref = trim(p_payment_ref)
    LIMIT 1;
    IF v_order_id IS NOT NULL THEN
      RETURN v_order_id;
    END IF;
  END IF;

  -- Re-read prices from the database — never trust the phone total alone.
  FOR v_cart_id IN SELECT unnest(p_cart_item_ids)
  LOOP
    SELECT
      ci.id,
      ci.quantity,
      ci.product_id,
      p.plain_name,
      p.price,
      p.active
    INTO v_row
    FROM public.cart_items ci
    INNER JOIN public.products p ON p.id = ci.product_id
    WHERE ci.id = v_cart_id AND ci.user_id = v_user_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Some cart items were not found. Refresh your cart and try again.';
    END IF;

    IF NOT v_row.active THEN
      RAISE EXCEPTION '"%" is no longer available.', v_row.plain_name;
    END IF;

    v_computed := v_computed + (v_row.price * v_row.quantity);
  END LOOP;

  IF v_computed <= 0 THEN
    RAISE EXCEPTION 'Cart total must be greater than zero.';
  END IF;

  IF abs(v_computed - p_total_amount) > 0.01 THEN
    RAISE EXCEPTION 'Cart total changed. Refresh checkout and try again.';
  END IF;

  INSERT INTO public.orders (
    user_id,
    total_amount,
    currency,
    payment_status,
    payment_provider,
    payment_ref,
    fulfilment_status
  ) VALUES (
    v_user_id,
    v_computed,
    upper(coalesce(nullif(trim(p_currency), ''), 'INR')),
    'paid',
    coalesce(nullif(trim(p_payment_provider), ''), 'stripe'),
    nullif(trim(p_payment_ref), ''),
    'processing'
  )
  RETURNING id INTO v_order_id;

  INSERT INTO public.order_items (
    order_id,
    product_id,
    product_name,
    unit_price,
    quantity
  )
  SELECT
    v_order_id,
    ci.product_id,
    p.plain_name,
    p.price,
    ci.quantity
  FROM public.cart_items ci
  INNER JOIN public.products p ON p.id = ci.product_id
  WHERE ci.user_id = v_user_id
    AND ci.id = ANY (p_cart_item_ids);

  DELETE FROM public.cart_items
  WHERE user_id = v_user_id
    AND id = ANY (p_cart_item_ids);

  RETURN v_order_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_order_from_cart(uuid[], numeric, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_order_from_cart(uuid[], numeric, text, text, text) TO authenticated;

-- =============================================================================
-- SEED PRODUCTS (supplements + tests from the source protocol)
-- Prices are placeholder INR amounts for Phase 3 UI only.
-- Real charges always come from server-side price re-read at checkout (Day 4+).
-- =============================================================================

INSERT INTO public.products (
  product_type,
  plain_name,
  plain_description,
  clinical_name,
  linked_finding,
  test_tier,
  price,
  requires_consent,
  interaction_flags
) VALUES
  -- ---- Supplements ----
  (
    'supplement',
    'Calcium-D-glucarate',
    'Supports how your body clears used hormones through the gut.',
    'Calcium-D-glucarate',
    'Raised stool beta-glucuronidase',
    NULL,
    1299,
    FALSE,
    NULL
  ),
  (
    'supplement',
    'Liver & gut barrier support',
    'Nutrients aimed at liver detox pathways and gut-barrier repair.',
    'Liver-support and gut-barrier-repair supplementation',
    'Impaired liver detox / barrier dysfunction',
    NULL,
    1899,
    FALSE,
    NULL
  ),
  (
    'supplement',
    'Vitamin D',
    'Helps immune balance and gut-barrier support when levels are low.',
    'Vitamin D correction',
    'Positive zonulin (barrier breakage)',
    NULL,
    899,
    FALSE,
    NULL
  ),
  (
    'supplement',
    'Vitamin A',
    'Supports mucosal lining repair alongside vitamin D when needed.',
    'Vitamin A',
    'Positive zonulin (barrier breakage)',
    NULL,
    749,
    FALSE,
    NULL
  ),
  (
    'supplement',
    'Digestive enzymes',
    'Helps break down protein and fat when digestion looks impaired.',
    'Digestive enzyme supplementation',
    'Undigested protein/fat',
    NULL,
    1099,
    FALSE,
    NULL
  ),
  (
    'supplement',
    'Adaptogens',
    'Plant-based support for stress resilience and sleep quality.',
    'Adaptogens; sleep-improvement strategies',
    'Impaired adrenal resilience (cortisol)',
    NULL,
    1499,
    FALSE,
    NULL
  ),
  (
    'supplement',
    'Glutathione support',
    'Antioxidant support when toxin exposure or oxidative burden is flagged.',
    'Glutathione support',
    'Elevated toxin exposure',
    NULL,
    1699,
    FALSE,
    NULL
  ),
  (
    'supplement',
    'Iodine supplement',
    'Mineral support for thyroid — only when antibodies are not positive.',
    'Iodine supplementation (blocked if antibodies positive)',
    'Low urinary iodine (antibodies NEGATIVE)',
    NULL,
    599,
    FALSE,
    NULL
  ),
  (
    'supplement',
    'Methyl-donor support',
    'B-vitamin cofactors for methylation pathways when SNP issues are flagged.',
    'Methyl-donor supplementation',
    'Methylation-pathway SNP issues',
    NULL,
    1199,
    FALSE,
    NULL
  ),
  (
    'supplement',
    'Resveratrol',
    'Antioxidant polyphenol for general inflammatory burden.',
    'Resveratrol',
    'General inflammatory / oxidative burden',
    NULL,
    999,
    FALSE,
    NULL
  ),
  (
    'supplement',
    'Turmeric (curcumin)',
    'Anti-inflammatory botanical support.',
    'Turmeric',
    'General inflammatory / oxidative burden',
    NULL,
    849,
    FALSE,
    NULL
  ),
  (
    'supplement',
    'High-dose algal omega-3',
    'Marine omega-3 for inflammatory balance — needs a practitioner check with hormones or blood thinners.',
    'High-dose algal omega-3',
    'General inflammatory / oxidative burden',
    NULL,
    1599,
    FALSE,
    ARRAY['hormone_therapy','blood_thinners']::TEXT[]
  ),
  (
    'supplement',
    'NAC',
    'Precursor support for glutathione when oxidative burden is flagged.',
    'NAC',
    'General inflammatory / oxidative burden',
    NULL,
    949,
    FALSE,
    NULL
  ),
  (
    'supplement',
    'Soy isoflavones',
    'Phytoestrogen support when oestrogen detox pathways look impaired.',
    'Soy isoflavones',
    'Impaired oestrogen-detoxification (SNP/DUTCH)',
    NULL,
    899,
    FALSE,
    NULL
  ),
  (
    'supplement',
    'DIM / I3C',
    'Supports oestrogen metabolism — needs a practitioner check with hormones or blood thinners.',
    'DIM/I3C',
    'Impaired oestrogen-detoxification (SNP/DUTCH)',
    NULL,
    1299,
    FALSE,
    ARRAY['hormone_therapy','blood_thinners']::TEXT[]
  ),

  -- ---- Tests (Tier 1) ----
  (
    'test',
    'Inherited risk gene check',
    'Looks for inherited BRCA1/2 changes that can raise breast and ovarian cancer risk.',
    'BRCA1/2 genetic testing',
    NULL,
    1,
    24999,
    TRUE,
    NULL
  ),
  (
    'test',
    'Early cell check (blood test)',
    'Blood test for rare circulating tumour cells.',
    'Circulating tumour cell (CTC) test — liquid biopsy',
    NULL,
    1,
    18999,
    TRUE,
    NULL
  ),

  -- ---- Tests (Tier 2) ----
  (
    'test',
    'Personal genetics panel',
    'Reads SNP variations affecting hormones and toxin handling.',
    'SNP risk-modification panel (buccal/saliva swab)',
    NULL,
    2,
    14999,
    TRUE,
    NULL
  ),

  -- ---- Tests (Tier 3 baseline) ----
  (
    'test',
    'Routine bloods',
    'Standard baseline blood panel.',
    'Routine bloods (baseline panel)',
    NULL,
    3,
    3499,
    FALSE,
    NULL
  ),
  (
    'test',
    'Thyroid check',
    'TSH, Free T3, Free T4 plus thyroid antibodies.',
    'Thyroid function (TSH, Free T3, Free T4) + antibodies (TPOAb, TgAb)',
    NULL,
    3,
    4299,
    FALSE,
    NULL
  ),
  (
    'test',
    'Energy & iron levels',
    'Active B12, folate, and ferritin.',
    'Active B12, folate, ferritin',
    NULL,
    3,
    3799,
    FALSE,
    NULL
  ),
  (
    'test',
    'Blood sugar handling',
    'Fasting insulin after an overnight fast.',
    'Fasting insulin',
    NULL,
    3,
    1299,
    FALSE,
    NULL
  ),
  (
    'test',
    'Stress hormone rhythm',
    'Salivary cortisol across the day.',
    'Salivary cortisol (adrenal reserve)',
    NULL,
    3,
    4999,
    FALSE,
    NULL
  ),

  -- ---- Tests (Tier 4) ----
  (
    'test',
    'Iodine level',
    'Urinary iodine — only when thyroid antibodies are not positive.',
    'Urinary iodine',
    NULL,
    4,
    2999,
    FALSE,
    NULL
  ),
  (
    'test',
    'Gut health check',
    'Stool beta-glucuronidase, microbial diversity, and zonulin.',
    'Stool beta-glucuronidase, microbial diversity & zonulin',
    NULL,
    4,
    8999,
    FALSE,
    NULL
  ),
  (
    'test',
    'Toxic metal exposure',
    'Heavy metal exposure panel.',
    'Heavy metal exposure panel',
    NULL,
    4,
    7999,
    FALSE,
    NULL
  ),
  (
    'test',
    'Detailed hormone map',
    'DUTCH dried urine hormone profile.',
    'DUTCH — Dried Urine Test for Comprehensive Hormones',
    NULL,
    4,
    14999,
    FALSE,
    NULL
  ),
  (
    'test',
    'Detox pathway reading',
    'CYP450 liver-enzyme functional assessment.',
    'CYP450 liver-enzyme functional assessment',
    NULL,
    4,
    9999,
    FALSE,
    NULL
  )
ON CONFLICT (clinical_name) DO UPDATE SET
  product_type = EXCLUDED.product_type,
  plain_name = EXCLUDED.plain_name,
  plain_description = EXCLUDED.plain_description,
  linked_finding = EXCLUDED.linked_finding,
  test_tier = EXCLUDED.test_tier,
  price = EXCLUDED.price,
  currency = EXCLUDED.currency,
  requires_consent = EXCLUDED.requires_consent,
  interaction_flags = EXCLUDED.interaction_flags,
  active = EXCLUDED.active;
