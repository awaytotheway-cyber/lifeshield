# Breast Cancer Risk Screening Protocol — Gap Analysis & Implementation Plan

**Source:** `Breast_Cancer_Risk_Screening_Questionnaire_and_Pathway.docx` (Clinical Protocol Draft v1.0)
**Audited against:** branch `claude/serene-turing-jorx62`, 2026-10-27
**Method:** every claim below was checked in the code, and the ones marked **[verified]** were additionally proven by running the code with a probe input — not inferred from reading.

---

## 1. Bottom line

The app is **much further along than "not built"**. The protocol's skeleton is implemented and, in places, implemented with unusual care: the questionnaire is essentially complete, all 14 intervention rows exist, escalation distinguishes a CTC hard-stop from a BRCA referral exactly as §3 does, the mid-questionnaire red-flag interrupt fails closed, and the iodine hard-stop is enforced in two places.

But the audit found **six defects where the engine does something the protocol says it must not**, and one pathway rule that locks patients out of the app. These matter more than anything missing, because a missing feature is visible and a wrong rule is not. In priority order:

| # | Finding | Why it ranks here |
|---|---|---|
| **S1** | Lab results are matched on free text — a **normal** result names the marker and triggers the **abnormal** finding **[verified, 5/5]** | Generates interventions for patients whose results were fine |
| **P1** | Declining any one of BRCA / CTC / SNP **locks the patient out** of questionnaire, Tests, Shop, plan and follow-up | Contradicts "may decline"; makes consent effectively mandatory |
| **S2** | A **negative** thyroid-antibody result is indistinguishable from **never measured** **[verified]**; iodine is drafted from a diet answer alone | The protocol's own contraindication needs *known-negative* |
| **S4** | Genetics: wildtype `CC` reads as **impaired**; one het copy triggers DUTCH; `CT` is dropped **[verified]** | DUTCH Rule A requires homozygous or double-het |
| **S3** | "Elevated toxin exposure" intervention fires from **questionnaire answers**; the protocol says "on testing" | Sauna/glutathione plan without a test |
| **S5** | Heavy-metal rules don't match §4 of the rules matrix | Over-orders one way, under-orders the other |
| **S6** | "Hormone exposure" means *ever* used the pill, not active or <12 months | Over-triggers DUTCH, stool and the interaction check |

Everything else (age gate, BRCA indication, Tier 1 ordering, consent evidence framing, follow-up cadence, scoring, PSS-4) is real but lower-risk.

**Mitigation worth stating honestly:** interventions are written as *drafts* that a clinician signs off (`sign_off_intervention`), so S1–S3 do not reach a patient unreviewed. They do put wrong drafts in front of the clinician, erode trust in the review queue, and S1 in particular would be indefensible if anyone asked "does the engine read normal results correctly?"

---

## Progress

**Phase 1 slice 1 — done 2026-10-27** (commits `c81f758`, `1692adc`, `e6112d0`; not pushed)

| Finding | Status | Commit |
|---|---|---|
| S1 free-text matching | ✅ Fixed. Eight structured finding keys; free text is display-only | `c81f758` |
| S2 antibodies tri-state / iodine | ✅ Fixed in the plan engine **and** in the store (see below) | `c81f758`, `1692adc` |
| P1 declining locks the patient out | ✅ Fixed. Gate is *decided*, not *agreed*; declines are reversible from Settings | `e6112d0` |
| S3 toxin plan drafted without a test | ✅ Fixed. Drafted only from a positive heavy-metal result | `a1ba163` |
| S5 heavy-metal rules | ✅ Fixed. Rule A literal; Rule B both limbs; ALT/AST now recordable | `ed4f760` |
| S6 hormone exposure had no recency | ✅ Fixed. New "when did you last use it?" follow-up; fact renamed `hormonalContraceptionRecent` | `7619a89` |
| S4 genetics: zygosity and genotype letters | ✅ Fixed. Zygosity on the four oestrogen genes; letters read only through a clinician-supplied table | `00ce55b` |

**Phase 1 is complete (tasks 1.1–1.7).** Test wiring commit: `3df4989`.

Evidence for slice 1: `tsc` 0 errors; new suites `test:findings` (6) and `test:consent-flow` (13) green; `labs-from-results` 15/15; `test:rules`, `test:purchase-gates`, `test:journey` green; full run 25 of 29 passing, the four failures being suites that were already red before this work and that it does not touch (`test:plan`'s `plan-groups`, `test:followup`, `test:feature-flags`, `test:menu`).

**Found while fixing, beyond the original audit** — each is now fixed and tested:

1. **The oldest result won.** `loadOwnTestResults` returns newest-first and the mapper let later rows overwrite earlier ones, so a retest was ignored in favour of the original value. This undermined §8's retesting. Fixed by ordering oldest-first inside the mapper.
2. **The store sold iodine to untested people.** `iodinePurchaseBlocked` blocked only on a positive result, so the protocol's "only if antibodies negative" held in the plan and not at the till. Now blocks unless measured negative, with a separate message for "not tested yet".
3. **Three places gated on the wrong flag and still compiled.** `agreed` and `decided` are both `ConsentFlags`, so the type-checker could not see that `session.tsx`, the consent screen and Home were gating on the wrong thing. All found by reading and fixed.
4. **Home told people to agree.** The Consents card read "1 of 3 · Agree on each to go on" for someone who had answered all three, and `homeNextConsents` said "Agree on each to continue".
5. **The Settings consents screen was read-only.** Declining only becomes acceptable if it is reversible, so it now lists the three consents with a status and a Change action.

6. **Nine test files ran under no script.** `cyp450`, `escalation`, `labs-from-genetic`, `rules-facts` and `tier4-inputs` cover exactly this clinical logic and never ran in `npm test`, so they could not have caught a regression. All nine pass and are now wired in.
7. **The ALT/AST limb of the heavy-metal rule could never fire.** `liverEnzymesElevated` was read by the engine and set by nothing. There is now a ninth finding, "Liver enzyme levels", to record it.
8. **Two panels could corrupt each other's zygosity.** The generic per-key merge in `plan.ts` let one panel's zygosity for one gene block another panel's zygosity for a different gene. The merge is now `applyGeneticLabs`, in the pure module and tested.

**Operational change for clinicians.** Result entry now has nine structured finding keys. A free-text note naming a marker no longer switches a finding on, and the combined `thyroid` row cannot record a *negative* antibody result — that must be entered under "Thyroid immune markers". Raised ALT/AST is recorded as "Liver enzyme levels". `test_results` has no rows yet, so nothing needed migrating.

**Behaviour changes to know about.**
- **A bare "variant" call no longer orders DUTCH.** `{ MTHFR: true }`, `"variant"` and `{ impaired: true }` say a variant exists but not how many copies, so they cannot show homozygous or double heterozygous. The reason text tells the clinician why.
- **Raw genotype letters (`CC`, `CT`, `TT`…) are unknown until the allele table is filled.** `GENOTYPE_TABLE` in `lib/labs-from-genetic.ts` ships empty on purpose: which allele is the reference for each SNP is a clinical fact for the clinicians to supply, and the partner payload format is still unsigned. No genetic results exist yet, so nothing is lost today, but the table has to be filled before a letters-only payload is useful.
- **Contraceptive answers saved before the recency question** are treated as *recent*, not old, and reload as unanswered so the form asks again. Over-flagging only over-orders a test; the alternative would silently drop the interaction check for someone who may be on the pill now.

**Needs review before launch.** The consent wording changed (`consentIntro`, `consentDecline`, `consentChoiceNote`, `consentsSettingsBody`, `homeNextConsents`). The standing disclaimer sentence is verbatim; the rest is a first draft for clinician and governance sign-off.

**Observation, not a fix.** `test:goals` was red at the start of this work and is green now. It was not touched, and its only date-dependent line is `start_date: todayYmd()`, so treat it as date-sensitive rather than repaired.

**Not verified in a running app.** The consent flow sits behind login, so none of it has been exercised end to end. A walkthrough with a test account should decline each of the three in turn, confirm the questionnaire / Tests / Shop stay reachable, and change an answer from Settings.

---

## 2. Coverage matrix

✅ present · ⚠️ present but diverges from the document · ❌ not built

### §2–3 Triage and Pathway A

| Protocol item | Status | Evidence / note |
|---|---|---|
| Triage question first; Yes → Pathway B | ✅ | `triage-store`, fails closed ("never treat failure as all clear") |
| Women ≥ 18; all men | ❌ | DOB checked only as "a real date"; no age rule anywhere → **P2** |
| Pathway B message ("contact your primary care physician… urgent / 2-week-wait") | ⚠️ | Copy is softer and generic → **P7** |
| Step 2 — BRCA/CTC counselling & consent | ⚠️ | Exists, but declining blocks the pathway → **P1** |
| Step 3 — BRCA offered "where indicated by ethnicity / family history" | ❌ | Offered to everyone; no indication logic → **P3** |
| Step 4 — CTC; positive → stop pathway | ✅ | `escalation.ts`, `ctcPositive` redirect in `_layout` |
| BRCA positive → referral, pathway stays open per specialist | ✅ | Deliberate; see decision **D3** (the document contradicts itself) |
| Step 5 — SNP after Tier 1 complete/declined, separate consent, home kit | ✅ | `genetic-tests-io`, kit statuses incl. `kit_dispatched`, saliva / buccal |
| Order BRCA / CTC after consent | ❌ | Consent only; results are typed in by admin → **P4** |
| Step 6 — questionnaire | ✅ | See below |
| Step 7 — Tier 3 baseline for all | ⚠️ | Correct tests; written only after the **last** questionnaire section → **P6** |
| Step 8 — Tier 4 directed by questionnaire + results | ⚠️ | Five rules exist; several diverge → **S4–S6** |
| Step 9–10 — MDT review, scheduled follow-up | ✅ / ⚠️ | Admin review queue + sign-off exist; follow-up cadence is flat → **F1** |
| Symptoms at any stage → Pathway B | ✅ | Mid-questionnaire interrupt (nipple discharge / skin change / lump) |

### §4 Questionnaire — essentially complete

Every field in 4.1–4.9 is captured, including the *detail* the protocol asks for: contraceptive type and years, amenorrhoea episodes and cause, age at first birth, breastfeeding months, radiation type/area/dates, night-shift years, relatives with age at diagnosis, cigarettes/day and years, exercise types and duration, commute, cosmetics, and dated mammograms with findings. Two small items:

| Item | Status |
|---|---|
| Pack-years | inputs captured (`cigsPerDay`, `smokingYears`), never computed — trivial |
| Contraceptive "type, duration, **current use**" | ⚠️ live question is *"Have you used hormonal contraception?"* — hormonal-only (good) but *ever* used: no current / recent distinction → feeds **S6** |

### §5 Consent, §6 Testing, §7 Interventions, §8 Follow-up

| Protocol item | Status | Evidence / note |
|---|---|---|
| Separate consent per BRCA / CTC / SNP | ✅ | Three distinct consents, sequential |
| Evidence status of each test made clear; "outside national screening guidelines" | ❌ | Zero mentions in `copy.ts` → **P5** |
| All 14 intervention rows | ✅ | `FINDING_INTERVENTION_TABLE`, complete |
| Iodine blocked if antibodies positive | ✅ / ⚠️ | Blocked on *positive*; doesn't require *known negative* → **S2** |
| Interaction check (hormones, anticoagulants) | ✅ | `contraindication_codes` + `clinician_interaction_check`; CYP450 flag feeds it |
| CYP450 pharmacokinetic flag | ✅ | `hasPharmacokineticFlag` → `clinician_interaction_check` |
| Re-check markers at an interval set **at review**, per what was abnormal | ❌ | Flat 14-day retest → **F1** |
| Re-triage for symptoms at **every** follow-up contact | ⚠️ | 90-day scheduled recheck exists; not verified at every contact → **F3** |
| Document consent status at each review | ❌ | → **F2** |

### "Refinements" section

| Refinement | Status |
|---|---|
| Iodine hard-stop | ✅ (see S2) |
| Mid-questionnaire red-flag escalation | ✅ |
| Medication / interaction cross-check | ✅ partial — thyroxine coverage unverified → **R4** |
| Conditional lab bundling (Tier 3 at eligibility) | ❌ → **P6** |
| Explicit SNP→DUTCH trigger rules | ⚠️ coded as booleans, no zygosity → **S4** |
| Scored lifestyle-burden profile | ❌ → **R1** |
| Validated scales (PSS-4) | ❌ → **R2** |
| Unbundled consent toggles | ⚠️ unbundled but mandatory → **P1** |

---

## 3. Findings in detail

### Safety and correctness — fix first

**S1 · Results mapper reads free text, not findings** `lib/labs-from-results.ts` **[verified]**
`labsFromTestResults` joins `test_name + plain_name + result_value + reference_range` into one string and sets a finding when it merely *contains* a keyword — with no check of the flag. Probe results, each a **normal or negative** row:

```
FALSE POSITIVE  stoolBetaGlucuronidaseRaised  <- "Beta-glucuronidase within range"   (flag: normal)
FALSE POSITIVE  zonulinPositive               <- "Zonulin negative"                  (flag: negative)
FALSE POSITIVE  stoolDysbiosis                <- "No dysbiosis detected"
FALSE POSITIVE  snpMthfr                      <- "MTHFR wildtype / normal"
FALSE POSITIVE  inflammatoryOxidativeBurden   <- "Oxidative stress markers normal"
```

Each of those would draft Calcium-D-glucarate, vitamin D + A, methyl donors, or the anti-inflammatory stack for a patient whose result was fine. The existing test is titled *"…without treating every stool row as every finding"* — it guards cross-contamination between findings and never tests a negative, which is why it passes.
**Fix:** admin result entry records a **structured finding** — `{ finding, state: present | absent | not_measured }` — and the mapper reads only that. Free-text stays as display only.

**S2 · Negative antibodies ≡ not measured** `lib/labs-from-results.ts`, `lib/rules-engine.ts` **[verified]**
`thyroidAntibodiesPositive` is `null` after a *negative* antibody result and `null` with no result at all. The protocol's Group A requires antibodies **negative** — a known state — and the iodine row says "only if thyroid antibodies negative". The engine can only block on *positive*, so:
- the `iodine` intervention is drafted from a **diet questionnaire alone** (`findingIsPresent`: "dietary iodine answers stand in until a urine result exists") with antibodies unmeasured and no urine test; and
- `shouldOrderUrinaryIodine` recommends the test with antibodies unknown.

**Fix:** make antibodies tri-state (`positive | negative | unknown`). Iodine **supplementation** requires `urinaryIodine = low` *measured* **and** `antibodies = negative` *measured*. Keeping diet as a reason to *offer the urine test* is fine; using it to draft the supplement is not. Preserve the existing hard-stop on positive.

**S3 · Toxin intervention fires without a test** `lib/rules-engine.ts` `findingIsPresent("toxin")`
Draws on `occupationIsHighRisk || pollutantExposure || vehicleExhaust` — questionnaire answers. The protocol row is "Elevated toxin exposure **on testing**". The questionnaire should *order* the heavy-metal panel (S5); only a positive result should draft sauna / magnesium baths / glutathione.
**Fix:** `toxin` present only when `elevatedToxinExposure === true` from a result.

**S4 · Genetics: zygosity and genotype handling** `lib/labs-from-genetic.ts`, `lib/rules-engine.ts` `hasHormoneSnp` **[verified]**

```
true       MTHFR genotype 'CC'   (wildtype for C677T)      <- wildtype read as impaired
undefined  MTHFR genotype 'CT'   (single heterozygous)      <- silently dropped
true       MTHFR 'heterozygous'  (one copy only)            <- should not trigger DUTCH
true       COMT  'homozygous'                               <- correct
```

Two separate faults. (a) The genotype whitelist treats `tt`, `aa`, `gg` **and `cc`** all as impaired, but which letter is the variant depends on the SNP — for C677T, `CC` is the normal genotype. (b) Everything collapses to a boolean, so a single het copy triggers DUTCH; Rule A says *homozygous variant or double heterozygous combination* across CYP1A1 / CYP1B1 / COMT / MTHFR.
**Fix:** represent each gene as `ref | het | hom | unknown`; interpret genotype strings through a per-SNP table (rsID, reference allele, variant allele) that clinicians own, and return `unknown` for anything unrecognised. DUTCH Rule A = any `hom`, or ≥ 2 genes `het`. The partner payload format is still unsigned (documented in the file), so the table + enum is the stable interface to build against.

**S5 · Heavy-metal rules don't match §4 of the rules matrix** `lib/rules-engine.ts` `shouldOrderHeavyMetals`

| | Document | Engine |
|---|---|---|
| Rule A | occupation (industrial, welding, dentistry), predatory fish, well water | **also** fires on pollutant exposure and vehicle exhaust alone |
| Rule B | elevated ALT/AST **OR** Gilbert's **+** high pollutant/exhaust | requires Gilbert's **AND** elevated enzymes; elevated enzymes **alone** never fires |

So any pollutant exposure orders the panel (over-order), while raised ALT/AST without Gilbert's never does (under-order). Separately, `HIGH_RISK_OCCUPATIONS` lists `construction`, `manufacturing` and `mining` beyond the document's *"industrial occupation, welding, dentistry"*; the file flags its extensions as assumed.
**Fix:** implement Rule A and B literally; keep the assumed occupations only if a clinician confirms them.

**S6 · Hormone exposure has no recency** `lib/rules-facts.ts`, reproductive section
DUTCH Rule C is "**active or recent (<12 months)** systemic HRT or oral contraceptives". The live question is *"Have you used hormonal contraception?"* (seeded into `content_fields`, which overrides the in-code fallback *"Do you use contraception?"*). It is correctly hormonal-only, but it asks **ever**, so someone who stopped a decade ago sets `contraceptiveUse = true` — which then triggers DUTCH, stool analysis, and the DIM/I3C interaction check. `contraceptiveType` and `contraceptiveDurationYears` are captured and ignored by the engine. HRT already carries the right 12-month wording; contraception doesn't.
**Fix:** ask "currently, or in the last 12 months?" and derive `hormonalContraceptionRecent` from that plus type (oral / other hormonal). Also reconcile the two disagreeing labels so the code fallback can't silently differ from the seed.

### Pathway

**P1 · Declining a consent locks the patient out** `lib/consent-flow.ts`, `stores/consent-store.ts`, `app/(main)/_layout.tsx` **[verified]**
`allConsentsAgreed` requires `brca && ctc && snp`. A declined consent is stored `consented = false`, `firstIncompleteConsent` keeps returning it, and the layout redirects questionnaire / Tests / plan / follow-up / Shop / orders back to the consent screen. The Decline button's destination is **Home** — which is all they can reach. The code comments show this was deliberate ("Decline is saved but does not open the questionnaire"), but the document says the patient *may decline* BRCA, CTC is *if desired*, and the pathway continues when each is "completed **or actively declined**". As built, consent is a precondition for using the app, which undercuts the unbundled, freely-given consent §5 and the refinements ask for.
**Fix:** consent becomes three-state — `pending | agreed | declined`. Gate on **all decided**, not all agreed. A decline skips that test's ordering and nothing else. Re-offer from Settings → Consents.

**P2 · No age ≥ 18 rule** — DOB is validated only as a real calendar date; weight accepts from 20 kg. Women under 18 enter Pathway A. Needs an eligibility check *before* the consents (DOB lives on the profile). Men: the document sets no age floor.
**P3 · BRCA offered to everyone** — "where indicated by ethnicity and/or family history of BRCA-positive relatives." Nothing evaluates indication. Note the document's own sequencing problem: family history is collected at step 6, *after* the step 3 offer — see **D2**.
**P4 · No Tier 1 ordering** — BRCA and CTC have consent and result-entry (which drives `escalation.ts`) but nothing creates the order. SNP has kit dispatch; Tier 1 doesn't.
**P5 · Consent copy omits evidence status** — §1 asks for materials that "make the evidence status of each test clear"; the refinement asks for explicit "outside standard national screening guidelines" notes. `copy.ts` has neither phrase.
**P6 · Tier 3 requisitioned late** — baseline bloods are written by `replaceTestOrders` in the *last* questionnaire section. The refinement asks for requisitions as soon as Pathway A is confirmed.
**P7 · Pathway B wording** — the protocol's text names the primary-care physician and an urgent / 2-week-wait specialist referral. The 2-week-wait is an NHS construct; see **D4**.

### Follow-up and refinements

**F1** Retests are a flat 14-day reminder (`retestDueDays`), not driven by *which* marker was abnormal, and no clinician-set interval at review.
**F2** Consent status isn't re-confirmed at each review (§8, last bullet).
**F3** Symptom recheck is scheduled every 90 days; not verified that every follow-up contact passes through it first.
**R1** No lifestyle-burden score. **R2** No PSS-4 (stress is the three-item module only). **R3** Cortisol is one abnormal/normal flag; DUTCH Rule B specifies a *diurnal rhythm* (flattened curve / elevated night). **R4** Interaction coverage for thyroxine unverified.

### Documented deviations already in the code (not defects — need a decision)

| Where | Deviation | Reason given |
|---|---|---|
| `shouldOrderUrinaryIodine` | Fires on low dietary iodine **alone**; document requires *and* high processed-food intake | "Agreed with the product owner" — cheaper to over-offer a urine test |
| `shouldOrderDUTCH` Rule B | Fires on stress alone while cortisol is unmeasured | "Phase 1 leans on the stress answer" |
| `shouldOrderStoolAnalysis` | Also fires on contraceptive / HRT | Proxy for impaired COMT while SNP is unavailable |

---

## 4. Decisions needed from you (before the work that depends on them)

| | Decision | Affects | My recommendation |
|---|---|---|---|
| **D1** | Should declining a test keep the patient in the pathway? | P1 | **Yes.** The document is explicit and the alternative makes consent mandatory. Confirm, since the current behaviour was a deliberate choice. |
| **D2** | How do we evaluate BRCA indication when family history comes *after* the offer? | P3 | Add a short 3-question pre-screen (ethnicity, relatives with breast/ovarian cancer, ages) before the BRCA screen, and show "recommended" vs "optional". Which ethnicities / criteria count as indicated is a **clinical-governance** input, not an engineering one. |
| **D3** | BRCA-positive: the §3 table says *pause*, the §3 narrative says *parallel / instead of SNP per specialist*. | escalation | Keep today's behaviour (referral, pathway open — `escalation.ts` documents why). Have the clinician confirm the document's intent. |
| **D4** | Jurisdiction. The protocol is NHS-flavoured (GP, 2-week-wait, formulary); the app prices in ₹ and the boards show Mumbai / Thane. | P7, wording | Localise referral wording for India; keep the escalation *logic* identical. |
| **D5** | Tier 1 ordering vs positioning. The Tests screen says *"Prescope does not book or interpret tests"*, and the app says it "does not diagnose, detect or treat". Ordering BRCA/CTC and drafting supplement plans sits uneasily with both. | P4 | Needs your mentor / governance lead. The protocol itself says several elements "should be reviewed by the responsible clinician(s) and governance/ethics lead before use". Build P4 behind a flag (`tier1_ordering_v1`, default off). |
| **D6** | Keep or close the three documented deviations above? | S6, DUTCH, iodine | Close DUTCH Rule B and the stool proxy once Tier 3 cortisol and SNP results exist (Tier 4 is meant to be *directed by baseline results*). Keep the iodine one only if the owner re-confirms. |
| **D7** | Scoring weights (R1) and PSS-4 cut-offs (R2) | R1, R2 | Clinician-supplied. Don't invent them — ship the structure, leave the weights as editable config. |

---

## 5. Implementation plan

**Ordering principle:** wrong rules before missing features; things that gate other things before things that don't. Each task is test-first, and every engine task uses the **document's exact thresholds** as its assertions. Existing suites to extend: `lib/rules-engine.test.ts` (`test:rules`), `lib/labs-from-results.test.ts`, and a new `lib/consent-flow.test.ts`. `test:plan` is red from before this work, but only because of `plan-groups.test.ts` — the `labs-from-results` half passes and can be relied on.

### Phase 1 — Correctness (blocks everything clinical)

| Task | Work | Files | Done when |
|---|---|---|---|
| **1.1** | **Structured findings (S1).** Add `{finding, state}` to result entry; migrate mapper to read it; free text becomes display-only. | `lib/labs-from-results.ts`, `lib/result-entry.ts`, admin `enter-results` page, migration for the column | For each of the 9 finding keys: `absent` and `not_measured` ⇒ not set; only `present` ⇒ set. The five probe cases above return `false`. |
| **1.2** | **Antibody tri-state + iodine (S2).** | `lib/rules-engine.ts`, `labs-from-results.ts` | Iodine supplement drafted only with *measured* low urinary iodine **and** *measured* negative antibodies; positive still hard-blocks; unknown blocks. |
| **1.3** | **Toxin from results only (S3).** | `lib/rules-engine.ts` | Occupation / exhaust answers alone ⇒ no `toxin` draft; they still order the heavy-metal test. |
| **1.4** | **Heavy-metal Rules A/B literal (S5).** | `lib/rules-engine.ts`, `lib/clinical-thresholds.ts` | Pollutant alone ⇒ no order. ALT/AST > 40 alone ⇒ order. Gilbert + exposure ⇒ order. |
| **1.5** | **Zygosity + per-SNP table (S4).** | `lib/labs-from-genetic.ts`, `lib/rules-engine.ts`, new `lib/snp-table.ts` | `CC` ⇒ ref; one het ⇒ no DUTCH; two hets ⇒ DUTCH; any hom ⇒ DUTCH; unknown string ⇒ unknown. |
| **1.6** | **Hormone exposure facts (S6).** | `reproductive.tsx`, `lib/questionnaire/schemas.ts`, `lib/rules-facts.ts`, `lib/copy.ts` | Hormonal contraception stopped > 12 months ago ⇒ no flag; currently on it, or stopped ≤ 12 months ago ⇒ flag; non-hormonal methods ⇒ no flag. |
| **1.7** | **Consent is three-state (P1).** *(needs D1)* | `lib/consent-flow.ts`, `stores/consent-store.ts`, `SequentialConsentScreen`, `app/(main)/_layout.tsx` | Declining any one test still reaches questionnaire, Tests and plan. Redirect logic for triage lock and CTC stop is **byte-identical**. |

**Phase 1 gate:** `test:rules`, `test:consent-flow` and the extended `labs-from-results` suite green; a re-run of the two probe scripts from this audit shows zero false positives.

### Phase 2 — Pathway fidelity

| Task | Work | Needs |
|---|---|---|
| **2.1** | Eligibility gate: adult check before consents (P2) | wording for the exit screen |
| **2.2** | Per-test evidence-status panel + off-guideline labels on the three consent screens; wording editable via `app_copy` (P5) | **clinician-approved copy** |
| **2.3** | Tier 3 requisitions written when Pathway A is confirmed; Tier 4 added later (P6) | — |
| **2.4** | BRCA pre-screen + "recommended / optional" (P3) | D2 |
| **2.5** | Tier 1 ordering behind `tier1_ordering_v1` (P4) | D5 |
| **2.6** | Pathway B copy localised (P7) | D4 |

### Phase 3 — Follow-up (§8)

| Task | Work |
|---|---|
| **3.1** | Marker-specific retests: an abnormal marker creates a retest item for *that* marker; interval set by the clinician at review (F1) |
| **3.2** | Consent re-confirmation follow-up at each review (F2) |
| **3.3** | Every follow-up action passes through the symptom question first (F3) |

### Phase 4 — Refinements

| Task | Work | Needs |
|---|---|---|
| **4.1** | Diurnal cortisol: four timepoints + shape classification, so DUTCH Rule B can be literal (R3) | — |
| **4.2** | Lifestyle-burden score as a pure function; sorts the admin review queue (R1) | D7 |
| **4.3** | PSS-4 alongside the existing stress items (R2) | D7 |
| **4.4** | Interaction matrix audit incl. thyroxine (R4) | clinician |
| **4.5** | Close the documented deviations (D6) | D6 |

### Suggested first slice

**1.1 → 1.2 → 1.7.** S1 and S2 are the two that could most embarrass the product; P1 is the one that locks real users out. All three are independent of the open decisions except D1, which has a clear recommendation.

---

## 6. What I did not audit

- **Rendering.** Nothing here was exercised in a running app; findings are from code and probe scripts.
- **The admin back-office.** Whether result entry already has structured fields (it appears not) is inferred from the mapper's reliance on free text.
- **Database state.** Seeded intervention templates were not diffed against `FINDING_INTERVENTION_TABLE`, and may have been edited in the admin.
- **Supplement dosing and formulary.** The document explicitly leaves these to the responsible clinician.

---

## Progress — Phase 2 (unblocked items)

| Task | Commit | What changed |
|---|---|---|
| **2.1** Age gate (P2) | `92a1265` | `lib/eligibility.ts` (pure, injectable clock; boundary-tested: exact 18th birthday, day before, 29 Feb, future date). Layout gate sends missing details to a two-field screen and under-age to a plain exit (not Pathway B). Settings stays reachable. Anything not exactly "male" takes the floor; **men have no floor, as the document is written**. Demographics and Profile saves refresh the gate. |
| **2.3** Tier 3 timing (P6) | `0cad672` | Baseline written when the pathway opens (triage clear + eligible + all consents answered + no CTC positive), insert-only. **Found on the way:** the old final submit deleted every `test_orders` row and re-inserted, which would have erased a paid order (`ordered`) and recreated it as unpaid. Replaced by `planOrderSync`, which only touches `recommended` rows. Early rows no longer mark Tests / "Test plan ready" done before the questionnaire is. |
| **2.2** Evidence status (P5) | (this commit) | Per-test "outside standard national screening guidelines" note on each consent screen plus "does not replace invited screening". Draft wording, overridable via `app_copy` keys `consent_evidence_<brca\|ctc\|snp>_label/_body` and `consent_evidence_footnote`. |

### Review before launch (Phase 2)
- **Clinician sign-off on the evidence wording** (2.2) and the under-18 exit copy (2.1). They are statements of clinical fact shown to patients.
- **Decision for the owner:** should the 18+ floor apply to men too? The document sets none; a minor also cannot give the three consents. One-line change in `eligibilityFor`.
- Existing users with no date of birth or sex are asked once, before the consents. Existing under-18 women with data are excluded on next load.
- The early baseline write assumes `ctcPositive` has loaded; a CTC result can only arrive after the baseline already exists, so the worst case is the baseline is already there.
- Not yet exercised with a logged-in account (login-gated): walk through sign-up → symptom check → eligibility → three consents → Tests tab.

## Progress — Phase 3 (follow-up)

Commit `d90c77b`.

| Task | What changed |
|---|---|
| **3.1** F1 marker retests | `lib/retest-schedule.ts`: only a marker whose **latest** result is abnormal (low / high / critical / positive) gets a retest; a normal latest result clears it; a later abnormal result earns a fresh one after an earlier retest. Due = result date + interval, never in the past. A retest a reviewer already added (same title) is left alone. New admin **Follow-ups** page for owner/admin staff to add/edit the date. |
| **3.3** F3 symptom at every contact | Hub no longer has an in-place "Mark done". Every non-symptom item starts with the symptom question; Yes → Pathway B and the item stays open. |
| **3.2** F2 consents at review | After the symptom question a review shows the three consents (Agreed / Declined / Not answered), with confirm or change. Confirming completes the review and writes a dated one-line record onto the row's note. |

### Review before launch (Phase 3)
- **The default interval is still the assumed 14 days.** The protocol wants it set by the clinician at review; that is only true where staff add the row on the admin page. A per-marker default table needs a clinical decision.
- Clinicians (non-admin) can read follow-ups but cannot create them: RLS gives write to owner/admin staff only.
- The consent record is stored in `follow_ups.plain_note`, which the patient also sees. A stopgap; a proper audit table is the clean fix.
- The "symptom answered" memory is per session and in the app only. It stops the UI skipping the question; it is not server enforcement. The answer itself is not logged anywhere (a Yes locks Pathway B; a No leaves no row).
- The old `test:followup` suite still fails (it imports Supabase through `follow-ups.ts`); not touched, as agreed.

## Progress — Phase 4 (what could start without a decision)

Commit `f1612d3`.

| Task | Status | What changed / why it stopped |
|---|---|---|
| **4.1** Diurnal cortisol (R3) | ✅ in part | New reviewer finding `cortisolRhythm` (abnormal = flattened curve or raised night level) feeds `cortisolAbnormal`; `salivaryCortisol` is read by key and flag, and a measured **normal** now sets false, which closes the "lean on the stress answer" proxy once cortisol exists (the D6 intent for DUTCH Rule B). The free-text match on the word "cortisol" is gone. **Not done:** four per-timepoint values with a computed curve shape: the thresholds for "flattened" are clinical and were not invented. |
| **4.4** Interaction audit (R4) | ✅ in part | Audit: hormones, blood thinners and the CYP450 pharmacokinetic flag were covered; **thyroid replacement was invisible**. Now a fact (`thyroid_medication` tag or a recognised name such as levothyroxine / Eltroxin / Thyronorm) and a `thyroid_medication` product flag that needs a practitioner check. **Not done:** deciding *which* products or interventions interact with thyroxine, which is a clinical list; and showing it to admin reviewers (their view reads only the questionnaire). |
| **4.2** Lifestyle burden score (R1) | ⏸ blocked | Needs the weights (D7). A scorer with no weights would be dead code. |
| **4.3** PSS-4 (R2) | ⏸ blocked | Needs D7 cut-offs **and** a licence check on the item wording before it ships. |
| **4.5** Close deviations (D6) | ⏸ blocked | Needs D6. The DUTCH Rule B proxy now closes itself when cortisol is measured; the stool proxy and the iodine deviation are untouched. |

### Review before launch (Phase 4)
- Clinician to confirm: which products carry `thyroid_medication`; the thyroid-replacement name list in `lib/rules-facts.ts`.
- Reviewers must record `cortisolRhythm` for DUTCH Rule B to see an abnormal curve. Until then only a flagged `salivaryCortisol` result counts.

## Progress — aligning to the document (2026-10-28)

| Item | What changed |
|---|---|
| Deviations closed (D6) | Iodine, stool and DUTCH Rule B now follow the document literally; tests rewritten to match. New fact `highProcessedFoodIntake` (packaged food daily or weekly). |
| Tier 4 after results | `refreshTier4Orders` re-runs the rules with real labs when the Tests screen loads. Scoped to tiers 3 and 4; bought orders untouched; stale rows dropped only when the questionnaire is complete. |
| Order sync scoped by tier | `planOrderSync` takes `tiers`; every caller names the tiers it owns, so Tier 1 and Tier 3/4 cannot delete each other's rows. |
| Pathway B wording (P7) | The document's own instruction. |
| BRCA indication (P3) | Family history now asks about a BRCA-positive relative. `brcaIndicated` = relative OR configured ethnicity; the ethnicity list ships empty. |
| Tier 1 ordering (P4) | `refreshTier1Orders` behind `tier1_ordering_v1` (default off). |
| Not done | Lifestyle-burden score and PSS-4 (no weights or cut-offs in the document; PSS-4 licence unchecked). Per-timepoint cortisol curve (no thresholds in the document). BRCA "recommended / optional" label on the consent screen. |
