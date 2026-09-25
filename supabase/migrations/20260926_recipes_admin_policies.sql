-- PRESCOPE — admin write policies on recipes
--
-- Mirrors the intervention_templates admin policy: owner/admin staff
-- can create, edit, delete rows through the Refine dashboard (and via
-- direct SQL for one-off content imports). The existing read_recipes
-- policy stays as-is so the mobile app still browses the library.

DROP POLICY IF EXISTS "admin_recipes_all" ON public.recipes;
CREATE POLICY "admin_recipes_all"
  ON public.recipes
  FOR ALL
  USING (public.is_admin_staff())
  WITH CHECK (public.is_admin_staff());

GRANT INSERT, UPDATE, DELETE ON public.recipes TO authenticated;

COMMENT ON POLICY "admin_recipes_all" ON public.recipes IS
  'Owner/admin staff can create/edit/delete recipes. read_recipes still allows any authenticated read.';
