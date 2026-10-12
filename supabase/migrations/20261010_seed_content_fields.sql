-- PRESCOPE — seed content_fields with the questions the app already ships,
-- and app_copy with the onboarding screen text.
--
-- Every seeded row is is_locked = true. That is not only about the rules
-- engine: the ten questionnaire screens render these inputs from code with
-- hardcoded Zod validation, so deactivating or retyping a seeded row in
-- admin could not change the form anyway — it would just desync the config
-- from reality. Locking them makes the contract honest: seeded questions are
-- reworded here, new questions are added here and render dynamically.
--
-- locked_reason distinguishes the two kinds of frozen row:
--   "rules engine" — lib/rules-facts.ts reads this key; changing its shape
--                    breaks a Tier 4 trigger or a safety hard stop
--   "app form"     — rendered from code, wording editable only
--
-- Idempotent: re-running refreshes structure but preserves admin wording,
-- because label/help_text are only written when the row is first inserted.

INSERT INTO public.content_fields
  (section, field_key, label, help_text, field_type, options, sort_order, required, is_locked, locked_reason)
VALUES
-- ---------- 1. Demographics ----------
('demographics','date_of_birth','Date of birth',NULL,'text','[]',10,true,true,'app form'),
('demographics','sex','Sex',NULL,'single_select',
  '[{"value":"female","label":"Female"},{"value":"male","label":"Male"},{"value":"other","label":"Other"}]',
  20,true,true,'app form — routes which sections apply'),
('demographics','height_cm','Height (cm)',NULL,'number','[]',30,true,true,
  'rules engine — with weight gives BMI, which triggers stool analysis'),
('demographics','weight_kg','Weight (kg)',NULL,'number','[]',40,true,true,
  'rules engine — with height gives BMI, which triggers stool analysis'),
('demographics','waist_cm','Waist (cm)','Optional. Used with hip for waist-to-hip ratio.','number','[]',50,false,true,'app form'),
('demographics','hip_cm','Hip (cm)','Optional.','number','[]',60,false,true,'app form'),
('demographics','ethnicity','Ethnicity',NULL,'single_select','[]',70,true,true,'app form'),
('demographics','country_of_origin','Country of origin',NULL,'single_select','[]',80,true,true,'app form'),

-- ---------- 2. Reproductive & menstrual ----------
('reproductive_menstrual','age_at_first_period','Age at first period',NULL,'number','[]',10,false,true,'app form'),
('reproductive_menstrual','contraceptive_use','Have you used hormonal contraception?',NULL,'yes_no',
  '[{"value":"yes","label":"Yes"},{"value":"no","label":"No"}]',20,true,true,
  'rules engine — triggers the DUTCH test and stool analysis'),
('reproductive_menstrual','hrt_use','Are you using, or have you used in the last 12 months, hormone replacement therapy (HRT)?',NULL,'yes_no',
  '[{"value":"yes","label":"Yes"},{"value":"no","label":"No"}]',25,true,true,
  'rules engine — triggers the DUTCH test and stool analysis, and flags DIM/I3C and high-dose omega-3 for a practitioner check'),
('reproductive_menstrual','amenorrhoea','Have you had episodes of absent periods?',NULL,'yes_no',
  '[{"value":"yes","label":"Yes"},{"value":"no","label":"No"}]',30,true,true,'app form'),
('reproductive_menstrual','menstrual_regularity','Are your periods regular?',NULL,'single_select',
  '[{"value":"regular","label":"Regular"},{"value":"irregular","label":"Irregular"}]',40,true,true,'app form'),
('reproductive_menstrual','cycle_length_days','Usual cycle length (days)',NULL,'number','[]',50,false,true,'app form'),
('reproductive_menstrual','menopausal_status','Menopausal status',NULL,'single_select',
  '[{"value":"pre","label":"Pre-menopausal"},{"value":"peri","label":"Peri-menopausal"},{"value":"post","label":"Post-menopausal"}]',
  60,true,true,'app form'),
('reproductive_menstrual','pregnancies','Number of pregnancies',NULL,'number','[]',70,true,true,'app form'),
('reproductive_menstrual','live_births','Number of live births',NULL,'number','[]',80,true,true,'app form'),
('reproductive_menstrual','breastfeeding','Have you breastfed?',NULL,'yes_no',
  '[{"value":"yes","label":"Yes"},{"value":"no","label":"No"}]',90,true,true,'app form'),
('reproductive_menstrual','estrogen_conditions','Have you been told you have any of these?','Choose all that apply.','multi_select',
  '[{"value":"severe_pms","label":"Severe PMS"},{"value":"endometriosis","label":"Endometriosis"},{"value":"fibroids","label":"Uterine fibroids"},{"value":"none","label":"None of these"}]',
  95,true,true,
  'rules engine — oestrogen-dominant conditions trigger stool analysis (Rule A)'),

-- ---------- 3. Radiation & occupation ----------
('radiation_occupational','radiation_exposure','Have you had radiation exposure?','Medical or work-related.','yes_no',
  '[{"value":"yes","label":"Yes"},{"value":"no","label":"No"}]',10,true,true,'app form'),
('radiation_occupational','occupation','Occupation',NULL,'text','[]',20,true,true,
  'rules engine — matched against the high-risk occupation list for heavy-metal testing'),
('radiation_occupational','night_shift','Night-shift work',NULL,'single_select',
  '[{"value":"current","label":"Currently"},{"value":"past","label":"In the past"},{"value":"no","label":"No"}]',
  30,true,true,'app form'),

-- ---------- 4. Comorbidities ----------
('comorbidities','gilbert','Have you been told you have this mild bilirubin difference?','Gilbert syndrome.','single_select',
  '[{"value":"yes","label":"Yes"},{"value":"no","label":"No"},{"value":"dont_know","label":"I don''t know"}]',
  10,true,true,'rules engine — pairs with liver enzymes to trigger heavy-metal testing'),
('comorbidities','gallstones','Gallstones',NULL,'yes_no',
  '[{"value":"yes","label":"Yes"},{"value":"no","label":"No"}]',20,true,true,
  'rules engine — triggers stool analysis'),
('comorbidities','obesity','Obesity',NULL,'yes_no',
  '[{"value":"yes","label":"Yes"},{"value":"no","label":"No"}]',30,true,true,'app form'),
('comorbidities','diabetes','Diabetes',NULL,'yes_no',
  '[{"value":"yes","label":"Yes"},{"value":"no","label":"No"}]',40,true,true,'app form'),
('comorbidities','thyroid_disease','Thyroid condition',NULL,'yes_no',
  '[{"value":"yes","label":"Yes"},{"value":"no","label":"No"}]',50,true,true,'app form'),
('comorbidities','autoimmune_thyroid','Active autoimmune thyroid condition','Hashimoto''s or Graves''.','yes_no',
  '[{"value":"yes","label":"Yes"},{"value":"no","label":"No"}]',60,true,true,
  'SAFETY — this answer hard-blocks the urinary iodine recommendation. Do not change its shape.'),
('comorbidities','chronic_infections','Ongoing or repeated infections','Choose all that apply.','multi_select',
  '[{"value":"dental","label":"Dental"},{"value":"gut","label":"Gut"},{"value":"urinary","label":"Urinary"},{"value":"chest_respiratory","label":"Chest / respiratory"},{"value":"sinus","label":"Sinus"},{"value":"skin","label":"Skin"},{"value":"none","label":"None"}]',
  70,true,true,'rules engine — the "gut" option triggers stool analysis'),
('comorbidities','digestive_disturbance','Do you have ongoing digestive problems?','Choose all that apply.','multi_select',
  '[{"value":"bloating","label":"Ongoing bloating"},{"value":"reflux","label":"Reflux or heartburn"},{"value":"loose_stools","label":"Loose stools"},{"value":"constipation","label":"Constipation"},{"value":"none","label":"None of these"}]',
  80,true,true,
  'rules engine — persistent digestive disturbance triggers stool analysis (Rule B)'),

-- ---------- 5. Family history ----------
('family_history','breast_cancer','Family history of breast cancer',NULL,'yes_no',
  '[{"value":"yes","label":"Yes"},{"value":"no","label":"No"}]',10,true,true,'app form'),
('family_history','ovarian_cancer','Family history of ovarian cancer',NULL,'yes_no',
  '[{"value":"yes","label":"Yes"},{"value":"no","label":"No"}]',20,true,true,'app form'),
('family_history','colon_cancer','Family history of colon cancer',NULL,'yes_no',
  '[{"value":"yes","label":"Yes"},{"value":"no","label":"No"}]',30,true,true,'app form'),
('family_history','melanoma','Family history of melanoma',NULL,'yes_no',
  '[{"value":"yes","label":"Yes"},{"value":"no","label":"No"}]',40,true,true,'app form'),

-- ---------- 6. Personal history ----------
('personal_history','smoking','Smoking',NULL,'single_select',
  '[{"value":"current","label":"Currently smoke"},{"value":"former","label":"Used to smoke"},{"value":"never","label":"Never smoked"}]',
  10,true,true,'app form'),
('personal_history','vaping','Vaping',NULL,'yes_no',
  '[{"value":"yes","label":"Yes"},{"value":"no","label":"No"}]',20,true,true,'app form'),
('personal_history','alcohol_units_per_week','Alcohol (units per week)',NULL,'number','[]',30,true,true,'app form'),
('personal_history','recreational_drugs','Recreational drug use',NULL,'yes_no',
  '[{"value":"yes","label":"Yes"},{"value":"no","label":"No"}]',40,true,true,'app form'),
('personal_history','caffeine','Caffeine (drinks per day)',NULL,'single_select',
  '[{"value":"none","label":"None"},{"value":"1-2","label":"1-2"},{"value":"3-4","label":"3-4"},{"value":"5plus","label":"5 or more"}]',
  50,true,true,'app form'),

-- ---------- 7. Lifestyle ----------
('lifestyle','sleep_hours','Hours of sleep per night',NULL,'number','[]',10,true,true,'app form'),
('lifestyle','sleep_quality','Sleep quality',NULL,'single_select',
  '[{"value":"good","label":"Good"},{"value":"fair","label":"Fair"},{"value":"poor","label":"Poor"}]',20,true,true,'app form'),
('lifestyle','relationships','Relationships and social support',NULL,'single_select',
  '[{"value":"strong","label":"Strong"},{"value":"moderate","label":"Moderate"},{"value":"limited","label":"Limited"}]',30,true,true,'app form'),
('lifestyle','exercise_frequency','How often do you exercise?',NULL,'single_select',
  '[{"value":"daily","label":"Daily"},{"value":"3-5x","label":"3-5 times a week"},{"value":"1-2x","label":"1-2 times a week"},{"value":"rarely","label":"Rarely"},{"value":"never","label":"Never"}]',
  40,true,true,'app form'),
('lifestyle','water_intake','Water intake (litres per day)',NULL,'single_select',
  '[{"value":"lt1","label":"Under 1"},{"value":"1-2","label":"1-2"},{"value":"2-3","label":"2-3"},{"value":"3plus","label":"3 or more"}]',
  50,true,true,'app form'),
('lifestyle','place_of_work','Usual workplace',NULL,'text','[]',60,true,true,'app form'),
('lifestyle','pollutant_exposure','Are you around fumes or dirty air?',NULL,'yes_no_unsure',
  '[{"value":"yes","label":"Yes"},{"value":"no","label":"No"},{"value":"unsure","label":"Not sure"}]',70,true,true,
  'rules engine — triggers heavy-metal testing'),
('lifestyle','vehicle_exhaust','Regular exposure to vehicle exhaust',NULL,'yes_no',
  '[{"value":"yes","label":"Yes"},{"value":"no","label":"No"}]',80,true,true,
  'rules engine — triggers heavy-metal testing'),

-- ---------- 8. Stress ----------
('stress','stress_level','How would you rate your stress?',NULL,'single_select',
  '[{"value":"low","label":"Low"},{"value":"medium","label":"Medium"},{"value":"high","label":"High"}]',10,true,true,
  'rules engine — medium/high triggers the DUTCH test and the stress intervention'),
('stress','stress_view','Do you see stress as harmful, or as something to grow from?',NULL,'single_select',
  '[{"value":"harmful","label":"Mostly harmful"},{"value":"growth","label":"Something I can grow from"},{"value":"mixed","label":"A bit of both"}]',
  20,true,true,'app form'),
('stress','stress_reach_out','When stressed, do you reach out to people, pets, or community?',NULL,'single_select',
  '[{"value":"usually","label":"Usually"},{"value":"sometimes","label":"Sometimes"},{"value":"rarely","label":"Rarely"},{"value":"never","label":"Never"}]',
  30,true,true,'app form'),

-- ---------- 9. Diet & environment ----------
('diet_environment','canned_food','Canned or tinned food',NULL,'single_select',
  '[{"value":"daily","label":"Daily"},{"value":"weekly","label":"Weekly"},{"value":"monthly","label":"Monthly"},{"value":"rarely","label":"Rarely"},{"value":"never","label":"Never"}]',
  10,true,true,'app form'),
('diet_environment','packaged_food','Packaged or processed food',NULL,'single_select',
  '[{"value":"daily","label":"Daily"},{"value":"weekly","label":"Weekly"},{"value":"monthly","label":"Monthly"},{"value":"rarely","label":"Rarely"},{"value":"never","label":"Never"}]',
  20,true,true,'app form'),
('diet_environment','takeaway','Takeaway food and drinks',NULL,'single_select',
  '[{"value":"daily","label":"Daily"},{"value":"weekly","label":"Weekly"},{"value":"monthly","label":"Monthly"},{"value":"rarely","label":"Rarely"},{"value":"never","label":"Never"}]',
  30,true,true,'app form'),
('diet_environment','microwave','Microwave use',NULL,'single_select',
  '[{"value":"regularly","label":"Regularly"},{"value":"sometimes","label":"Sometimes"},{"value":"never","label":"Never"}]',40,true,true,'app form'),
('diet_environment','plastic','Plastic containers or wrap',NULL,'single_select',
  '[{"value":"regularly","label":"Regularly"},{"value":"sometimes","label":"Sometimes"},{"value":"never","label":"Never"}]',50,true,true,'app form'),
('diet_environment','suncream','Suncream',NULL,'single_select',
  '[{"value":"daily","label":"Daily"},{"value":"when_sunny","label":"When sunny"},{"value":"rarely","label":"Rarely"},{"value":"never","label":"Never"}]',60,true,true,'app form'),
('diet_environment','nail_varnish','Nail varnish or gels',NULL,'single_select',
  '[{"value":"regularly","label":"Regularly"},{"value":"occasionally","label":"Occasionally"},{"value":"never","label":"Never"}]',70,true,true,'app form'),
('diet_environment','iodine_sources','Which of these do you have regularly?','Iodine sources.','multi_select',
  '[{"value":"iodised_salt","label":"Iodised salt"},{"value":"seafood","label":"Seafood"},{"value":"seaweed","label":"Seaweed"},{"value":"dairy","label":"Dairy"},{"value":"none","label":"None of these"}]',
  80,true,true,'rules engine — "none of these" triggers urinary iodine testing'),
('diet_environment','predatory_fish','How often do you eat large fish such as tuna, swordfish, shark, or king mackerel?',NULL,'single_select',
  '[{"value":"daily","label":"Daily"},{"value":"weekly","label":"Weekly"},{"value":"monthly","label":"Monthly"},{"value":"rarely","label":"Rarely"},{"value":"never","label":"Never"}]',
  90,true,true,
  'rules engine — daily or weekly triggers heavy-metal testing (Rule A)'),
('diet_environment','well_water','Does your drinking water come from a well or borehole?',NULL,'yes_no_unsure',
  '[{"value":"yes","label":"Yes"},{"value":"no","label":"No"},{"value":"unsure","label":"Not sure"}]',
  95,true,true,
  'rules engine — well water triggers heavy-metal testing (Rule A)'),

-- ---------- 10. Prior screening ----------
('prior_screening','previous_mammogram','Have you had a mammogram before?',NULL,'yes_no',
  '[{"value":"yes","label":"Yes"},{"value":"no","label":"No"}]',10,true,true,'app form')

ON CONFLICT (section, field_key) DO UPDATE
  SET field_type    = EXCLUDED.field_type,
      options       = EXCLUDED.options,
      sort_order    = EXCLUDED.sort_order,
      required      = EXCLUDED.required,
      is_locked     = EXCLUDED.is_locked,
      locked_reason = EXCLUDED.locked_reason;
      -- label and help_text intentionally not overwritten: admin wording wins.

-- ========== onboarding copy ==========
INSERT INTO public.app_copy (copy_key, value, description, is_regulatory) VALUES
  ('welcomeTitle','Welcome to PRESCOPE','Onboarding — welcome screen heading',false),
  ('welcomeBody','A calm, step-by-step look at your breast-health risk factors.','Onboarding — welcome screen body',false),
  ('welcomeContinue','Get started','Onboarding — welcome screen button',false),
  ('tagline','A lifestyle awareness tool — not a diagnostic or medical app.','Regulatory disclaimer shown on home and onboarding',true)
ON CONFLICT (copy_key) DO NOTHING;
