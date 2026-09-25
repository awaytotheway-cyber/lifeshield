-- PRESCOPE — admin write policies on intervention_templates
--
-- Phase B admin CRUD (see admin/src/pages/intervention-templates/) needs
-- INSERT / UPDATE / DELETE. The existing read policy stays as-is
-- (all authenticated accounts can read the library).
--
-- Uses public.is_admin_staff() defined in supabase/phase4-schema.sql. Same
-- helper the clinics / doctors / products admin policies use.

DROP POLICY IF EXISTS "admin_intervention_templates_all"
  ON public.intervention_templates;
CREATE POLICY "admin_intervention_templates_all"
  ON public.intervention_templates
  FOR ALL
  USING (public.is_admin_staff())
  WITH CHECK (public.is_admin_staff());

GRANT INSERT, UPDATE, DELETE ON public.intervention_templates
  TO authenticated;

COMMENT ON POLICY "admin_intervention_templates_all"
  ON public.intervention_templates IS
  'Owner/admin staff can create/edit/delete templates. The separate read_intervention_templates policy lets any authenticated account SELECT (needed by the mobile plan screen).';
