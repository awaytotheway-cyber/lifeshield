-- PRESCOPE — Curated healthy recipes (feature #4)
--
-- recipes            — library of curated recipes; read by any signed-in
--                       user, only admin staff can add/edit.
-- user_saved_recipes — a user's personal favourites (idempotent).
--
-- HOW TO USE
-- 1. Open Supabase → SQL Editor → New query
-- 2. Paste this whole file and click Run
-- 3. Safe to re-run (IF NOT EXISTS / ON CONFLICT).

CREATE TABLE IF NOT EXISTS public.recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  prep_min INTEGER NOT NULL DEFAULT 10 CHECK (prep_min >= 0),
  cook_min INTEGER NOT NULL DEFAULT 0 CHECK (cook_min >= 0),
  servings INTEGER NOT NULL DEFAULT 2 CHECK (servings > 0),
  ingredients JSONB NOT NULL DEFAULT '[]',
  instructions JSONB NOT NULL DEFAULT '[]',
  nutrition JSONB,
  goal_types TEXT[] NOT NULL DEFAULT '{}',
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS recipes_goal_types_idx ON public.recipes USING GIN (goal_types);
CREATE INDEX IF NOT EXISTS recipes_tags_idx ON public.recipes USING GIN (tags);

ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "recipes_read" ON public.recipes;
CREATE POLICY "recipes_read" ON public.recipes
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "recipes_admin_write" ON public.recipes;
CREATE POLICY "recipes_admin_write" ON public.recipes
  FOR ALL USING (public.is_admin_staff()) WITH CHECK (public.is_admin_staff());

GRANT SELECT ON TABLE public.recipes TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.recipes TO authenticated;

CREATE TABLE IF NOT EXISTS public.user_saved_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, recipe_id)
);

CREATE INDEX IF NOT EXISTS user_saved_recipes_user_idx ON public.user_saved_recipes (user_id);

ALTER TABLE public.user_saved_recipes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_saved_recipes" ON public.user_saved_recipes;
CREATE POLICY "own_saved_recipes" ON public.user_saved_recipes
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, DELETE ON public.user_saved_recipes TO anon, authenticated;

-- Seed (idempotent on name). Content also lives in the applied migration
-- on the live project — keep the two in sync if you edit.
CREATE UNIQUE INDEX IF NOT EXISTS recipes_seed_unique ON public.recipes (name);
-- (Seed rows omitted from committed file for brevity; see the LifeShield
-- project migration named 'recipes' for the full curated set.)
