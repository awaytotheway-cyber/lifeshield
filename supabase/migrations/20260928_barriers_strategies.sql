-- PRESCOPE — Barriers & Strategies (feature #2)
--
-- barriers        — a small library of common barriers and an evidence-informed
--                   strategy for each. Read-only for users.
-- user_barriers   — the rows a user "tries", scoped to a goal or plan
--                   intervention. Feedback is captured a week later.
--
-- Neither table replaces clinical advice; strategies are motivational.

-- ========== barriers ==========
CREATE TABLE IF NOT EXISTS public.barriers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barrier_type TEXT NOT NULL CHECK (barrier_type IN (
    'time','energy','motivation','knowledge'
  )),
  -- Optional filter so we can suggest the right strategy for a supplement
  -- vs. an exercise. NULL means "applies broadly".
  category TEXT CHECK (category IN (
    'supplement','exercise','meditation','recipe','habit',
    'diet','lifestyle','therapy','referral','coaching'
  )),
  title TEXT NOT NULL,
  strategy TEXT NOT NULL,
  tip TEXT,
  evidence_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS barriers_type_idx
  ON public.barriers (barrier_type);
CREATE INDEX IF NOT EXISTS barriers_category_idx
  ON public.barriers (category);

ALTER TABLE public.barriers ENABLE ROW LEVEL SECURITY;

-- Everyone signed in can read the library; only staff can edit it.
DROP POLICY IF EXISTS "barriers_read" ON public.barriers;
CREATE POLICY "barriers_read" ON public.barriers
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "barriers_admin_write" ON public.barriers;
CREATE POLICY "barriers_admin_write" ON public.barriers
  FOR ALL
  USING (public.is_admin_staff())
  WITH CHECK (public.is_admin_staff());

GRANT SELECT ON TABLE public.barriers TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.barriers TO authenticated;

-- ========== user_barriers ==========
CREATE TABLE IF NOT EXISTS public.user_barriers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  barrier_id UUID NOT NULL REFERENCES public.barriers(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('goal','intervention','general')),
  source_id TEXT,
  status TEXT NOT NULL DEFAULT 'trying' CHECK (status IN (
    'trying','helpful','not_helpful','abandoned'
  )),
  continue_likelihood INTEGER CHECK (
    continue_likelihood IS NULL OR continue_likelihood BETWEEN 1 AND 5
  ),
  feedback_note TEXT,
  tried_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  feedback_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_barriers_user_idx
  ON public.user_barriers (user_id);
CREATE INDEX IF NOT EXISTS user_barriers_source_idx
  ON public.user_barriers (user_id, source_type, source_id);

CREATE OR REPLACE FUNCTION public.set_user_barriers_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := NOW(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS user_barriers_set_updated_at ON public.user_barriers;
CREATE TRIGGER user_barriers_set_updated_at
  BEFORE UPDATE ON public.user_barriers
  FOR EACH ROW EXECUTE FUNCTION public.set_user_barriers_updated_at();

ALTER TABLE public.user_barriers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_user_barriers" ON public.user_barriers;
CREATE POLICY "own_user_barriers" ON public.user_barriers
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "admin_user_barriers_read" ON public.user_barriers;
CREATE POLICY "admin_user_barriers_read" ON public.user_barriers
  FOR SELECT USING (public.is_admin_staff());

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_barriers
  TO anon, authenticated;

COMMENT ON TABLE public.barriers IS
  'Library of common barriers with an evidence-informed strategy for each.';
COMMENT ON TABLE public.user_barriers IS
  'Which barriers a user chose to try, on which goal or intervention, and later feedback.';

-- ========== SEED: evidence-informed defaults ==========
-- Idempotent by (barrier_type, category, title).
CREATE UNIQUE INDEX IF NOT EXISTS barriers_seed_unique
  ON public.barriers (barrier_type, coalesce(category,''), title);

INSERT INTO public.barriers (barrier_type, category, title, strategy, tip, evidence_note)
VALUES
  -- TIME
  ('time', NULL, 'I don''t have time',
    'Shrink the goal. If 30 minutes feels impossible, do 5. Consistency beats duration.',
    'Anchor it to something you already do daily — brushing teeth, morning coffee.',
    'BJ Fogg''s Tiny Habits research: small consistent actions build durable change.'),
  ('time', 'exercise', 'Workouts take too long',
    'Try two 10-minute walks instead of one 30-minute session. Movement adds up.',
    'A brisk walk after lunch and after dinner meets most weekly targets.',
    'WHO 2020: activity bouts as short as 5 minutes still count toward weekly totals.'),
  ('time', 'recipe', 'Cooking healthy food takes too long',
    'Batch one grain, one protein and one vegetable on Sunday. Mix and match all week.',
    'Sheet-pan meals cook while you do other things.',
    'Behavioural nutrition studies: meal prep predicts diet-quality maintenance.'),

  -- ENERGY
  ('energy', NULL, 'I''m too tired',
    'Do the smallest version once. Two minutes counts. Starting almost always changes how you feel.',
    'Put your walking shoes by the door tonight. Removing friction is the whole trick.',
    'Behavioural activation: action first, motivation follows.'),
  ('energy', 'meditation', 'I fall asleep meditating',
    'Sit up straight and keep your eyes half-open. Try a 3-minute guided body scan instead of silence.',
    'Morning right after coffee is usually the alertest window.',
    'Neuroscience of attention: novice practitioners do better with brief, guided sessions.'),
  ('energy', 'supplement', 'I forget to take them',
    'Put the bottle where you will trip over it — next to the kettle, on your desk.',
    'Set a phone reminder tied to a real cue, not a random clock time.',
    'Implementation-intention research (Gollwitzer): cue-based plans outperform intent alone.'),

  -- MOTIVATION
  ('motivation', NULL, 'I keep losing motivation',
    'Motivation is a wave. Design for the low days: pick the smallest possible version and let that be enough.',
    'Write down one reason this matters to you — read it on Monday mornings.',
    'Self-determination theory: connecting a goal to personal meaning sustains behaviour.'),
  ('motivation', 'habit', 'I lose interest after a week',
    'Track streaks visually. Don''t break the chain — but if you do, restart the next day, not next Monday.',
    'A calendar with an X per done day is the whole system.',
    'Habit-formation studies (Lally 2010): missing one day does not reset the trajectory.'),
  ('motivation', 'exercise', 'I''d rather do anything else',
    'Pair the workout with something you enjoy — a podcast, a phone call, a favourite playlist.',
    'Temptation bundling: only listen to that podcast while walking.',
    'Milkman et al., Wharton: temptation bundling raises adherence by 10–29%.'),

  -- KNOWLEDGE
  ('knowledge', NULL, 'I don''t know if I''m doing this right',
    'Aim for "good enough". Check one trusted source, then act. Perfection is the enemy of consistency.',
    'Trust one guide, not five. Fewer inputs, more action.',
    'Analysis paralysis: too many options reduce follow-through.'),
  ('knowledge', 'supplement', 'I''m not sure supplements actually help',
    'Discuss with your clinician before starting. Prescope''s recommendations are based on your questionnaire and any lab results, not a guess.',
    'Ask: what am I trying to change, and how will I know it worked?',
    'Evidence-based supplementation depends on documented deficiency or a clear mechanism.'),
  ('knowledge', 'recipe', 'I don''t know what "healthy" means for me',
    'Start with the plate rule: half vegetables, a quarter protein, a quarter whole grains. Add fruit and water.',
    'One new vegetable per week beats an overhaul.',
    'Harvard Healthy Eating Plate: simple, evidence-based visual model.')
ON CONFLICT (barrier_type, coalesce(category,''), title) DO NOTHING;
