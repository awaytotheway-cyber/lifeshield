-- PRESCOPE — seed intervention_templates from lib/rules-engine.ts
--
-- Extracts the 15 entries in FINDING_INTERVENTION_TABLE into the templates
-- library so admin can edit rationale / action steps / resources without a
-- redeploy. Safe to re-run: ON CONFLICT (code) DO UPDATE keeps this
-- migration idempotent while an admin edit still wins between runs (the
-- update is scoped to the columns this seed knows about).
--
-- After this seed lands, a follow-up slice can flip lib/rules-engine.ts to
-- read from intervention_templates at runtime (with the current hard-coded
-- array as a fallback for offline / first-run).

INSERT INTO public.intervention_templates
  (code, title, rationale_md, action_steps, resources, impact_score,
   contraindication_codes, trigger_findings)
VALUES
  (
    'dysbiosis',
    'Gut-bacteria balance and vagal-tone support',
    'Correct dysbiosis; improve vagal tone',
    '[
      {"text": "Correct dysbiosis; improve vagal tone",
       "why": "Draft idea from the protocol pairing for dysbiosis. Not an instruction.",
       "kind": "supplement"}
    ]'::jsonb,
    '[]'::jsonb,
    3,
    '{}',
    ARRAY['Dysbiosis on stool analysis']
  ),
  (
    'beta_glucuronidase',
    'Calcium-D-glucarate (draft)',
    'Calcium-D-glucarate',
    '[
      {"text": "Calcium-D-glucarate",
       "why": "Draft idea from the protocol pairing for raised stool beta-glucuronidase. Not an instruction.",
       "kind": "supplement"}
    ]'::jsonb,
    '[]'::jsonb,
    3,
    '{}',
    ARRAY['Raised stool beta-glucuronidase']
  ),
  (
    'liver_barrier',
    'Liver-support and gut-barrier-repair (draft)',
    'Liver-support and gut-barrier-repair supplementation',
    '[
      {"text": "Liver-support and gut-barrier-repair supplementation",
       "why": "Draft idea from the protocol pairing for impaired liver detox / barrier dysfunction. Not an instruction.",
       "kind": "supplement"}
    ]'::jsonb,
    '[]'::jsonb,
    3,
    '{}',
    ARRAY['Impaired liver detox / barrier dysfunction']
  ),
  (
    'zonulin',
    'Vitamin D and vitamin A (draft)',
    'Vitamin D correction; vitamin A',
    '[
      {"text": "Vitamin D correction",
       "why": "A positive zonulin result can mean the gut barrier is more open than usual.",
       "kind": "supplement"},
      {"text": "Vitamin A",
       "kind": "supplement"}
    ]'::jsonb,
    '[]'::jsonb,
    3,
    '{}',
    ARRAY['Positive zonulin (barrier breakage)']
  ),
  (
    'undigested',
    'Digestive enzymes (draft)',
    'Digestive enzyme supplementation',
    '[
      {"text": "Digestive enzyme supplementation",
       "why": "Draft idea from the protocol pairing for undigested protein/fat. Not an instruction.",
       "kind": "supplement"}
    ]'::jsonb,
    '[]'::jsonb,
    3,
    '{}',
    ARRAY['Undigested protein/fat']
  ),
  (
    'fasting_insulin',
    'Cardiometabolic eating pattern (draft)',
    'Cardiometabolic diet; insulin-resistance management',
    '[
      {"text": "Cardiometabolic diet",
       "why": "Draft idea from the protocol pairing for raised fasting insulin. Not an instruction.",
       "kind": "diet"},
      {"text": "Insulin-resistance management",
       "kind": "lifestyle"}
    ]'::jsonb,
    '[]'::jsonb,
    4,
    '{}',
    ARRAY['Raised fasting insulin']
  ),
  (
    'thyroid',
    'Thyroid follow-up with a practitioner (draft)',
    'Thyroxine replacement and/or thyroid autoimmunity correction',
    '[
      {"text": "Book a follow-up with a practitioner",
       "why": "Draft idea from the protocol pairing for abnormal thyroid function. Not an instruction.",
       "kind": "referral"}
    ]'::jsonb,
    '[]'::jsonb,
    5,
    '{}',
    ARRAY['Abnormal thyroid function']
  ),
  (
    'adrenal',
    'Adaptogens and sleep-improvement ideas (draft)',
    'Adaptogens; sleep-improvement strategies',
    '[
      {"text": "Adaptogens",
       "why": "Draft idea from the protocol pairing for impaired adrenal resilience (cortisol). Not an instruction.",
       "kind": "supplement"},
      {"text": "Sleep-improvement strategies",
       "kind": "lifestyle"}
    ]'::jsonb,
    '[]'::jsonb,
    3,
    '{}',
    ARRAY['Impaired adrenal resilience (cortisol)']
  ),
  (
    'stress',
    'Structured stress-coping support (draft)',
    'Structured stress-coping support (challenge-framing + social connection)',
    '[
      {"text": "Challenge-framing practice (reframing stressors as challenges)",
       "why": "Draft idea from the protocol pairing for medium/high self-rated stress. Not an instruction.",
       "kind": "coaching"},
      {"text": "Nurture social connection",
       "kind": "lifestyle"}
    ]'::jsonb,
    '[]'::jsonb,
    3,
    '{}',
    ARRAY['Medium/high self-rated stress']
  ),
  (
    'toxin',
    'Sauna, magnesium baths, and glutathione support (draft)',
    'Sauna therapy; magnesium salt baths; glutathione support',
    '[
      {"text": "Sauna therapy",
       "why": "Draft idea from the protocol pairing for elevated toxin exposure. Not an instruction.",
       "kind": "therapy"},
      {"text": "Magnesium salt baths",
       "kind": "therapy"},
      {"text": "Glutathione support",
       "kind": "supplement"}
    ]'::jsonb,
    '[]'::jsonb,
    3,
    '{}',
    ARRAY['Elevated toxin exposure']
  ),
  (
    'iodine',
    'Iodine supplementation (draft)',
    'Iodine supplementation (blocked if antibodies positive)',
    '[
      {"text": "Iodine supplementation",
       "why": "Draft idea from the protocol pairing for low urinary iodine when antibodies are negative. Not an instruction.",
       "kind": "supplement"}
    ]'::jsonb,
    '[]'::jsonb,
    3,
    '{}',
    ARRAY['Low urinary iodine (antibodies NEGATIVE)']
  ),
  (
    'methylation',
    'Methyl-donor supplementation (draft)',
    'Methyl-donor supplementation',
    '[
      {"text": "Methyl-donor supplementation",
       "why": "Draft idea from the protocol pairing for methylation-pathway SNP issues. Not an instruction.",
       "kind": "supplement"}
    ]'::jsonb,
    '[]'::jsonb,
    3,
    '{}',
    ARRAY['Methylation-pathway SNP issues']
  ),
  (
    'inflammatory',
    'Resveratrol, turmeric, algal omega-3, Glutathione/NAC (draft)',
    'Resveratrol, turmeric, high-dose algal omega-3, Glutathione/NAC',
    '[
      {"text": "Resveratrol",
       "why": "Draft idea from the protocol pairing for general inflammatory / oxidative burden. Not an instruction.",
       "kind": "supplement"},
      {"text": "Turmeric",
       "kind": "supplement"},
      {"text": "High-dose algal omega-3",
       "why": "Needs a practitioner check if you use hormones or blood thinners.",
       "kind": "supplement"},
      {"text": "Glutathione / NAC",
       "kind": "supplement"}
    ]'::jsonb,
    '[]'::jsonb,
    3,
    ARRAY['hormones', 'blood_thinners'],
    ARRAY['General inflammatory / oxidative burden']
  ),
  (
    'oestrogen_detox',
    'Soy isoflavones and DIM/I3C (draft)',
    'Soy isoflavones and DIM/I3C',
    '[
      {"text": "Soy isoflavones",
       "why": "Draft idea from the protocol pairing for impaired oestrogen-detoxification (SNP/DUTCH). Not an instruction.",
       "kind": "diet"},
      {"text": "DIM / I3C",
       "why": "Needs a practitioner check if you use hormones or blood thinners.",
       "kind": "supplement"}
    ]'::jsonb,
    '[]'::jsonb,
    3,
    ARRAY['hormones', 'blood_thinners'],
    ARRAY['Impaired oestrogen-detoxification (SNP/DUTCH)']
  )
ON CONFLICT (code) DO UPDATE SET
  title = EXCLUDED.title,
  rationale_md = EXCLUDED.rationale_md,
  action_steps = EXCLUDED.action_steps,
  resources = EXCLUDED.resources,
  impact_score = EXCLUDED.impact_score,
  contraindication_codes = EXCLUDED.contraindication_codes,
  trigger_findings = EXCLUDED.trigger_findings,
  updated_at = NOW();

-- After a first run there are 14 seeded templates. If you also want the
-- historically legacy "Dysbiosis on stool analysis" to catch any older
-- alternate spellings, add them to trigger_findings by hand — this seed
-- keeps the string exactly as the rules engine writes it today.

COMMENT ON TABLE public.intervention_templates IS
  'Library of rationale + action steps + resources indexed by rules-engine trigger findings. Seeded from lib/rules-engine.ts FINDING_INTERVENTION_TABLE via supabase/migrations/20260925_seed_intervention_templates.sql. Admin edits win over subsequent re-runs of that seed only for fields the seed does not touch.';
