# PR body — `claude/serene-turing-jorx62` → `main`

Copy this into the PR description on github.com.

---

Brings onto `main`:

1. **Moss design language**, applied across the whole app. The old blue-glass palette and the illustration set are deleted. One ink button per screen, 20/4/999 radii only, no borders or shadows, `TwoTone` headlines.
2. **Protocol compliance** for the breast-cancer screening pathway (per the mentor's clinical doc):
   - Age ≥18 gate before consents, with a plain under-18 exit screen (women/other only; the document sets no floor for men).
   - Tier 3 baseline tests requisitioned when the pathway opens, not after the questionnaire.
   - **Tier 4 rules now follow the document literally.** The three documented deviations are closed: urinary iodine needs antibodies known-negative *and* either subclinical hypo or low iodine + high processed-food intake; stool analysis no longer uses hormone use as a COMT proxy; DUTCH Rule B needs a measured abnormal cortisol as well as stress. Tier 4 is now re-evaluated when the Tests screen loads, so a result finally feeds the rules it was meant to.
   - Marker-specific re-tests (only abnormal markers, interval set at review), symptom question at every follow-up contact, consents confirmed and recorded at every review.
   - Diurnal cortisol rhythm reader-finding, thyroid-replacement interaction check.
   - Pathway B wording uses the protocol's own instruction.
   - BRCA indication (relative question + ethnicity list) + Tier 1 ordering behind `tier1_ordering_v1` (off by default, needs governance).
   - Consent screens carry the "outside standard national screening guidelines" note, editable from app-copy.
3. **Buddies + chat end-to-end fixes.** Two live-database bugs found and fixed:
   - Nobody could send a buddy request (the policy's inline subquery read someone else's profile, which RLS refuses).
   - A requester could accept their own request.
   - Live search now excludes blocked members, enforces a 2-character minimum, escapes `%`/`_` wildcards and matches on the display name rather than the surname.
4. **Admin — Reports and Blocks pages.** Open-first report queue, status filter, per-report detail with the reported message only (not the thread), subject card with other-reports/blocks counts and a "hide from search" action. Blocks: most-blocked list plus latest blocks. Staff-only; built on a new `blocks_admin_read` policy.
5. **Feature-flag guard.** `profiles.feature_flags` is now staff-only via a trigger, so a patient can't switch on `tier1_ordering_v1` for themselves.
6. **Admin Vercel build fix.** The admin project was wired to `npm run build:web`, which only existed in the mobile root — added a `build:web` alias in `admin/package.json` and an `admin/vercel.json`.

## Live database — already applied

The LifeShield database has these migrations applied in production. The files are in `supabase/migrations/` for the record:

- `20261027_reconcile_buddy_discovery.sql`
- `20261027_buddy_discoverable_default_false_until_launch.sql`
- `20261028_profiles_feature_flags_staff_only.sql`
- `20261028_connections_insert_can_see_discoverable.sql`
- `20261028_blocks_admin_read.sql`

## Merge conflicts to expect

Main has moved on with features #1–#8 (Weekly Goals, Barriers, Buddies v1, Recipes, Partners, Store types, 10-step journey, Plugins) using the pre-Moss blue palette that this branch deleted. Expect ~19 conflicts, mostly add/add on `app/(main)/*` and `components/ui/*` using tokens like `colors.slate`, `colors.charcoal`, `colors.primaryBlue`, `colors.border`, `radius.card`, `radius.chip`, `riskLow`, `riskHigh`, `shadows`.

The branch's version resolves each conflict for feature parity under Moss, but main's seven "old-palette" screens (`partners/`, `journey/`, `plugins/`, `buddies/find`, `buddies-settings`, `recipe-detail`, `goal-detail`, `new-goal`) have no Moss replacement here. Either delete them on merge, or treat as follow-up work.

## Decisions still open

See `docs/superpowers/plans/2026-10-28-open-decisions.md` on this branch — covers the clinical, product and governance items that need you or the clinician to answer.

## Not covered

- Two-phone live chat delivery check. The row-level test passed and realtime is subscribed, but a real send between two phones hasn't been seen.
- `social_v1` is now default on; `is_buddy_discoverable` stays default off (opt-in).
- A few extra features (`goals_v1`, `recipes_v1`, `meal_planner_v1`, `activity_v1`, `reminders_v1`) still default off, and the Moss More tab doesn't link to those screens yet — raise as follow-up.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
