-- PRESCOPE — Partner apps + daily activities (feature #5, v1)
--
-- v1 ships partner cards, opt-in linking, and a manual activity log
-- for meditation / exercise. Real SDK data-sync happens later when
-- partnerships are in place; the schema is ready for source='partner'.
--
-- HOW TO USE: paste into Supabase → SQL Editor → Run (idempotent).

CREATE TABLE IF NOT EXISTS public.partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('meditation','exercise','sleep','nutrition','other')),
  description TEXT,
  deep_link TEXT,
  web_url TEXT,
  ios_bundle_id TEXT,
  android_package TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "partners_read" ON public.partners;
CREATE POLICY "partners_read" ON public.partners FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "partners_admin_write" ON public.partners;
CREATE POLICY "partners_admin_write" ON public.partners FOR ALL
  USING (public.is_admin_staff()) WITH CHECK (public.is_admin_staff());
GRANT SELECT ON TABLE public.partners TO anon, authenticated;

CREATE TABLE IF NOT EXISTS public.user_partner_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'linked' CHECK (status IN ('linked','disconnected')),
  connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  disconnected_at TIMESTAMPTZ,
  meta JSONB,
  UNIQUE (user_id, partner_id)
);
ALTER TABLE public.user_partner_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_partner_links" ON public.user_partner_links;
CREATE POLICY "own_partner_links" ON public.user_partner_links FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_partner_links TO anon, authenticated;

CREATE TABLE IF NOT EXISTS public.daily_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'meditation','walk','run','strength','yoga','cycle','swim','sleep','other'
  )),
  duration_min INTEGER CHECK (duration_min IS NULL OR duration_min >= 0),
  intensity TEXT CHECK (intensity IS NULL OR intensity IN ('easy','moderate','hard')),
  notes TEXT,
  performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','partner')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS daily_activities_user_idx
  ON public.daily_activities (user_id, performed_at DESC);
ALTER TABLE public.daily_activities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_daily_activities" ON public.daily_activities;
CREATE POLICY "own_daily_activities" ON public.daily_activities FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_activities TO anon, authenticated;

-- Curated seed (mirrors the applied migration on the live project).
