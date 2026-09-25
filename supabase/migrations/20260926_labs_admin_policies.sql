-- PRESCOPE — admin write policies on labs
--
-- Mirrors the intervention_templates / recipes admin policy. Owner/admin
-- staff can create, edit, deactivate labs through the Refine dashboard
-- (admin CRUD page ships in a follow-up slice). The read policy left in
-- 20260926_labs_and_booking.sql keeps the mobile app booking flow working.

DROP POLICY IF EXISTS "admin_labs_all" ON public.labs;
CREATE POLICY "admin_labs_all"
  ON public.labs
  FOR ALL
  USING (public.is_admin_staff())
  WITH CHECK (public.is_admin_staff());

GRANT INSERT, UPDATE, DELETE ON public.labs TO authenticated;

COMMENT ON POLICY "admin_labs_all" ON public.labs IS
  'Owner/admin staff manage the labs library. read_labs still allows any authenticated read (booking flow).';
