-- LifeShield Phase 1 schema (from .cursorrules Section 6.4)
--
-- HOW TO USE THIS FILE
-- 1. Open your Supabase project → SQL Editor → New query
-- 2. Copy ALL of this file (every line) and paste it
-- 3. Click Run
--
-- SAFE TO RE-RUN
-- This script is written so you can paste it again later without deleting
-- anyone's data. It will NOT drop tables.
--
-- If you previously saw:  trigger "on_auth_user_created" already exists
-- that is GOOD NEWS. It means this trigger was created on an earlier run,
-- then the old script stopped — so later tables may never have been created.
-- Run THIS updated file once more so the remaining tables can be created.
--
-- If you later see "already exists" on a table or policy, that piece is
-- already in place. That is OK. You are not breaking anything.

-- ========== PROFILES ==========
-- One row per signed-up user. Created automatically by the trigger below.
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  date_of_birth DATE,
  sex TEXT CHECK (sex IN ('male','female','other')),
  height_cm NUMERIC,
  weight_kg NUMERIC,
  bmi NUMERIC GENERATED ALWAYS AS (weight_kg / NULLIF((height_cm/100.0)^2,0)) STORED,
  waist_cm NUMERIC,
  hip_cm NUMERIC,
  ethnicity TEXT,
  country_of_origin TEXT,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Recreate the policy if it already exists (does not delete table data).
DROP POLICY IF EXISTS "own_profile" ON public.profiles;
CREATE POLICY "own_profile" ON public.profiles
  FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ========== TRIAGE ==========
-- Symptom safety check answers (pain / discomfort / lump).
CREATE TABLE IF NOT EXISTS public.triage_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  has_pain BOOLEAN NOT NULL,
  has_discomfort BOOLEAN NOT NULL,
  has_lump BOOLEAN NOT NULL,
  is_symptomatic BOOLEAN GENERATED ALWAYS AS (has_pain OR has_discomfort OR has_lump) STORED,
  triaged_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.triage_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_triage" ON public.triage_responses;
CREATE POLICY "own_triage" ON public.triage_responses
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ========== CONSENT ==========
-- Terms, BRCA, CTC, and SNP consent ticks.
CREATE TABLE IF NOT EXISTS public.consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL CHECK (consent_type IN ('terms_privacy','brca','ctc','snp')),
  consented BOOLEAN NOT NULL,
  consented_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_consent" ON public.consent_records;
CREATE POLICY "own_consent" ON public.consent_records
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ========== QUESTIONNAIRE ==========
-- One saved JSON blob per questionnaire section, per user.
CREATE TABLE IF NOT EXISTS public.questionnaire_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  section TEXT NOT NULL CHECK (section IN (
    'reproductive_menstrual','radiation_occupational','comorbidities',
    'family_history','personal_history','lifestyle','stress',
    'diet_environment','prior_screening'
  )),
  responses JSONB NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, section)
);
ALTER TABLE public.questionnaire_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_questionnaire" ON public.questionnaire_responses;
CREATE POLICY "own_questionnaire" ON public.questionnaire_responses
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ========== TEST RECOMMENDATIONS ==========
-- Recommended tests written by the rules engine (not AI).
CREATE TABLE IF NOT EXISTS public.test_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  test_tier INTEGER NOT NULL CHECK (test_tier IN (1,2,3,4)),
  test_name TEXT NOT NULL,
  trigger_reason TEXT,
  status TEXT DEFAULT 'recommended',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.test_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_tests" ON public.test_orders;
CREATE POLICY "own_tests" ON public.test_orders
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ========== AUTO-CREATE PROFILE ON SIGNUP ==========
-- When someone registers, this function inserts a matching profiles row
-- so the app never crashes on "missing profile".
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- ON CONFLICT: if the app already created the row, do not fail signup.
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    NULLIF(trim(BOTH FROM COALESCE(NEW.raw_user_meta_data->>'full_name', '')), '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;

-- If you previously saw "trigger already exists", that was this name.
-- We drop it first (the trigger only, not your users or data), then recreate it.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Let the signed-in app read/write its own rows (RLS still limits *which* rows).
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.profiles,
  public.triage_responses,
  public.consent_records,
  public.questionnaire_responses,
  public.test_orders
TO anon, authenticated;
