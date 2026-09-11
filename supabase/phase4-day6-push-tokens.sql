-- =============================================================================
-- Phase 4 Day 6 — push token storage (idempotent)
-- Paste into Supabase → SQL Editor → Run.
--
-- The push_tokens table and RLS policies are created in phase4-schema.sql.
-- This file is a safe re-run if you already ran Day 1 schema but want to
-- confirm policies before testing notifications.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  expo_push_token TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, expo_push_token)
);

CREATE INDEX IF NOT EXISTS push_tokens_user_id_idx
  ON public.push_tokens (user_id);

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_push_tokens" ON public.push_tokens;
CREATE POLICY "own_push_tokens" ON public.push_tokens
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "admin_push_tokens_read" ON public.push_tokens;
CREATE POLICY "admin_push_tokens_read" ON public.push_tokens
  FOR SELECT
  USING (public.is_admin_staff());

COMMENT ON TABLE public.push_tokens IS
  'Expo push tokens per device. Day 7 send-push Edge Function reads these. Patients manage their own rows via RLS.';
