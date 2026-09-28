-- PRESCOPE — Plugin catalogue + per-user toggles (feature #8)
-- Applied to the LifeShield project; seed of 6 plugins included.

CREATE TABLE IF NOT EXISTS public.plugins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'data_import','content_recommendation','social','notifications','integrations','other'
  )),
  description TEXT NOT NULL,
  privacy_disclosure TEXT NOT NULL,
  provider TEXT,
  homepage_url TEXT,
  logo_url TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.plugins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "plugins_read" ON public.plugins;
CREATE POLICY "plugins_read" ON public.plugins FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "plugins_admin_write" ON public.plugins;
CREATE POLICY "plugins_admin_write" ON public.plugins FOR ALL
  USING (public.is_admin_staff()) WITH CHECK (public.is_admin_staff());
GRANT SELECT ON public.plugins TO anon, authenticated;

CREATE TABLE IF NOT EXISTS public.enabled_plugins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plugin_id UUID NOT NULL REFERENCES public.plugins(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  usage_count INTEGER NOT NULL DEFAULT 0,
  meta JSONB,
  enabled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  disabled_at TIMESTAMPTZ,
  UNIQUE (user_id, plugin_id)
);
ALTER TABLE public.enabled_plugins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_enabled_plugins" ON public.enabled_plugins;
CREATE POLICY "own_enabled_plugins" ON public.enabled_plugins FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.enabled_plugins TO anon, authenticated;
