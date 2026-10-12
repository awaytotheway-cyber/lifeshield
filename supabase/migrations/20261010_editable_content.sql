-- PRESCOPE — admin-editable questionnaire wording, extra questions, and
-- onboarding copy.
--
-- Two surfaces:
--   content_fields — per-question config for the 10 questionnaire sections.
--                    Seeded rows mirror the questions already hardcoded in
--                    the app. Admin may reword them; admin may also add new
--                    questions, which the app renders under "Additional
--                    questions" in that section.
--   app_copy       — key/value overrides for onboarding screen text.
--
-- SAFETY — locked rows.
--   lib/rules-facts.ts reads specific field keys by name to build the facts
--   the clinical rules engine runs on. Renaming, retyping, deactivating, or
--   deleting one of those silently turns its fact to false/null, which stops
--   Tier 4 test triggers from firing — including the input to the iodine
--   autoimmune-thyroid hard stop. Those rows carry is_locked = true and a
--   trigger below rejects any structural change to them at the database
--   level, so a bug in the admin UI cannot bypass it. Wording (label,
--   help_text, option labels) stays editable.
--
-- Clients poll content_revision (one row) and only refetch the payload when
-- the stamp moved. App-side cache TTL is 5 minutes, matching
-- lib/load-thresholds.ts, so an admin edit lands within ~5 minutes.

-- ========== content_fields ==========
CREATE TABLE IF NOT EXISTS public.content_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section TEXT NOT NULL CHECK (section IN (
    'demographics','reproductive_menstrual','radiation_occupational',
    'comorbidities','family_history','personal_history','lifestyle',
    'stress','diet_environment','prior_screening'
  )),
  field_key TEXT NOT NULL,
  label TEXT NOT NULL,
  help_text TEXT,
  field_type TEXT NOT NULL CHECK (field_type IN (
    'yes_no','yes_no_unsure','single_select','multi_select','text','number'
  )),
  -- [{ "value": "yes", "label": "Yes" }, …]. Empty for text/number.
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  required BOOLEAN NOT NULL DEFAULT false,
  -- true  = ships with the app, structure frozen, wording editable
  -- false = admin-added, fully editable, never read by the rules engine
  is_locked BOOLEAN NOT NULL DEFAULT false,
  -- Shown in admin to explain why a row is frozen.
  locked_reason TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (section, field_key)
);

ALTER TABLE public.content_fields ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_content_fields" ON public.content_fields;
CREATE POLICY "read_content_fields" ON public.content_fields
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "admin_content_fields_all" ON public.content_fields;
CREATE POLICY "admin_content_fields_all" ON public.content_fields
  FOR ALL USING (public.is_admin_staff()) WITH CHECK (public.is_admin_staff());

GRANT SELECT ON public.content_fields TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.content_fields TO authenticated;

CREATE INDEX IF NOT EXISTS content_fields_section_idx
  ON public.content_fields (section, sort_order);

-- ========== app_copy ==========
CREATE TABLE IF NOT EXISTS public.app_copy (
  copy_key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  -- Regulatory text (the medical disclaimer) is flagged so admin sees a
  -- warning before editing. Still editable — it is wording, not structure.
  is_regulatory BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.app_copy ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_app_copy" ON public.app_copy;
CREATE POLICY "read_app_copy" ON public.app_copy
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "admin_app_copy_all" ON public.app_copy;
CREATE POLICY "admin_app_copy_all" ON public.app_copy
  FOR ALL USING (public.is_admin_staff()) WITH CHECK (public.is_admin_staff());

GRANT SELECT ON public.app_copy TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.app_copy TO authenticated;

-- ========== content_revision ==========
-- One row. Clients poll this instead of pulling the whole payload.
CREATE TABLE IF NOT EXISTS public.content_revision (
  id BOOLEAN PRIMARY KEY DEFAULT true CHECK (id),
  revision BIGINT NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.content_revision (id, revision)
VALUES (true, 1)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.content_revision ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_content_revision" ON public.content_revision;
CREATE POLICY "read_content_revision" ON public.content_revision
  FOR SELECT USING (auth.uid() IS NOT NULL);

GRANT SELECT ON public.content_revision TO authenticated;

CREATE OR REPLACE FUNCTION public.bump_content_revision()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.content_revision
     SET revision = revision + 1,
         updated_at = NOW()
   WHERE id;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS content_fields_bump ON public.content_fields;
CREATE TRIGGER content_fields_bump
  AFTER INSERT OR UPDATE OR DELETE ON public.content_fields
  FOR EACH STATEMENT EXECUTE FUNCTION public.bump_content_revision();

DROP TRIGGER IF EXISTS app_copy_bump ON public.app_copy;
CREATE TRIGGER app_copy_bump
  AFTER INSERT OR UPDATE OR DELETE ON public.app_copy
  FOR EACH STATEMENT EXECUTE FUNCTION public.bump_content_revision();

-- ========== locked-row guard ==========
-- Wording may change on a locked row. Structure may not, and the row may
-- not be deactivated or deleted. Enforced here rather than only in the
-- admin UI so no client can route around it.
CREATE OR REPLACE FUNCTION public.guard_locked_content_field()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  old_values JSONB;
  new_values JSONB;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.is_locked THEN
      RAISE EXCEPTION
        'Cannot delete locked field %.% — the clinical rules engine reads it. %',
        OLD.section, OLD.field_key, COALESCE(OLD.locked_reason, '');
    END IF;
    RETURN OLD;
  END IF;

  IF NOT OLD.is_locked THEN
    NEW.updated_at := NOW();
    RETURN NEW;
  END IF;

  IF NEW.field_key IS DISTINCT FROM OLD.field_key THEN
    RAISE EXCEPTION 'Cannot rename locked field %.%', OLD.section, OLD.field_key;
  END IF;
  IF NEW.section IS DISTINCT FROM OLD.section THEN
    RAISE EXCEPTION 'Cannot move locked field %.%', OLD.section, OLD.field_key;
  END IF;
  IF NEW.field_type IS DISTINCT FROM OLD.field_type THEN
    RAISE EXCEPTION 'Cannot change the answer type of locked field %.%',
      OLD.section, OLD.field_key;
  END IF;
  IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
    RAISE EXCEPTION 'Cannot deactivate locked field %.%', OLD.section, OLD.field_key;
  END IF;
  IF NEW.is_locked IS DISTINCT FROM OLD.is_locked THEN
    RAISE EXCEPTION 'Cannot unlock field %.%', OLD.section, OLD.field_key;
  END IF;

  -- Option VALUES are what the rules engine compares against; their labels
  -- are free text. Compare the value lists only.
  SELECT COALESCE(jsonb_agg(elem->>'value' ORDER BY elem->>'value'), '[]'::jsonb)
    INTO old_values
    FROM jsonb_array_elements(OLD.options) AS elem;
  SELECT COALESCE(jsonb_agg(elem->>'value' ORDER BY elem->>'value'), '[]'::jsonb)
    INTO new_values
    FROM jsonb_array_elements(NEW.options) AS elem;

  IF old_values IS DISTINCT FROM new_values THEN
    RAISE EXCEPTION
      'Cannot change option values on locked field %.% — only their labels. %',
      OLD.section, OLD.field_key, COALESCE(OLD.locked_reason, '');
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS content_fields_locked_guard ON public.content_fields;
CREATE TRIGGER content_fields_locked_guard
  BEFORE UPDATE OR DELETE ON public.content_fields
  FOR EACH ROW EXECUTE FUNCTION public.guard_locked_content_field();

COMMENT ON TABLE public.content_fields IS
  'Questionnaire question config. is_locked rows are read by lib/rules-facts.ts; a trigger blocks structural edits to them.';
COMMENT ON TABLE public.app_copy IS
  'Onboarding screen copy overrides, keyed to lib/copy.ts keys.';
COMMENT ON TABLE public.content_revision IS
  'Single row bumped on any content change so clients can poll cheaply.';
