# PRESCOPE Enhancements — Phased Implementation Plan

> Purpose: sequence the 12 feature areas from the "Prescope Feature Enhancements" prompt onto the **real** repo (Expo Router `app/` directory, existing Supabase schema, existing `lib/` modules). No code changes in this pass — this document is the deliverable.

---

## 0. What the prompt got wrong about this repo

The source prompt was written for a hypothetical React Navigation project. Before anyone writes code, correct the following mapping mistakes:

| Prompt says | This repo actually has |
|---|---|
| `screens/RiskAssessment.tsx` | `app/(main)/(plan)/index.tsx` + `lib/rules-engine.ts` + `lib/rules-facts.ts` |
| `screens/TestBooking.tsx` | `app/(main)/(results)/index.tsx`, `app/(main)/(orders)/*`, `lib/lab-orders.ts`, `lib/lab-provider.ts` (already partial) |
| `screens/TestResults.tsx` | `app/(main)/(results)/lab-results.tsx`, `result-detail.tsx`, `enter-results.tsx` |
| `screens/Recommendations.tsx` | `app/(main)/(plan)/intervention.tsx` (backed by `interventions` table) |
| `screens/Supplements.tsx` | `app/(main)/(store)/index.tsx` + `product.tsx` + `cart.tsx` (backed by `products`) |
| `utils/lifestyleRecommender.ts` | `lib/rules-engine.ts` (already implemented as a rules engine that writes `interventions` rows) |
| `AppNavigator.tsx` | Expo Router file-based routing — no navigator file exists |
| `models/GeneticTest.ts` | Not present. Use `types/` for TS types, `supabase/*.sql` for the table |
| `bookings` table | Overlaps existing `lab_orders` table — extend, don't duplicate |
| `test_results` table | **Already exists** (`supabase/phase2-schema.sql`) |
| `reminders` table | Not present. `lib/follow-ups.ts` + `lib/follow-up-reminders.ts` already schedule follow-ups via `expo-notifications` — extend that, don't fork it |

**Rule for every phase below:** extend `app/(main)/(<group>)/` and `lib/*`; do not create a `screens/` folder, and do not add a second rules engine.

---

## 1. Cross-cutting foundations (must land before any phase)

These are not features — they unblock everything. Do them first, in one or two small PRs.

### 1a. Repository housekeeping
- Add `.claude/settings.json` allowlist for the commands the sessions will run repeatedly (`npm test`, `npx expo`, `npx tsc`).
- Consolidate the `supabase/phase*.sql` files into `supabase/migrations/` timestamped files. Right now Phase 2–4 live as one-shot SQL scripts; every new feature below adds a table and needs the migration flow to be reliable.
- Add `feature_flags` table + `lib/feature-flags.ts` (reads from `profiles.settings jsonb` or a per-user flag row). Every phase below ships behind a flag.

### 1b. Location on profile
Feature #1 (Test Booking) needs the user's location for lab lookup. `profiles` today has `country_of_origin` but no lat/lng or postcode. Add:
- Column `profiles.location_postcode text`
- Column `profiles.location_country text` (ISO-3166 alpha-2)
- Optional `profiles.location_point geography(point)` (needs PostGIS — decide upfront; if no PostGIS, do postcode-only lookups)
- UI: extend `app/(main)/(settings)/profile.tsx`

### 1c. Testing harness
`lib/*.test.ts` files exist (`follow-ups.test.ts`, `journey.test.ts`, `rules-engine.test.ts`, etc.). Confirm they run in CI and require **new** phases to add tests before merge. If there's no CI yet, add a GitHub Action running `npm test` on PRs (single small change, gates everything after).

**Exit criteria for Phase 0:** migrations directory is the source of truth, every merge runs tests, and `lib/feature-flags.ts` exists.

---

## 2. Phase sequencing (dependencies)

```
Phase 0  Foundations (§1)
  │
  ├── Phase A  Reminders + Goals              ← smallest, self-contained
  │       │
  │       └── Phase B  Personalized advice v2 ← extends rules-engine
  │              │
  │              └── Phase C  Recipes + Meal planning
  │
  ├── Phase D  Test Booking → Results loop    ← extends lab_orders
  │       │
  │       └── Phase E  Supplements v2 (stock, subscriptions)
  │              │
  │              └── Phase F  Genetic testing integration
  │
  ├── Phase G  Activity integrations (HealthKit / GoogleFit)
  │       │
  │       └── Phase H  Meditation content
  │
  ├── Phase I  Barriers & motivation (content-only, no infra)
  │
  ├── Phase J  Social features                ← highest risk (moderation, chat vendor)
  │
  ├── Phase K  E-commerce fulfilment          ← needs shipping + tax vendor
  │
  └── Phase L  Journey / analytics dashboard  ← consumes A–K, ships last
```

The three vertical stacks (A→B→C, D→E→F, G→H) can run in parallel by different sessions/contributors once Phase 0 is done. Phases I, J, K, L each stand alone.

---

## 3. Phase A — Reminders + Goals

Rationale for going first: no vendor dependencies, no payments, no PII beyond what's already stored, and it retires the most tech debt (there are two overlapping reminder concepts today: `lib/follow-ups.ts` and `lib/follow-up-reminders.ts`).

### DB migrations
```
supabase/migrations/<ts>_reminders.sql
  - reminders(id, user_id, type, content, schedule_cron text, next_fire_at, status, source_ref, created_at)
  - RLS: own_reminders (auth.uid() = user_id)

supabase/migrations/<ts>_goals.sql
  - goals(id, user_id, type, target jsonb, start_date, end_date, status, source_ref, created_at)
  - goal_progress(id, goal_id, recorded_at, value numeric, note)
  - RLS: own_goals / own_goal_progress
```
`source_ref` (uuid + kind) links a reminder or goal back to the `interventions` row / recommendation it came from — critical for Phase L analytics.

### App code
- `lib/reminders.ts` — consolidates `lib/follow-ups.ts` and `lib/follow-up-reminders.ts` behind one API (`scheduleReminder`, `cancelReminder`, `nextOccurrence`). Keep the old files as thin re-exports for one release, then delete.
- `lib/goals.ts` — SMART validation, streak calculation, progress aggregation. Pure functions with `goals.test.ts`.
- `app/(main)/(reminders)/index.tsx` — list + create + edit (new route group).
- `app/(main)/(goals)/index.tsx`, `app/(main)/(goals)/[id].tsx`.
- Goal creation entry-points on `app/(main)/(plan)/intervention.tsx` and `app/(main)/(store)/product.tsx` (prefill from context).
- Notification handling: reuse `lib/notification-routing.ts`; add reminder-tap → `/reminders/[id]`.

### Skip (for now)
- The prompt's "chatbot for check-ins" — do not build until Phase B is in. A reminder that opens a screen with predefined follow-up prompts is enough.

### Exit criteria
Users can create a reminder, receive the local notification, mark it done, and see next fire re-scheduled; goal progress bars render; both features are behind `flags.reminders_v2` / `flags.goals_v1`.

---

## 4. Phase B — Personalized lifestyle advice v2

### What exists
`lib/rules-engine.ts` + `lib/rules-facts.ts` already generate `interventions` rows from questionnaire + results. This phase upgrades that engine, does **not** replace it.

### DB
- `intervention_templates(id, code, title, rationale_md, action_steps jsonb, resources jsonb, impact_score int, contraindication_codes text[])` — extract today's hard-coded templates from `lib/rules-engine.ts` into a table so admin can edit without a redeploy.
- `intervention_progress(id, intervention_id, recorded_at, value jsonb, note)` — supports "progress tracking" screen.

### App code
- Refactor `lib/rules-engine.ts` to load templates from the table (with a bundled fallback for offline / first-run). Keep `rules-engine.test.ts` green with fixtures.
- `app/(main)/(plan)/intervention.tsx` gains rationale, action steps, resources, "set a goal" CTA (uses Phase A goals).
- `app/(main)/(plan)/[id].tsx` — RecommendationDetail with expanded info + progress log.

### Coupling to Phase A
Every intervention detail screen exposes: "Remind me" (Phase A reminder) and "Set a goal" (Phase A goal). Do not merge Phase B before Phase A is in.

---

## 5. Phase C — Recipes + Meal Planning

Content-heavy. Split content authoring from code authoring.

### DB
- `recipes(id, name, description, ingredients jsonb, instructions jsonb, nutrition jsonb, tags text[], created_at)`
- `recipe_favorites(id, user_id, recipe_id)`
- `meal_plans(id, user_id, start_date, end_date, plan jsonb, source_ref)`

### App
- `app/(main)/(recipes)/index.tsx` — browse/search/filter.
- `app/(main)/(recipes)/[id].tsx` — detail, favorite, share.
- `lib/meal-planner.ts` — pure function: goals + preferences + shopping habits → plan. `.test.ts` with fixtures.
- Ingredient → cart uses existing `products` table by SKU/name match.

### Skip
- The "share with connections" bit — depends on Phase J. Guard behind flag; leave the button, show "coming soon" if `flags.social_v1` is off.

---

## 6. Phase D — Test Booking → Results loop

### What exists
`lib/lab-orders.ts`, `lib/lab-provider.ts`, `app/(main)/(orders)/*`, `test_orders`, `test_results`, `lab_orders`. This phase **wires them together and adds a booking step** — the pieces are already there but there's no user-facing "book this now" flow.

### DB additions
- Extend `lab_orders` with `booking_slot_at timestamptz`, `booking_confirmation text`, `preparation_instructions text`.
- Add `labs(id, provider_code, name, address jsonb, coords geography, price numeric, availability jsonb, active bool)` — populated per-provider by a nightly edge function.

### App
- New screen `app/(main)/(orders)/book.tsx`: reads `test_orders` where `status = 'recommended'`, calls a new `lib/lab-search.ts` that filters `labs` by `profiles.location_*`, renders provider list, on select calls existing `lab-orders.ts` → creates `lab_orders` row with `status = 'booked'`.
- CTA "Book this test" on `app/(main)/(plan)/index.tsx` next to each recommended test.
- Webhook handler (Supabase edge function) `functions/lab-result-webhook/` — receives lab result, inserts into `test_results` via the existing `save_reviewed_result` RPC (or a service-role variant, since the caller is the lab, not a signed-in user — decide upfront).

### Vendor decision needed before build
- Which lab providers? US-only vs multi-country changes the `labs` seed and the webhook contract. **Ask stakeholder before Phase D starts.**

---

## 7. Phase E — Supplements v2

`products` + cart already exist. This phase adds:
- Supplement-typed products: `products.type` column, `products.subscription_options jsonb`, `products.contraindication_codes text[]`, `products.supporting_studies jsonb`.
- Rule engine (Phase B upgrade) filters supplements by user's `test_results` and any `medications` (need `medications` table — 1 migration).
- `app/(main)/(store)/product.tsx` gains "subscribe" toggle, contraindication warnings, studies link.

Do not start until Phase D (results feeding rules) is live, or the personalisation loop won't have data.

---

## 8. Phase F — Genetic testing integration

Highest external dependency of the medical stack. Real work is negotiating a lab partner and reading their API docs; code is thin.

### Pre-work (non-code, blocks the phase)
- Pick a partner (Nucleus, Invitae, Color, 23andMe research API, etc.). Get API docs.
- Legal review of genetic-data consent flow. `consent_records.consent_type` already includes `snp` — extend for the new provider.

### DB
- `genetic_tests(id, provider_code, name, description, price, sample_type)`
- `genetic_test_orders(id, user_id, test_id, status, tracking, ordered_at)`
- `genetic_test_results(id, order_id, raw_report jsonb, structured jsonb, received_at)`

### App
- `app/(main)/(orders)/genetic.tsx` — select, ship-to, pay via existing Stripe flow (`components/checkout/StripePayButton.*`).
- Result webhook parallels Phase D's.
- Rules engine ingests `structured` from `genetic_test_results` — 1 new fact source in `lib/rules-facts.ts`.

---

## 9. Phase G — Activity integrations (HealthKit / GoogleFit)

Native modules. Verify Expo SDK 57 supports the picked libraries (`expo-health` / `react-native-health` / `react-native-google-fit`). If not, this needs a config plugin, which changes the build story — flag early.

### DB
- `activity_snapshots(id, user_id, source, kind, recorded_at, value jsonb)` — one row per read cycle per metric type.

### App
- `lib/activity-source.ts` — abstract iOS/Android differences behind one API.
- `app/(main)/(settings)/health-permissions.tsx` — connect / disconnect.
- `app/(main)/(settings)/profile.tsx` — activity summary card.

### Skip
- Auto-compare vs goals — do that in Phase L (journey view). Just store the data here.

---

## 10. Phase H — Meditation content

Depends on Phase G only for the "auto-recommend to high-risk users" bit. Otherwise standalone.

- `meditations(id, provider, title, description, audio_url, duration_s, tags text[])`
- `meditation_events(id, user_id, meditation_id, event, at)` — played / favorited / completed.
- Player screen. **Verify audio library** compatible with SDK 57 (`expo-av` is being deprecated; check `expo-audio` status when Phase H starts).
- If licensing content from a partner, get their catalog API before building the player.

---

## 11. Phase I — Barriers & motivation

Content + booking. Two small DB additions:
- `barrier_strategies(id, intervention_template_id, barrier_code, strategy_md)` — served on RecommendationDetail (Phase B).
- `experts(id, name, bio, specialties text[], booking_url)` — booking is Calendly link, no infra.

Pure content. Can ship any time after Phase B.

---

## 12. Phase J — Social features

Highest risk (moderation, PII exposure, scaling costs). Do not start without a written moderation policy and a chosen vendor for chat.

### Vendor
- SendBird vs Stream vs Ably vs building on Supabase Realtime + `pg_notify`. Pick before code. Building on Supabase Realtime keeps data in-house but you own moderation UI.

### DB
- `connections(id, user_a, user_b, status, requested_at, accepted_at)` with a check constraint `user_a < user_b` to dedupe.
- `connection_requests(id, from_user, to_user, message, status, created_at)`.
- `reports(id, reporter_id, target_kind, target_id, reason, status)`.

### App
- `app/(main)/(social)/match.tsx`, `app/(main)/(social)/[user_id].tsx`.
- Share-progress hooks on Goals + Recommendations screens (feature-flagged behind Phase A/B).

### Rule
No social feature ships without: (1) block/report UI, (2) admin queue for reports (extend `admin/`), (3) a way to fully delete a user's social data on account deletion (extend `account_deletion_requests` flow).

---

## 13. Phase K — E-commerce fulfilment

Depends on Phase E (physical supplement products) or Phase F (genetic kits) shipping physical goods.

### DB
- Extend `products` with `type text`, `sku text`, `weight_g int`, `dimensions_cm jsonb`, `inventory int`.
- `shipments(id, order_id, carrier, tracking, label_url, status, cost_cents)`.

### Vendor decision
- EasyPost vs Shippo vs ShipStation. Pick one, isolate behind `lib/shipping-provider.ts` mirroring the `lab-provider.ts` pattern.

### App
- Extend `app/(main)/(store)/checkout.tsx` to collect shipping address and show rates.
- Admin dashboard (`admin/`) needs an orders/inventory view. Build inside existing admin — do not spin up a new project.

---

## 14. Phase L — Journey + analytics

Ships last because it consumes every prior phase's data.

### User-facing
- `app/(main)/(journey)/index.tsx` — replaces / extends `app/(main)/home.tsx` (see `lib/journey.ts` and `components/journey/`). Timeline sourced from `journey_events` (add table) merging: risk scores, `test_orders`, `test_results`, `interventions`, `goals`, `orders`, `activity_snapshots`, `meditation_events`, `checkins`.

### Admin analytics
- Build in `admin/`. Read from Supabase directly with the service key. Do **not** ship this in the mobile app.
- MAU / retention / conversion / drop-off. Consider PostHog or Plausible for events; keep aggregates in the DB.

### Feedback loop
- `feedback(id, user_id, surface, rating, comment, created_at)`.
- NPS survey trigger via Phase A reminders.

---

## 15. Per-phase implementation checklist (adapted from the source prompt)

Every phase PR must include:

1. Migration file in `supabase/migrations/` (never edit prior migrations).
2. RLS policy for every new table, plus a test that verifies a second user cannot read row-1's data.
3. Feature flag added to `lib/feature-flags.ts`, defaulted OFF.
4. Types in `types/` (do not add a `models/` directory).
5. Pure logic in `lib/` with a `.test.ts` next to it.
6. Screen(s) under the right `app/(main)/(<group>)/` route group; new groups get an `_layout.tsx`.
7. Error boundary + friendly-error path (`lib/friendly-errors.ts` — already exists).
8. Analytics event(s) named `<phase>.<action>` so Phase L can reuse them.
9. Update `.cursorrules-phaseN.md` (or add `.cursorrules-phaseX.md`) with the acceptance criteria that were met.
10. Manual QA on both `npx expo start` (native) and `npm run web` — the app runs on both today, and both need to stay working.

---

## 16. Rollout mechanics

- Each phase merges behind a per-user feature flag. Default OFF.
- Beta cohort: enable via `profiles.settings->'flags'` for the accounts in `awaytotheway@gmail.com`'s admin list.
- Turn on globally only after 2 weeks with no P0/P1 incidents.
- Prescope's positioning ("lifestyle awareness, not diagnostic") from `.cursorrules` §1 constrains every user-facing string in every phase. Legal review any copy that talks about test results, genetic risk, or medication interactions before turning the flag on.

---

## 17. Explicit non-goals for this plan

- No LLM/chat integration is scoped. If it comes back, it's a separate plan; it does not belong inside "check-ins" (Phase A).
- No re-architecture of Expo Router → React Navigation. The prompt's `AppNavigator.tsx` is ignored on purpose.
- No parallel rules engine. `lib/rules-engine.ts` is the only one — everything extends it via templates.
- No new admin project. `admin/` exists; extend it.

---

## 18. Open questions that block scheduling

Answer these before Phase D or later starts:

1. Lab partner(s) for Phase D — which country, which provider, do they have a sandbox API?
2. Genetic partner for Phase F — same three questions.
3. Chat vendor for Phase J — SendBird / Stream / roll-your-own on Supabase Realtime?
4. Shipping vendor for Phase K — EasyPost / Shippo / ShipStation?
5. Is PostGIS available on the Supabase project (blocks accurate lab-distance sorting in Phase D)?
6. Does the current Stripe integration support subscriptions (Phase E), or do we upgrade to Billing?
7. Who owns content authoring for Phase C (recipes) and Phase H (meditations)?

Until these are answered, Phases A/B/C/I are safe to start; the others are not.
