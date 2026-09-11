-- =============================================================================
-- Phase 4 Day 5 — lab order fulfilment after store payment
-- Paste into Supabase → SQL Editor → Run.
-- Safe to run more than once (idempotent).
--
-- What this adds:
--   • pending_manual status + store_order_id / order_item_id on lab_orders
--   • create_lab_orders_for_store_order() — mobile app SQL fallback
--   • update_lab_order_status() — admin / clinic_staff status updates
--
-- The mobile app tries the create-lab-order Edge Function first, then this RPC.
-- =============================================================================

-- ----- lab_orders columns + status values -----
ALTER TABLE public.lab_orders
  ADD COLUMN IF NOT EXISTS store_order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL;

ALTER TABLE public.lab_orders
  ADD COLUMN IF NOT EXISTS order_item_id UUID REFERENCES public.order_items(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS lab_orders_store_order_id_idx
  ON public.lab_orders (store_order_id)
  WHERE store_order_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS lab_orders_store_item_unique
  ON public.lab_orders (store_order_id, order_item_id)
  WHERE store_order_id IS NOT NULL AND order_item_id IS NOT NULL;

ALTER TABLE public.lab_orders DROP CONSTRAINT IF EXISTS lab_orders_status_check;
ALTER TABLE public.lab_orders ADD CONSTRAINT lab_orders_status_check CHECK (
  status IN (
    'pending_manual',
    'created',
    'kit_dispatched',
    'sample_received',
    'processing',
    'resulted',
    'cancelled'
  )
);

COMMENT ON COLUMN public.lab_orders.store_order_id IS
  'Phase 3 store order that paid for this lab fulfilment row.';
COMMENT ON COLUMN public.lab_orders.order_item_id IS
  'Specific order_items line — one lab_orders row per paid test line.';

-- Map catalog clinical_name → rules-engine test_name key (mirrors lib/lab-provider.ts).
CREATE OR REPLACE FUNCTION public.product_clinical_name_to_test_name(p_clinical_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE lower(trim(COALESCE(p_clinical_name, '')))
    WHEN 'brca1/2 genetic testing' THEN 'brca'
    WHEN 'circulating tumour cell (ctc) test — liquid biopsy' THEN 'ctc'
    WHEN 'snp risk-modification panel (buccal/saliva swab)' THEN 'snp'
    WHEN 'routine bloods (baseline panel)' THEN 'routineBloods'
    WHEN 'thyroid function (tsh, free t3, free t4) + antibodies (tpoab, tgab)' THEN 'thyroid'
    WHEN 'active b12, folate, ferritin' THEN 'b12FolateFerritin'
    WHEN 'fasting insulin' THEN 'fastingInsulin'
    WHEN 'salivary cortisol (adrenal reserve)' THEN 'salivaryCortisol'
    WHEN 'urinary iodine' THEN 'urinaryIodine'
    WHEN 'stool beta-glucuronidase, microbial diversity & zonulin' THEN 'stool'
    WHEN 'heavy metal exposure panel' THEN 'heavyMetals'
    WHEN 'dutch — dried urine test for comprehensive hormones' THEN 'dutch'
    WHEN 'cyp450 liver-enzyme functional assessment' THEN 'cyp450'
    ELSE NULL
  END;
$$;

-- Create lab_orders rows for every test product on a paid store order (idempotent).
CREATE OR REPLACE FUNCTION public.create_lab_orders_for_store_order(
  p_store_order_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_payment_status text;
  v_item record;
  v_qty integer;
  v_i integer;
  v_test_name text;
  v_test_order_id uuid;
  v_lab_order_id uuid;
  v_external_id text;
  v_created_ids uuid[] := ARRAY[]::uuid[];
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Please sign in first.'
      USING ERRCODE = '42501';
  END IF;

  SELECT o.user_id, o.payment_status
  INTO v_user_id, v_payment_status
  FROM public.orders o
  WHERE o.id = p_store_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Store order not found.';
  END IF;

  IF v_user_id <> auth.uid() AND NOT public.is_admin_staff() THEN
    RAISE EXCEPTION 'You can only create lab orders for your own store orders.'
      USING ERRCODE = '42501';
  END IF;

  IF v_payment_status NOT IN ('paid', 'pending') THEN
    RAISE EXCEPTION 'Lab orders are only created for paid store orders.';
  END IF;

  FOR v_item IN
    SELECT
      oi.id AS order_item_id,
      oi.quantity,
      p.clinical_name,
      p.test_tier,
      p.product_type
    FROM public.order_items oi
    INNER JOIN public.products p ON p.id = oi.product_id
    WHERE oi.order_id = p_store_order_id
      AND p.product_type = 'test'
  LOOP
    v_qty := GREATEST(COALESCE(v_item.quantity, 1), 1);
    v_test_name := public.product_clinical_name_to_test_name(v_item.clinical_name);

    FOR v_i IN 1..v_qty LOOP
      IF EXISTS (
        SELECT 1
        FROM public.lab_orders lo
        WHERE lo.store_order_id = p_store_order_id
          AND lo.order_item_id = v_item.order_item_id
      ) THEN
        CONTINUE;
      END IF;

      v_test_order_id := NULL;
      IF v_test_name IS NOT NULL THEN
        SELECT t.id
        INTO v_test_order_id
        FROM public.test_orders t
        WHERE t.user_id = v_user_id
          AND t.test_name = v_test_name
          AND (v_item.test_tier IS NULL OR t.test_tier = v_item.test_tier)
          AND t.status IN ('recommended', 'ordered')
          AND NOT EXISTS (
            SELECT 1
            FROM public.lab_orders lo2
            WHERE lo2.test_order_id = t.id
              AND lo2.status <> 'cancelled'
          )
        ORDER BY t.created_at ASC
        LIMIT 1;
      END IF;

      v_external_id := 'MANUAL-' || replace(v_item.order_item_id::text, '-', '');

      INSERT INTO public.lab_orders (
        user_id,
        store_order_id,
        order_item_id,
        test_order_id,
        lab_provider,
        external_order_id,
        status,
        updated_at
      )
      VALUES (
        v_user_id,
        p_store_order_id,
        v_item.order_item_id,
        v_test_order_id,
        'manual',
        v_external_id,
        'pending_manual',
        NOW()
      )
      RETURNING id INTO v_lab_order_id;

      v_created_ids := array_append(v_created_ids, v_lab_order_id);

      IF v_test_order_id IS NOT NULL THEN
        UPDATE public.test_orders
        SET status = 'ordered'
        WHERE id = v_test_order_id
          AND status = 'recommended';
      END IF;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object(
    'created_count', COALESCE(array_length(v_created_ids, 1), 0),
    'lab_order_ids', to_jsonb(v_created_ids)
  );
END;
$$;

-- Admin / clinic_staff update fulfilment status on a lab order row.
CREATE OR REPLACE FUNCTION public.update_lab_order_status(
  p_lab_order_id uuid,
  p_status text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
  v_row public.lab_orders%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Please sign in first.'
      USING ERRCODE = '42501';
  END IF;

  IF NOT public.is_admin_staff() AND NOT public.is_clinic_staff_role() THEN
    RAISE EXCEPTION 'Only admin or clinic staff can update lab order status.'
      USING ERRCODE = '42501';
  END IF;

  v_status := lower(trim(COALESCE(p_status, '')));
  IF v_status NOT IN (
    'pending_manual', 'created', 'kit_dispatched', 'sample_received',
    'processing', 'resulted', 'cancelled'
  ) THEN
    RAISE EXCEPTION 'Invalid lab order status: %', v_status;
  END IF;

  SELECT * INTO v_row
  FROM public.lab_orders
  WHERE id = p_lab_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lab order not found.';
  END IF;

  UPDATE public.lab_orders
  SET status = v_status, updated_at = NOW()
  WHERE id = p_lab_order_id;

  RETURN jsonb_build_object(
    'lab_order_id', p_lab_order_id,
    'status', v_status
  );
END;
$$;

REVOKE ALL ON FUNCTION public.product_clinical_name_to_test_name(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_lab_orders_for_store_order(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_lab_order_status(uuid, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.product_clinical_name_to_test_name(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_lab_orders_for_store_order(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_lab_order_status(uuid, text) TO authenticated;
