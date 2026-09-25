-- PRESCOPE — admin write policies on genetic_tests
--
-- Mirrors intervention_templates / recipes / labs. Owner/admin staff manage
-- the genetic panel catalogue through the Refine dashboard (CRUD page ships
-- in a follow-up slice). The read policy in 20260926_genetic_tests.sql
-- keeps the user-facing order flow working.

DROP POLICY IF EXISTS "admin_genetic_tests_all" ON public.genetic_tests;
CREATE POLICY "admin_genetic_tests_all"
  ON public.genetic_tests
  FOR ALL
  USING (public.is_admin_staff())
  WITH CHECK (public.is_admin_staff());

GRANT INSERT, UPDATE, DELETE ON public.genetic_tests TO authenticated;

COMMENT ON POLICY "admin_genetic_tests_all" ON public.genetic_tests IS
  'Owner/admin staff manage the genetic panels library. read_genetic_tests still allows any authenticated read (order flow).';
