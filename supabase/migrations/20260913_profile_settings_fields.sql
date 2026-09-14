-- PRESCOPE — extended profile + settings fields
--
-- HOW TO USE
-- 1. Open Supabase → SQL Editor → New query
-- 2. Paste this whole file and click Run
-- 3. Safe to re-run (IF NOT EXISTS / additive columns only)
--
-- What this adds on public.profiles:
--   phone, blood_type, emergency contact, conditions, allergies,
--   avatar_url (optional remote URL; app may also keep a local photo URI),
--   notification preference columns (booleans + preferred local time)
--
-- What this adds as a new table:
--   account_deletion_requests — user can request deletion from the app;
--   an admin must complete deletion in the dashboard (no service-role key in the app).

-- ========== EXTEND profiles ==========
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS blood_type TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact_relationship TEXT,
  ADD COLUMN IF NOT EXISTS conditions TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS allergies TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS notify_reminders BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS notify_results BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS notify_plan BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS notify_marketing BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS preferred_notify_time TEXT;

-- Soft check for blood_type values (nullable; empty allowed)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_blood_type_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_blood_type_check
      CHECK (
        blood_type IS NULL
        OR blood_type IN (
          'a_pos','a_neg','b_pos','b_neg','ab_pos','ab_neg','o_pos','o_neg','unknown'
        )
      );
  END IF;
END $$;

-- Preferred time is HH:MM local when set
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_preferred_notify_time_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_preferred_notify_time_check
      CHECK (
        preferred_notify_time IS NULL
        OR preferred_notify_time ~ '^[0-2][0-9]:[0-5][0-9]$'
      );
  END IF;
END $$;

-- ========== ACCOUNT DELETION REQUESTS ==========
-- The mobile app cannot call the Auth Admin API (that needs the service-role key).
-- Users submit a request here; you fulfil it in Dashboard → Authentication → Users.
CREATE TABLE IF NOT EXISTS public.account_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','completed','cancelled')),
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id)
);
ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_deletion_request" ON public.account_deletion_requests;
CREATE POLICY "own_deletion_request" ON public.account_deletion_requests
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE public.account_deletion_requests IS
  'User-requested account deletion. Admin completes removal in Auth dashboard; app never holds the service-role key.';
