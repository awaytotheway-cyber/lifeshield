-- Phase 4 Day 3 — let signed-in mobile users read clinical cut-offs.
-- Run once in Supabase SQL Editor if you already applied phase4-schema.sql.
--
-- Plain English: any logged-in app user can read threshold numbers (not PHI).
-- Owner/admin still edit via admin panel; clinicians read-only in admin.

DROP POLICY IF EXISTS "authenticated_thresholds_read" ON public.clinical_thresholds;
CREATE POLICY "authenticated_thresholds_read" ON public.clinical_thresholds
  FOR SELECT
  USING (auth.uid() IS NOT NULL);
