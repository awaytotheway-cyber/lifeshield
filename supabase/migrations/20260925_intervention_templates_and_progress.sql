-- PRESCOPE — intervention templates + progress log (Phase B foundations)
--
-- Additive: the rules engine (lib/rules-engine.ts) still writes interventions
-- the way it always did. Templates are consulted by the detail screen at
-- render time to render rationale / action steps / resources when a template
-- matches the intervention's trigger_finding. A later slice can flip the
-- engine itself to read from this table.
--
-- HOW TO USE
-- 1. Open Supabase → SQL Editor → New query
-- 2. Paste this whole file and click Run
-- 3. Safe to re-run (IF NOT EXISTS / additive only)

-- ========== INTERVENTION TEMPLATES ==========
-- One row per template — the human-readable rationale, action steps, and
-- resources that expand the terse `interventions` row into a screen. Editable
-- from the admin dashboard without a redeploy.
CREATE TABLE IF NOT EXISTS public.intervention_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Short stable slug used by admin tooling ("vitamin_d_deficient", "hrv_low").
  code TEXT NOT NULL UNIQUE,

  title TEXT NOT NULL,
  rationale_md TEXT,

  -- Ordered list of concrete actions. Each entry: { text, why?, dose?, when? }.
  action_steps JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- External references. Each entry: { title, url, kind }
  -- where kind is 'article' | 'study' | 'video' | 'product'.
  resources JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- 1 (nice-to-have) through 5 (critical). Drives ordering when many
  -- interventions match at once.
  impact_score INTEGER NOT NULL DEFAULT 3
    CHECK (impact_score BETWEEN 1 AND 5),

  -- Interaction codes the template should not be shown alongside without a
  -- clinician review (matches the `interventions.clinician_interaction_check`
  -- flag semantics).
  contraindication_codes TEXT[] NOT NULL DEFAULT '{}',

  -- Which rules-engine trigger findings this template covers. Lookup is a
  -- containment check: WHERE trigger_findings @> ARRAY[<intervention.trigger_finding>].
  trigger_findings TEXT[] NOT NULL DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS intervention_templates_findings_idx
  ON public.intervention_templates USING gin (trigger_findings);

ALTER TABLE public.intervention_templates ENABLE ROW LEVEL SECURITY;

-- Templates are public library content, not per-user. Signed-in accounts can
-- read them; only service-role (admin) writes.
DROP POLICY IF EXISTS "read_intervention_templates" ON public.intervention_templates;
CREATE POLICY "read_intervention_templates" ON public.intervention_templates
  FOR SELECT USING (auth.role() = 'authenticated');

GRANT SELECT ON TABLE public.intervention_templates TO authenticated;

COMMENT ON TABLE public.intervention_templates IS
  'Library of rationale + action steps + resources indexed by rules-engine trigger findings. Additive to lib/rules-engine.ts; templates render on top of an intervention row when a match exists.';

-- ========== INTERVENTION PROGRESS ==========
-- Timestamped log of user progress against a specific intervention. Distinct
-- from goal_progress (which logs against a user-defined goal) — this one
-- tracks the clinical intervention the plan handed the user.
CREATE TABLE IF NOT EXISTS public.intervention_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intervention_id UUID NOT NULL REFERENCES public.interventions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Free-form structured value. Common shapes: { done: true }, { adherence: 0.8 },
  -- { dose_taken: 2000, unit: 'IU' }. Kept flexible so different intervention
  -- kinds can log what makes sense without schema churn.
  value JSONB NOT NULL DEFAULT '{}'::jsonb,

  note TEXT
);

CREATE INDEX IF NOT EXISTS intervention_progress_intervention_idx
  ON public.intervention_progress (intervention_id, recorded_at DESC);

ALTER TABLE public.intervention_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_intervention_progress" ON public.intervention_progress;
CREATE POLICY "own_intervention_progress" ON public.intervention_progress
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.intervention_progress
  TO authenticated;

COMMENT ON TABLE public.intervention_progress IS
  'Per-user progress log against a specific interventions row. Feeds the plan detail screen and Phase L journey analytics.';
