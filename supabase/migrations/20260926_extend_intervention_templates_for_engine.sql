-- PRESCOPE — extend intervention_templates so the rules engine can read from it
--
-- Adds the fields the engine already fills onto each intervention row:
--   plain_reason              — user-facing "why this appeared".
--   description               — the "Draft idea from …" body currently written by rules-engine.ts.
--   category                  — supplement | diet | lifestyle | therapy | referral | coaching.
--   needs_interaction_check   — TRUE when the intervention should be flagged for a practitioner review
--                               (currently only inflammatory + oestrogen_detox).
--
-- The seed inside this migration re-inserts all 14 templates with the new
-- columns filled. It is idempotent: an admin's later edits to any of these
-- columns are preserved until this migration is re-run.
--
-- After this migration, lib/rules-engine.ts's mapResultsToInterventions()
-- accepts an optional `pairs` parameter; plan.ts calls
-- loadTemplatesForEngine() first and passes the result in, falling back to
-- the hard-coded FINDING_INTERVENTION_TABLE if the load fails.

ALTER TABLE public.intervention_templates
  ADD COLUMN IF NOT EXISTS plain_reason TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS needs_interaction_check BOOLEAN NOT NULL DEFAULT FALSE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'intervention_templates_category_check'
  ) THEN
    ALTER TABLE public.intervention_templates
      ADD CONSTRAINT intervention_templates_category_check
      CHECK (
        category IS NULL
        OR category IN ('supplement','diet','lifestyle','therapy','referral','coaching')
      );
  END IF;
END $$;

-- Re-seed the 14 templates with plain_reason / description / category /
-- needs_interaction_check. Idempotent (ON CONFLICT (code) DO UPDATE).
INSERT INTO public.intervention_templates
  (code, title, rationale_md, action_steps, resources, impact_score,
   contraindication_codes, trigger_findings,
   plain_reason, description, category, needs_interaction_check)
VALUES
  (
    'dysbiosis',
    'Gut-bacteria balance and vagal-tone support',
    'Correct dysbiosis; improve vagal tone',
    '[{"text":"Correct dysbiosis; improve vagal tone","why":"Draft idea from the protocol pairing for dysbiosis. Not an instruction.","kind":"supplement"}]'::jsonb,
    '[]'::jsonb, 3, '{}', ARRAY['Dysbiosis on stool analysis'],
    'The stool analysis suggested the mix of gut bacteria is out of balance.',
    'Draft idea from the protocol pairing for dysbiosis. Not an instruction.',
    'supplement', FALSE
  ),
  (
    'beta_glucuronidase',
    'Calcium-D-glucarate (draft)',
    'Calcium-D-glucarate',
    '[{"text":"Calcium-D-glucarate","why":"Draft idea from the protocol pairing for raised stool beta-glucuronidase. Not an instruction.","kind":"supplement"}]'::jsonb,
    '[]'::jsonb, 3, '{}', ARRAY['Raised stool beta-glucuronidase'],
    'The stool analysis showed a raised beta-glucuronidase reading.',
    'Draft idea from the protocol pairing for raised stool beta-glucuronidase. Not an instruction.',
    'supplement', FALSE
  ),
  (
    'liver_barrier',
    'Liver-support and gut-barrier-repair (draft)',
    'Liver-support and gut-barrier-repair supplementation',
    '[{"text":"Liver-support and gut-barrier-repair supplementation","why":"Draft idea from the protocol pairing for impaired liver detox / barrier dysfunction. Not an instruction.","kind":"supplement"}]'::jsonb,
    '[]'::jsonb, 3, '{}', ARRAY['Impaired liver detox / barrier dysfunction'],
    'Markers suggested liver detox or the gut barrier may be under strain.',
    'Draft idea from the protocol pairing for impaired liver detox / barrier dysfunction. Not an instruction.',
    'supplement', FALSE
  ),
  (
    'zonulin',
    'Vitamin D and vitamin A (draft)',
    'Vitamin D correction; vitamin A',
    '[{"text":"Vitamin D correction","why":"A positive zonulin result can mean the gut barrier is more open than usual.","kind":"supplement"},{"text":"Vitamin A","kind":"supplement"}]'::jsonb,
    '[]'::jsonb, 3, '{}', ARRAY['Positive zonulin (barrier breakage)'],
    'A positive zonulin result can mean the gut barrier is more open than usual.',
    'Draft idea from the protocol pairing for positive zonulin (barrier breakage). Not an instruction.',
    'supplement', FALSE
  ),
  (
    'undigested',
    'Digestive enzymes (draft)',
    'Digestive enzyme supplementation',
    '[{"text":"Digestive enzyme supplementation","why":"Draft idea from the protocol pairing for undigested protein/fat. Not an instruction.","kind":"supplement"}]'::jsonb,
    '[]'::jsonb, 3, '{}', ARRAY['Undigested protein/fat'],
    'The stool check showed undigested protein or fat.',
    'Draft idea from the protocol pairing for undigested protein/fat. Not an instruction.',
    'supplement', FALSE
  ),
  (
    'fasting_insulin',
    'Cardiometabolic eating pattern (draft)',
    'Cardiometabolic diet; insulin-resistance management',
    '[{"text":"Cardiometabolic diet","why":"Draft idea from the protocol pairing for raised fasting insulin. Not an instruction.","kind":"diet"},{"text":"Insulin-resistance management","kind":"lifestyle"}]'::jsonb,
    '[]'::jsonb, 4, '{}', ARRAY['Raised fasting insulin'],
    -- Fasting insulin uses a live threshold at engine time. The template's
    -- plain_reason is deliberately generic; the engine passes it through
    -- as-is now that it reads from this table. The current live value is 8.
    'Fasting insulin was above the stored threshold.',
    'Draft idea from the protocol pairing for raised fasting insulin. Not an instruction.',
    'diet', FALSE
  ),
  (
    'thyroid',
    'Thyroid follow-up with a practitioner (draft)',
    'Thyroxine replacement and/or thyroid autoimmunity correction',
    '[{"text":"Book a follow-up with a practitioner","why":"Draft idea from the protocol pairing for abnormal thyroid function. Not an instruction.","kind":"referral"}]'::jsonb,
    '[]'::jsonb, 5, '{}', ARRAY['Abnormal thyroid function'],
    'Thyroid function results were outside the range this protocol uses.',
    'Draft idea from the protocol pairing for abnormal thyroid function. Not an instruction.',
    'referral', FALSE
  ),
  (
    'adrenal',
    'Adaptogens and sleep-improvement ideas (draft)',
    'Adaptogens; sleep-improvement strategies',
    '[{"text":"Adaptogens","why":"Draft idea from the protocol pairing for impaired adrenal resilience (cortisol). Not an instruction.","kind":"supplement"},{"text":"Sleep-improvement strategies","kind":"lifestyle"}]'::jsonb,
    '[]'::jsonb, 3, '{}', ARRAY['Impaired adrenal resilience (cortisol)'],
    'Cortisol results suggested adrenal resilience may be reduced.',
    'Draft idea from the protocol pairing for impaired adrenal resilience (cortisol). Not an instruction.',
    'lifestyle', FALSE
  ),
  (
    'stress',
    'Structured stress-coping support (draft)',
    'Structured stress-coping support (challenge-framing + social connection)',
    '[{"text":"Challenge-framing practice (reframing stressors as challenges)","why":"Draft idea from the protocol pairing for medium/high self-rated stress. Not an instruction.","kind":"coaching"},{"text":"Nurture social connection","kind":"lifestyle"}]'::jsonb,
    '[]'::jsonb, 3, '{}', ARRAY['Medium/high self-rated stress'],
    'You rated your own stress as medium or high.',
    'Draft idea from the protocol pairing for medium/high self-rated stress. Not an instruction.',
    'coaching', FALSE
  ),
  (
    'toxin',
    'Sauna, magnesium baths, and glutathione support (draft)',
    'Sauna therapy; magnesium salt baths; glutathione support',
    '[{"text":"Sauna therapy","why":"Draft idea from the protocol pairing for elevated toxin exposure. Not an instruction.","kind":"therapy"},{"text":"Magnesium salt baths","kind":"therapy"},{"text":"Glutathione support","kind":"supplement"}]'::jsonb,
    '[]'::jsonb, 3, '{}', ARRAY['Elevated toxin exposure'],
    'Work, environment answers, or a toxin panel suggested higher exposure.',
    'Draft idea from the protocol pairing for elevated toxin exposure. Not an instruction.',
    'therapy', FALSE
  ),
  (
    'iodine',
    'Iodine supplementation (draft)',
    'Iodine supplementation (blocked if antibodies positive)',
    '[{"text":"Iodine supplementation","why":"Draft idea from the protocol pairing for low urinary iodine when antibodies are negative. Not an instruction.","kind":"supplement"}]'::jsonb,
    '[]'::jsonb, 3, '{}', ARRAY['Low urinary iodine (antibodies NEGATIVE)'],
    'Urinary iodine looked low, and thyroid antibodies were not positive.',
    'Draft idea from the protocol pairing for low urinary iodine when antibodies are negative. Not an instruction.',
    'supplement', FALSE
  ),
  (
    'methylation',
    'Methyl-donor supplementation (draft)',
    'Methyl-donor supplementation',
    '[{"text":"Methyl-donor supplementation","why":"Draft idea from the protocol pairing for methylation-pathway SNP issues. Not an instruction.","kind":"supplement"}]'::jsonb,
    '[]'::jsonb, 3, '{}', ARRAY['Methylation-pathway SNP issues'],
    'The genetics panel flagged methylation-pathway SNP issues.',
    'Draft idea from the protocol pairing for methylation-pathway SNP issues. Not an instruction.',
    'supplement', FALSE
  ),
  (
    'inflammatory',
    'Resveratrol, turmeric, algal omega-3, Glutathione/NAC (draft)',
    'Resveratrol, turmeric, high-dose algal omega-3, Glutathione/NAC',
    '[{"text":"Resveratrol","why":"Draft idea from the protocol pairing for general inflammatory / oxidative burden. Not an instruction.","kind":"supplement"},{"text":"Turmeric","kind":"supplement"},{"text":"High-dose algal omega-3","why":"Needs a practitioner check if you use hormones or blood thinners.","kind":"supplement"},{"text":"Glutathione / NAC","kind":"supplement"}]'::jsonb,
    '[]'::jsonb, 3, ARRAY['hormones','blood_thinners'], ARRAY['General inflammatory / oxidative burden'],
    'Results suggested a general inflammatory or oxidative burden.',
    'Draft idea from the protocol pairing for general inflammatory / oxidative burden. High-dose omega-3 needs a practitioner check if you use hormones or blood thinners. Not an instruction.',
    'supplement', TRUE
  ),
  (
    'oestrogen_detox',
    'Soy isoflavones and DIM/I3C (draft)',
    'Soy isoflavones and DIM/I3C',
    '[{"text":"Soy isoflavones","why":"Draft idea from the protocol pairing for impaired oestrogen-detoxification (SNP/DUTCH). Not an instruction.","kind":"diet"},{"text":"DIM / I3C","why":"Needs a practitioner check if you use hormones or blood thinners.","kind":"supplement"}]'::jsonb,
    '[]'::jsonb, 3, ARRAY['hormones','blood_thinners'], ARRAY['Impaired oestrogen-detoxification (SNP/DUTCH)'],
    'SNP or DUTCH results suggested impaired oestrogen detoxification.',
    'Draft idea from the protocol pairing for impaired oestrogen-detoxification (SNP/DUTCH). DIM/I3C needs a practitioner check if you use hormones or blood thinners. Not an instruction.',
    'supplement', TRUE
  )
ON CONFLICT (code) DO UPDATE SET
  title = EXCLUDED.title,
  rationale_md = EXCLUDED.rationale_md,
  action_steps = EXCLUDED.action_steps,
  resources = EXCLUDED.resources,
  impact_score = EXCLUDED.impact_score,
  contraindication_codes = EXCLUDED.contraindication_codes,
  trigger_findings = EXCLUDED.trigger_findings,
  plain_reason = EXCLUDED.plain_reason,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  needs_interaction_check = EXCLUDED.needs_interaction_check,
  updated_at = NOW();
