-- PRESCOPE — recipes library + per-user favorites (Phase C)
--
-- Library content: read for any signed-in account, write by admin only
-- (see 20260926_recipes_admin_policies.sql).
-- Favorites are per-user with RLS.
--
-- HOW TO USE
-- 1. Open Supabase → SQL Editor → New query
-- 2. Paste this whole file and click Run
-- 3. Safe to re-run (IF NOT EXISTS / additive only)

-- ========== RECIPES ==========
CREATE TABLE IF NOT EXISTS public.recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Stable slug for deep-linking without exposing UUIDs in URLs.
  slug TEXT NOT NULL UNIQUE,

  name TEXT NOT NULL,
  description TEXT,

  -- [{name, amount, unit, note}]. Kept as jsonb so a future ingredient →
  -- product SKU bridge can add matched_product_id per entry without a schema
  -- change.
  ingredients JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- [{step: n, text: "…"}] or ["…", "…"]. lib/recipes parses both shapes.
  instructions JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- {calories, protein_g, carbs_g, fat_g, fiber_g}. Approximate per serving.
  nutrition JSONB NOT NULL DEFAULT '{}'::jsonb,

  tags TEXT[] NOT NULL DEFAULT '{}',

  prep_minutes INTEGER,
  cook_minutes INTEGER,
  servings INTEGER,

  image_url TEXT,

  active BOOLEAN NOT NULL DEFAULT TRUE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS recipes_active_idx
  ON public.recipes (active, name);
CREATE INDEX IF NOT EXISTS recipes_tags_idx
  ON public.recipes USING gin (tags);

ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

-- Any authenticated account reads the library.
DROP POLICY IF EXISTS "read_recipes" ON public.recipes;
CREATE POLICY "read_recipes" ON public.recipes
  FOR SELECT USING (auth.role() = 'authenticated');

GRANT SELECT ON public.recipes TO authenticated;

COMMENT ON TABLE public.recipes IS
  'Curated recipe library. Read via lib/recipes-io. Write policy in a separate migration so admin CRUD can ship independently.';

-- ========== RECIPE FAVORITES ==========
CREATE TABLE IF NOT EXISTS public.recipe_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, recipe_id)
);

CREATE INDEX IF NOT EXISTS recipe_favorites_user_idx
  ON public.recipe_favorites (user_id, created_at DESC);

ALTER TABLE public.recipe_favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_recipe_favorites" ON public.recipe_favorites;
CREATE POLICY "own_recipe_favorites" ON public.recipe_favorites
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, DELETE ON public.recipe_favorites TO authenticated;

COMMENT ON TABLE public.recipe_favorites IS
  'Per-user recipe favorites. Toggle via lib/recipes-io; UNIQUE(user_id, recipe_id) keeps the toggle idempotent.';
