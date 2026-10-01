-- PRESCOPE — Store expansion (feature #6)
--
-- Broadens product_type beyond supplement/test, adds a free category
-- string, and an attributes JSONB for type-specific fields
-- (ingredients for beauty, allergens for food, materials for home_goods).
--
-- HOW TO USE: paste into Supabase → SQL Editor → Run (idempotent).

DO $$ BEGIN
  ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_product_type_check;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS attributes JSONB;

DO $$ BEGIN
  ALTER TABLE public.products
    ADD CONSTRAINT products_product_type_check
    CHECK (product_type IS NULL OR product_type IN (
      'supplement','test','food','home_goods','beauty','cleaning'
    ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS products_type_idx ON public.products (product_type);
CREATE INDEX IF NOT EXISTS products_category_idx ON public.products (category);
