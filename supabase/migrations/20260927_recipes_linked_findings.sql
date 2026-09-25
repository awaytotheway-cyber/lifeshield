-- PRESCOPE — recipes ↔ clinical findings link
--
-- Lets the plan detail surface recipes relevant to a rules-engine trigger
-- finding (e.g. "Raised fasting insulin" → cardio-metabolic recipes).
-- linked_findings holds the same exact strings the rules engine writes into
-- interventions.trigger_finding + intervention_templates.trigger_findings,
-- so a containment check on either side matches without normalisation.

ALTER TABLE public.recipes
  ADD COLUMN IF NOT EXISTS linked_findings TEXT[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS recipes_linked_findings_idx
  ON public.recipes USING gin (linked_findings);

COMMENT ON COLUMN public.recipes.linked_findings IS
  'Rules-engine trigger findings this recipe supports. Match strings verbatim (case-sensitive) — the plan detail queries `linked_findings @> ARRAY[trigger_finding]`.';
