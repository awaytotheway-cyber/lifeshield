# Prescope — open decisions

Everything below is waiting on a person, not on engineering. Each line says what is blocked, what I recommend, and who can answer. Nothing here has been guessed into the app.

Status of the work: Phases 1–3 done; Phase 4 half done. See `2026-10-27-protocol-gap-analysis-and-plan.md` for the detail.

---

## Settled by following the protocol document (2026-10-28)

On the instruction to stick to the mentor's document, these are no longer open. Each is now built the way the document is written.

| Was | Now |
|---|---|
| **B2** Deviations (D6) | All three closed. Urinary iodine needs antibodies known negative AND (subclinical hypothyroidism OR low dietary iodine WITH high processed-food intake). Stool analysis no longer fires on hormone use standing in for COMT. DUTCH Rule B needs a measured abnormal cortisol as well as stress. |
| **B3** Pathway B wording | Uses the document's instruction: contact the primary care physician immediately for an urgent / 2-week-wait specialist referral. Note it is NHS wording; reword for India only if you decide to depart from the document. |
| **B1** Men's age floor | Left as the document has it: all men, no floor. Say if you want a floor. |
| **C1** Tier 1 ordering | Built as the document words it (BRCA if indicated and consented; CTC if consented), behind the flag `tier1_ordering_v1`, **off**. The document itself asks for governance review before use, so switching it on is the one step left, per account or by default. |
| Tier 4 "directed by Tier 3 results" | Was never true: Tier 4 was evaluated once, before any result existed. It is re-run when the Tests screen loads. |

Still genuinely open, because the document gives no value for it: the BRCA-indicated **ethnicity list** (A8; the relative question is now asked, the list ships empty), the genotype table (A2), re-test intervals (A3), thyroxine product list (A4), scoring weights and PSS-4 (A5, C4), and the clinician-wording review (A1).

---

## A. For the clinician (clinical facts shown to patients, or clinical rules)

| # | Question | Blocks | Recommendation |
|---|---|---|---|
| A1 | **Review the patient-facing wording.** Three drafts, all editable without a release: the "outside standard national screening guidelines" note on each consent screen; the under-18 exit screen; the consents-at-review screen. | Launch | Read them in the app (consent screens) and in `lib/consent-evidence.ts` and `lib/copy.ts`. |
| A2 | **Genotype table.** For each of MTHFR, COMT, CYP1A1, CYP1B1: which letter is the reference allele and which is the variant? | Reading any genetic result by genotype letters | It ships empty on purpose. Until it is filled, only plain words ("heterozygous", "wildtype") are understood. |
| A3 | **Default re-test interval per abnormal marker.** The app uses 14 days, an assumption, until staff add a dated re-test. | Re-test dates | Give one interval per marker (or per tier). |
| A4 | **Which products or interventions interact with thyroxine?** The mechanism exists (tag `thyroid_medication` on a product). Nothing is tagged. | Thyroid interaction check | Give the list. Also confirm the medication names the app recognises (levothyroxine, Eltroxin, Thyronorm, Euthyrox, Synthroid, liothyronine, Unithroid, Cytomel). |
| A5 | **Lifestyle-burden score weights and PSS-4 cut-offs (D7).** | Scoring, and ordering the review queue by burden | Supply weights; the structure is easy once they exist. Do not use made-up numbers. |
| A6 | **Cortisol curve.** Is "flattened curve or raised night level" the right definition of an abnormal rhythm, and do you want per-timepoint values captured later? | Nothing now | The reviewer records one outcome today. Per-timepoint capture needs your thresholds. |
| A7 | **BRCA positive (D3).** The protocol table says pause; the narrative says run in parallel or instead of SNP per the specialist. Which was meant? | Escalation rules | Keep today's behaviour (referral, pathway stays open) and confirm. |
| A8 | **BRCA indication (D2).** Which ethnicities and family-history criteria count as "indicated"? | Showing BRCA as "recommended" or "optional" | Needs a short three-question pre-screen; criteria are yours. |

## B. For the product owner (you)

| # | Question | Blocks | Recommendation |
|---|---|---|---|
| B1 | **Should the 18+ floor apply to men?** The document sets none; a minor also cannot give the three consents. | Age gate | Apply it to everyone. One-line change. |
| B2 | **Deviations (D6).** Keep or close: (a) stool analysis also fires on contraceptive/HRT use as a stand-in for COMT; (b) iodine test fires on low dietary iodine alone, where the document also wants high processed-food intake. | Rule accuracy | Close (a) once SNP results exist. Keep (b) only if you re-confirm it. DUTCH Rule B already closes itself once cortisol is measured. |
| B3 | **Localising Pathway B (D4).** The wording is NHS (GP, 2-week-wait). The app prices in ₹ and shows Mumbai and Thane. | Pathway B copy | Localise the wording; keep the escalation logic identical. |
| B4 | **Who can add follow-ups?** Only owner and admin staff can. Clinicians can read but not add re-tests. | Clinician-set re-test dates | Let clinicians write for their own patients. |
| B5 | **Launch discoverability.** New users are not discoverable in buddy search until launch. When, and with what consent wording? | Buddies | Decide at launch review. |

## C. For governance / your mentor

| # | Question | Blocks | Recommendation |
|---|---|---|---|
| C1 | **Ordering BRCA and CTC from inside the app (D5).** The app says it does not book, interpret or diagnose. Ordering Tier 1 tests and drafting supplement plans sits uneasily with that. | Tier 1 ordering | Build it behind a flag, off by default (`tier1_ordering_v1`), and decide before it is switched on. |
| C2 | **Keep a proper consent record?** At each review the consent status is written as one line onto the follow-up note, which the patient also sees. | Audit quality | Replace with a dedicated audit table. Needs a migration. |
| C3 | **Log the symptom answer at follow-up contacts?** Today a "No" leaves no record; a "Yes" locks Pathway B. | Audit quality | Log it if the protocol needs proof the question was asked. |
| C4 | **PSS-4 licence.** Is the item wording free to use in a commercial product? | PSS-4 | Check before building it. |

## D. Technical, needs your go-ahead

| # | Item | Why it waits |
|---|---|---|
| D1 | **Apply `20261027_reconcile_buddy_discovery.sql`.** The live buddy search lacks block exclusion and a minimum search length, and a duplicate search function is still live. | The sandbox blocked the apply. You or I with your permission. |
| D2 | **Push the 17 local commits.** | I only push when you say so. |
| D3 | **Account-deletion cleanup** for buddy chats, connections and reports. | Needs a server function; the tables have no owner-delete rule. |
| D4 | **Admin reports queue** for blocked/reported buddies. | Not built. |
| D5 | **Walk the whole flow with a logged-in test account** (sign-up → symptom check → age and sex → three consents → Tests → follow-up). | Never done; login-gated. |
| D6 | **Four test suites already failing** (`test:plan`'s plan-groups half, `followup`, `feature-flags`, `menu`). | You said not to fix them. |

---

### If you only have time for five

1. **B1** (men's floor), **B2** (deviations), **B3** (India wording): quick, yours.
2. **A1** (read the wording): a clinician needs to read it before launch.
3. **C1** (Tier 1 ordering): the one with real positioning risk.
