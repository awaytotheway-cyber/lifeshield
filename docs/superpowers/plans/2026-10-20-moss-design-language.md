# Moss Design Language Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the blue glassmorphism design system with the Moss design language across the whole app, cut the tab bar to five tabs, and ship a working Buddies search and chat behind a full moderation gate.

**Architecture:** The token core (`lib/design-tokens.ts`, `lib/typography.ts`) and `components/ui/` primitives feed 109 of the app's 172 `.tsx` files, so rewriting those first moves the whole app to Moss in one step and makes the TypeScript compiler enumerate every remaining call site. Navigation and the 13 designed screens are then rebuilt to board fidelity, chat is added on Supabase Realtime with RLS-enforced blocking, and a final sweep clears whatever the compiler did not catch.

**Tech Stack:** Expo Router 57, React Native 0.86, TypeScript, Supabase (Postgres + RLS + Realtime), Zustand, Schibsted Grotesk via `@expo-google-fonts`, Refine + Ant Design for `admin/`.

**Spec:** `docs/superpowers/specs/2026-10-20-moss-design-language-design.md`

## Global Constraints

- **Colour, exact values:** `ink #0C0C0A` · `inkSoft #4F4F49` · `inkFaint #8A8A84` · `inkMuted #6B6B65` · `paper #F1F1EF` · `white #FFFFFF` · `mossDeep #5F6D17` · `mossMid #7D9022` · `mossBright #A3B82E` · `mossTint #EFF2E2` · `hairline #E4E4E0`.
- **Clinical status, exact pairs:** within range `#EFF2E2`/`#4A5612`; worth watching `#F0E6D2`/`#7A5610`; worth discussing `#F3DED4`/`#9C3E16`. Never green→red. Every chip carries its word.
- **Radius:** `surface 20` for anything you look at, `control 4` for anything you press, `pill 999` for round things. No other radius value appears in the codebase.
- **Forbidden everywhere:** borders on cards, shadows, elevation, blur, and any gradient other than `heroGradient` (`155°, #A3B82E → #7D9022 → #4C5812`), max one per screen, never behind body copy.
- **One black button per screen.** Secondary is an outline button or an underlined link.
- **Type:** Schibsted Grotesk only. Weights 400 (grey headline words, body), 500 (labels, inactive tabs), 600 (titles, buttons, active tabs), 700 (display headlines only). `inkFaint` as a headline colour only at 24px and above (3.47:1 on white). Anything smaller that needs a grey uses `inkMuted #6B6B65` (5.36:1) or `inkSoft` (8.24:1) — never `inkFaint`.
- **Sizes:** controls 56px tall; tap targets never below 44px; screen gutter 24px; card padding 20px.
- **Copy:** clinical disclaimers, consent language and safety strips are never shortened. Prescope "does not diagnose, detect or treat any condition" — no copy may imply interpretation of a result.
- **Social:** every new table has RLS; `social_v1` defaults `false`; blocking is enforced in RLS, not the UI.
- **Tests:** this repo has no aggregate `npm test` — each suite is a `test:*` script run via `npx tsx`. Task 1 adds `npm test` as an aggregate; every new suite is appended to it.
- **Both platforms:** `npx expo start` and `npm run web` both work today and must both keep working.

## Review Focus

The five failure modes the spec implies but which no task's happy path exercises. Each has its test added to the owning task.

1. **`profiles.full_name` is blank, single-word, or non-Latin** — first-name derivation yields `""`, making the user invisible or rendering an empty initial disc. Expect: a blank name is never written to `buddy_profiles`, and a one-word name yields a one-letter disc. *(Task 10)*
2. **Search query contains `%`, `_` or `'`** — ILIKE metacharacters turn a prefix search into a wildcard that returns the whole user table. Expect: treated as literal characters. *(Task 9)*
3. **Search matches the caller, an existing buddy, or someone who blocked them** — the user sees themselves or a blocked party in results. Expect: all three excluded. *(Task 9)*
4. **Message body is empty, whitespace-only, or very long** — empty bubbles render and storage is unbounded. Expect: rejected before send, with a length cap. *(Task 11)*
5. **A user is blocked after a conversation exists** — the thread, its unread count, and the buddy row must all disappear, and the RLS policy must refuse a direct API read. Expect: zero rows returned to either party. *(Task 9 pins it in SQL; Task 23 step 6 confirms it end to end)*

---

## Phase 1 — Foundation

### Task 1: Moss colour, radius and shape tokens

**Files:**
- Modify: `lib/design-tokens.ts` (full rewrite)
- Create: `lib/design-tokens.test.ts`
- Modify: `package.json:66-98` (add `test:tokens` and aggregate `test`)

**Interfaces:**
- Produces: `colors` (keys per Global Constraints), `status` (`{ withinRange, worthWatching, worthDiscussing }` each `{ fill: string; text: string; label: string }`), `radius` (`{ surface: 20, control: 4, pill: 999 }`), `heroGradient` (`{ colors: readonly string[]; locations: readonly number[]; angle: 155 }`), `spacing`, `tapTarget = 44`, `controlHeight = 56`.
- Removes: `gradients`, `shadows`, `glassBlurIntensity`, `semantic`, and every legacy alias (`primaryBlue`, `iceBlue`, `deepTeal`, `midTeal`, `lightTeal`, `sage`, `sageLight`, `coral`, `coralLight`, `amber`, `amberLight`, `cream`, `teal`, `skyBlue`, `deepNavy`, `glassFill`, `glassFillDark`, `glassChrome`, `glassBorder`, `riskLow*`, `riskModerate*`, `riskHigh*`, `charcoal`, `slate`, `mist`, `border`, `shadow`).

Deleting the aliases is deliberate: it makes `npx tsc --noEmit` print the worklist for Tasks 4–22.

- [ ] **Step 1: Write the failing test**

```ts
// lib/design-tokens.test.ts
import assert from "node:assert/strict";
import { colors, radius, status, heroGradient, tapTarget, controlHeight } from "./design-tokens";

assert.equal(colors.ink, "#0C0C0A");
assert.equal(colors.paper, "#F1F1EF");
assert.equal(colors.mossDeep, "#5F6D17");
assert.equal(colors.mossTint, "#EFF2E2");
assert.deepEqual(radius, { surface: 20, control: 4, pill: 999 });
assert.equal(status.worthWatching.fill, "#F0E6D2");
assert.equal(status.worthWatching.text, "#7A5610");
assert.equal(status.worthDiscussing.label, "Worth discussing");
assert.equal(heroGradient.angle, 155);
assert.equal(tapTarget, 44);
assert.equal(controlHeight, 56);

// no blue-era token survives
for (const banned of ["primaryBlue", "iceBlue", "deepTeal", "sage", "coral", "cream", "glassFill"]) {
  assert.equal(banned in colors, false, `${banned} must be deleted, not remapped`);
}
console.log("design-tokens ok");
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx --yes tsx --tsconfig tsconfig.json lib/design-tokens.test.ts`
Expected: FAIL — `colors.ink` undefined.

- [ ] **Step 3: Rewrite `lib/design-tokens.ts`**

Values verbatim from Global Constraints. Keep the file's existing doc-comment style. `spacing` keeps its current keys and values but `screenX` becomes `24`.

- [ ] **Step 4: Add the test scripts**

In `package.json` scripts, add `"test:tokens": "npx --yes tsx --tsconfig tsconfig.json lib/design-tokens.test.ts"` and an aggregate `"test"` that runs every existing `test:*` script in sequence plus `test:tokens`.

- [ ] **Step 5: Run it and watch it pass**

Run: `npm run test:tokens`
Expected: PASS, prints `design-tokens ok`.

- [ ] **Step 6: Commit**

```bash
git add lib/design-tokens.ts lib/design-tokens.test.ts package.json
git commit -m "feat: replace blue glass tokens with Moss colour and shape"
```

---

### Task 2: Schibsted Grotesk typography

**Files:**
- Modify: `lib/typography.ts` (full rewrite)
- Modify: `app/_layout.tsx` (font loading)
- Modify: `package.json` (dependencies)

**Interfaces:**
- Produces: `fontFamily` keeping its existing key names (`display`, `displaySemi`, `heroStat`, `body`, `bodyMedium`, `bodySemi`, `medical`) so no importing screen breaks, each mapping to a Schibsted Grotesk weight; `typography` gaining `displayXL`, `displayL`, `title`, `body`, `label`, `micro` with the spec's scale.

- [ ] **Step 1: Swap the font packages**

Add `@expo-google-fonts/schibsted-grotesk`. Remove `@expo-google-fonts/manrope`, `@expo-google-fonts/inter`, `@expo-google-fonts/plus-jakarta-sans`, `@expo-google-fonts/dm-mono`, `@expo-google-fonts/dm-serif-display`. Run `npm install`.

- [ ] **Step 2: Rewrite `lib/typography.ts`**

Scale, verbatim from the spec: `displayXL` 46/0.92/−3.5%/700 · `displayL` 34/1.0/−3%/700 · `title` 20/1.2/−1%/600 · `body` 15/1.55/400 · `label` 13/1.4/500 · `micro` 11/1.4/600/+14% uppercase. React Native takes `letterSpacing` in points, not ems — convert at each size (e.g. 46 × −0.035 ≈ −1.6). `medical` maps to `body` weight 500; the mono face is gone.

- [ ] **Step 3: Update the font loader in `app/_layout.tsx`**

Load the four Schibsted Grotesk weights (400/500/600/700); delete the removed families from the `useFonts` call.

- [ ] **Step 4: Verify it compiles and runs**

Run: `npx tsc --noEmit 2>&1 | head -40`
Expected: errors only about deleted colour aliases (Task 1's worklist), none about `fontFamily` keys.

Run: `npm run web` and confirm text renders in Schibsted Grotesk, not a system fallback.

- [ ] **Step 5: Commit**

```bash
git add lib/typography.ts app/_layout.tsx package.json package-lock.json
git commit -m "feat: switch typography to Schibsted Grotesk"
```

---

### Task 3: `Surface` and `TwoTone` primitives

**Files:**
- Create: `components/ui/Surface.tsx`
- Create: `components/ui/TwoTone.tsx`
- Create: `components/ui/MossPattern.tsx`
- Create: `components/ui/InitialDisc.tsx`
- Create: `lib/initials.ts`
- Test: `lib/initials.test.ts`
- Modify: `package.json` (append `test:initials`; append to the aggregate `test` script — never rewrite the scripts block)

**Interfaces:**
- Produces:
  - `Surface({ children, padded?: boolean, style? }): JSX.Element` — white, `radius.surface`, no border, no shadow; `padded` defaults true and applies 20px.
  - `TwoTone({ parts, size }): JSX.Element` where `parts: { text: string; tone: "bold" | "grey" }[]` and `size: "xl" | "l"`; grey renders `inkFaint` weight 400, bold renders `ink` weight 700. On a moss ground, `onMoss` prop switches grey to `#C8D59A`.
  - `MossPattern({ height?: number, tone?: "tint" | "deep" }): JSX.Element` — a flat tiling geometric motif in `react-native-svg`, no figures, no scenes.
  - `InitialDisc({ name, size?: number, variant?: "moss" | "clay" }): JSX.Element` — 46px default, `radius.pill`, `mossTint`/`#4A5612` or `#F0E6D2`/`#7A5610`.

- [ ] **Step 1: Write the failing test for initials**

Initials are the one piece of logic here, and Review Focus item 1 names it. Put the pure function in `lib/initials.ts` so it is testable without rendering.

```ts
// lib/initials.test.ts
import assert from "node:assert/strict";
import { initialsFor } from "./initials";

assert.equal(initialsFor("Anjali Mehta"), "AM");
assert.equal(initialsFor("Priya"), "P");            // one word -> one letter
assert.equal(initialsFor("  meera  k  "), "MK");    // trims and collapses
assert.equal(initialsFor(""), "");                  // caller renders no disc
assert.equal(initialsFor("Ωmega Ray"), "ΩR");       // non-Latin survives
console.log("initials ok");
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx --yes tsx --tsconfig tsconfig.json lib/initials.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `initialsFor(name: string): string` in `lib/initials.ts`**

Take the first character of at most the first two whitespace-separated words, uppercased. Use `Array.from` rather than index access so surrogate pairs are not split.

- [ ] **Step 4: Run it and watch it pass**

Run: `npx --yes tsx --tsconfig tsconfig.json lib/initials.test.ts`
Expected: PASS.

- [ ] **Step 5: Build the four components**

`InitialDisc` returns `null` when `initialsFor(name)` is empty rather than rendering an empty circle.

- [ ] **Step 6: Add `test:initials` to `package.json` and to the aggregate `test` script**

- [ ] **Step 7: Commit**

```bash
git add components/ui/Surface.tsx components/ui/TwoTone.tsx components/ui/MossPattern.tsx components/ui/InitialDisc.tsx lib/initials.ts lib/initials.test.ts package.json
git commit -m "feat: add Surface, TwoTone, MossPattern and InitialDisc primitives"
```

---

### Task 4: Rework the interactive primitives

**Files:**
- Modify: `components/ui/Button.tsx`, `StatusChip.tsx`, `TextField.tsx`, `TextInput.tsx`, `RadioGroup.tsx`, `ChoiceToggle.tsx`, `CheckboxGroup.tsx`, `Card.tsx`, `EmptyState.tsx`, `ProgressBar.tsx`, `ProgressRing.tsx`, `NumberInput.tsx`
- Delete: `components/ui/GlassCard.tsx`, `components/ui/GlassSurface.tsx`, `components/ui/ColorSwitch.tsx`, `components/ui/Shimmer.tsx`, `components/ui/TrustBadgeGrid.tsx`

**Interfaces:**
- Consumes: `Surface` (Task 3), Moss `colors`/`radius` (Task 1).
- Produces: `Button` keeps its exported names (`Button`, `PrimaryButton`, `SecondaryButton`, `TextButton`, `DangerButton`, `IconButton`) and its `ButtonProps` shape; `variant` drops `"ghost"` and `"icon"` styling in favour of primary (Ink fill) / secondary (Ink 1px outline, transparent) / text (underlined link). `StatusChip` keeps `{ kind, label }` with `kind: "withinRange" | "worthWatching" | "worthDiscussing"`.

- [ ] **Step 1: Delete the glass primitives**

Remove the five files above. `npx tsc --noEmit` now lists every consumer — that list is the worklist for this task and Task 22.

- [ ] **Step 2: Rework `Button.tsx`**

56px, `radius.control`, no shadow, no `GlassCard`, no `PressScale` bounce. Disabled is `#E4E4E0` on `#6B6B65`. Pressed primary darkens to `#2A2A26`. Keep every existing export name so call sites do not change.

- [ ] **Step 3: Rework the remaining primitives**

`StatusChip` reads `status` from tokens and always renders its word. `TextField`/`TextInput` lose their box for a 1.5px Ink bottom rule, 56px, 13px `inkSoft` label above. `RadioGroup`/`ChoiceToggle`/`CheckboxGroup` make the whole row the target at 52px minimum, `radius.control`, selected row fills `mossTint`. `Card` delegates to `Surface`. `EmptyState` drops its illustration prop for `MossPattern`. `ProgressBar`/`ProgressRing` fill `mossMid` on `hairline`.

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit 2>&1 | grep -c "components/ui"`
Expected: `0` — no error remains inside `components/ui/`.

- [ ] **Step 5: Commit**

```bash
git add components/ui
git commit -m "feat: rebuild UI primitives on Moss, delete glass surfaces"
```

---

### Task 5: Flatten `Screen`

**Files:**
- Modify: `components/ui/Screen.tsx`

**Interfaces:**
- Produces: `Screen` keeping its existing `ScreenProps` (`children`, `scroll`, `contentPadding`, `header`, `footer`, `centered`), `contentPadding` defaulting to `24`.

- [ ] **Step 1: Delete `Atmosphere`**

Remove the function, the three blurred blobs, the `LinearGradient`, the `GlassCard` import and the `gradients` import. The screen background becomes flat `colors.paper`.

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit 2>&1 | grep "Screen.tsx"`
Expected: no output.

Run: `npm run web`, open any screen, confirm a flat `#F1F1EF` ground with no blobs and no blur.

- [ ] **Step 3: Commit**

```bash
git add components/ui/Screen.tsx
git commit -m "feat: flatten Screen to paper, remove gradient atmosphere"
```

---

### Task 6: Delete the illustrations

**Files:**
- Delete: `components/illustrations/` (all 20 components plus `IllustrationFrame.tsx` and `index.ts`)
- Modify: the ~30 files importing from it

**Interfaces:**
- Consumes: `MossPattern`, `InitialDisc` (Task 3).

- [ ] **Step 1: Delete the directory**

```bash
git rm -r components/illustrations
```

- [ ] **Step 2: Fix every consumer**

Run `npx tsc --noEmit` for the list. Replace each illustration with either `MossPattern` (empty states, section completions) or nothing at all (decorative headers — the headline carries the screen). Do not invent a replacement graphic where the layout reads fine without one.

- [ ] **Step 3: Verify**

Run: `grep -rn "components/illustrations" app components lib | wc -l`
Expected: `0`.

- [ ] **Step 4: Commit**

```bash
git add -A app components
git commit -m "feat: delete illustration set, replace with Moss patterns"
```

---

## Phase 2 — Navigation

### Task 7: Five-tab bar

**Files:**
- Modify: `app/(main)/_layout.tsx`
- Delete: `components/navigation/AppDrawer.tsx`, `DrawerContext.tsx`, `MenuButton.tsx`
- Create: `components/navigation/TabIcon.tsx`

**Interfaces:**
- Produces: `TabIcon({ name, focused })` where `name: "home" | "tests" | "shop" | "buddies" | "more"`, drawn as 1.5px-stroke `react-native-svg` paths copied from the UI-kit board, `ink` when focused and `inkFaint` otherwise.

**Preserve exactly:** every redirect and gate currently in this file — triage lock, consent ordering, CTC escalation, questionnaire gating, and the `hideTabBar` logic. This task changes which tabs are visible and how the bar looks, nothing about who is allowed where.

- [ ] **Step 1: Replace the tab set**

Visible: `home`, `(results)` titled "Tests", `(store)` titled "Shop", `(buddies)` titled "Buddies", `(settings)` titled "More". `questionnaire` moves to `href: null`. Every other group keeps `href: null`.

- [ ] **Step 2: Restyle the bar**

White background, no `GlassCard` backdrop, no border, 10px labels at weight 600 active / 500 inactive, `ink`/`inkFaint` tints, `tabBarIcon` from `TabIcon`.

- [ ] **Step 3: Delete the drawer**

Remove the three navigation files and the `DrawerProvider`/`AppDrawer` wrapper from the layout. Fix the `MenuButton` call sites the compiler reports — screens get a plain back affordance instead.

- [ ] **Step 4: Verify the gates still hold**

Run: `npx tsc --noEmit` — clean for this file.
Then by hand on `npm run web`: a symptomatic triage still locks to Pathway B; an unconsented account still bounces to BRCA; the tab bar shows exactly five items and hides inside questionnaire sections and consent screens.

- [ ] **Step 5: Commit**

```bash
git add -A app/\(main\)/_layout.tsx components/navigation
git commit -m "feat: five-tab navigation, delete the side drawer"
```

---

## Phase 3 — Buddies

### Task 8: Social schema and RLS

**Files:**
- Create: `supabase/migrations/20261020_social_buddies.sql`

**Interfaces:**
- Produces: tables `buddy_profiles`, `connections`, `connection_requests`, `messages`, `blocks`, `reports` with the columns in spec §5.1–5.2.

- [ ] **Step 1: Write the migration**

Columns exactly as spec §5.1 and §5.2, including `connections` `CHECK (user_a < user_b)`. Backfill `buddy_profiles` from `profiles` with `split_part(full_name, ' ', 1)` as `first_name`, `discoverable` default `true`, skipping rows where `full_name` is null or trims to empty.

- [ ] **Step 2: Write the RLS policies**

Enable RLS on all six. `buddy_profiles`: own row for write; read is via the RPC only (Task 9), so no broad select policy. `connections`/`messages`: readable and writable only by the two parties, **and only when no `blocks` row exists between them in either direction**. `blocks`: own rows. `reports`: insert by the reporter; select by service role only.

- [ ] **Step 3: Apply and verify it loads**

Run: `supabase db reset`
Expected: migration applies with no error.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20261020_social_buddies.sql
git commit -m "feat: add social tables with RLS-enforced blocking"
```

---

### Task 9: `search_buddies` RPC and the RLS cross-user test

**Files:**
- Create: `supabase/migrations/20261020_search_buddies.sql`
- Create: `supabase/tests/social_rls_test.sql`
- Modify: `package.json` (add `test:social-rls`)

**Interfaces:**
- Consumes: the tables from Task 8.
- Produces: `search_buddies(q text) RETURNS TABLE (user_id uuid, first_name text, city text, goals text[])`, `SECURITY DEFINER`, `search_path = public`.

This task owns Review Focus items 2, 3 and 5.

- [ ] **Step 1: Write the failing SQL test**

`supabase/tests/social_rls_test.sql` creates three users and asserts, each via `DO $$ ... RAISE EXCEPTION ... $$`:

```
-- enumeration
search_buddies('')   returns 0 rows
search_buddies('a')  returns 0 rows        -- under the 2-char minimum
-- literal matching (Review Focus 2)
search_buddies('%')  returns 0 rows
search_buddies('_')  returns 0 rows
search_buddies('o''b') matches "O'Brien" and nothing else
-- exclusions (Review Focus 3)
search_buddies('pri') does not contain the caller
search_buddies('mee') does not contain an existing connection
search_buddies('ree') does not contain a user who blocked the caller
search_buddies('ree') does not contain a user the caller blocked
-- cross-user isolation (plan §15 item 2)
user B selecting user A's messages returns 0 rows
user B selecting user A's buddy_profiles row returns 0 rows
-- blocking kills an existing thread (Review Focus 5)
after a block, both parties selecting that connection's messages return 0 rows
```

- [ ] **Step 2: Run it and watch it fail**

Run: `supabase db reset && psql "$SUPABASE_DB_URL" -f supabase/tests/social_rls_test.sql`
Expected: FAIL — `search_buddies` does not exist.

- [ ] **Step 3: Implement the RPC**

Guard `length(trim(q)) >= 2` and return empty otherwise. Escape `%`, `_` and `\` in `q` before interpolating into `ILIKE`, matching prefix on `first_name` or `city`. Filter out `discoverable = false`, `auth.uid()`, anyone already in `connections` with the caller, and either direction of `blocks`. `LIMIT 50`.

- [ ] **Step 4: Run it and watch it pass**

Run: `npm run test:social-rls`
Expected: PASS, no exception raised.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20261020_search_buddies.sql supabase/tests/social_rls_test.sql package.json
git commit -m "feat: add search_buddies RPC with enumeration and block guards"
```

---

### Task 10: `lib/buddies.ts`

**Files:**
- Create: `lib/buddies.ts`, `lib/buddies.test.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `search_buddies` (Task 9).
- Produces:
  - `firstNameFrom(fullName: string | null): string | null`
  - `connectionPair(a: string, b: string): { user_a: string; user_b: string }`
  - `describeBuddy(b: BuddyProfile): string` — `"Mumbai · walking, 40s"`, omitting absent parts without leaving a stray separator
  - `searchBuddies(q: string): Promise<BuddyProfile[]>`
  - `requestConnection`, `acceptConnection`, `blockUser`, `reportUser`
  - `type BuddyProfile = { user_id: string; first_name: string; city: string | null; goals: string[] }`

This task owns Review Focus item 1.

- [ ] **Step 1: Write the failing test**

```ts
// lib/buddies.test.ts
import assert from "node:assert/strict";
import { firstNameFrom, connectionPair, describeBuddy } from "./buddies";

// Review Focus 1 — blank and single-word names
assert.equal(firstNameFrom("Anjali Mehta"), "Anjali");
assert.equal(firstNameFrom("Priya"), "Priya");
assert.equal(firstNameFrom("   "), null);
assert.equal(firstNameFrom(null), null);

// pair ordering satisfies the user_a < user_b constraint either way round
assert.deepEqual(connectionPair("b", "a"), { user_a: "a", user_b: "b" });
assert.deepEqual(connectionPair("a", "b"), { user_a: "a", user_b: "b" });

assert.equal(describeBuddy({ user_id: "1", first_name: "M", city: "Mumbai", goals: ["walking"] }), "Mumbai · walking");
assert.equal(describeBuddy({ user_id: "1", first_name: "M", city: null, goals: ["walking"] }), "walking");
assert.equal(describeBuddy({ user_id: "1", first_name: "M", city: "Thane", goals: [] }), "Thane");
console.log("buddies ok");
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx --yes tsx --tsconfig tsconfig.json lib/buddies.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `lib/buddies.ts`**

The pure functions above plus thin Supabase wrappers for the async ones. `firstNameFrom` returns `null` — never `""` — so a blank name cannot be written to `buddy_profiles`.

- [ ] **Step 4: Run it and watch it pass**

Run: `npm run test:buddies`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/buddies.ts lib/buddies.test.ts package.json
git commit -m "feat: add buddy search and connection logic"
```

---

### Task 11: `lib/chat.ts`

**Files:**
- Create: `lib/chat.ts`, `lib/chat.test.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `connectionPair` (Task 10).
- Produces:
  - `validateMessage(body: string): { ok: true; body: string } | { ok: false; reason: "empty" | "too_long" }` — trims, rejects empty, caps at 2000 characters
  - `groupByDay(msgs: Message[], now?: Date): { day: string; label: string; messages: Message[] }[]` — label is `"Today"`, `"Yesterday"`, or `"12 October"`; `now` defaults to `new Date()` and exists so tests are not time-dependent
  - `unreadCount(msgs: Message[], userId: string): number`
  - `sendMessage`, `subscribeToThread` (Supabase Realtime channel)
  - `type Message = { id: string; connection_id: string; sender_id: string; body: string; created_at: string; read_at: string | null }`

This task owns Review Focus item 4 and the client half of item 5.

- [ ] **Step 1: Write the failing test**

```ts
// lib/chat.test.ts
import assert from "node:assert/strict";
import { validateMessage, groupByDay, unreadCount } from "./chat";

// Review Focus 4
assert.deepEqual(validateMessage("  hi  "), { ok: true, body: "hi" });
assert.deepEqual(validateMessage(""), { ok: false, reason: "empty" });
assert.deepEqual(validateMessage("   \n "), { ok: false, reason: "empty" });
assert.deepEqual(validateMessage("x".repeat(2001)), { ok: false, reason: "too_long" });
assert.equal(validateMessage("x".repeat(2000)).ok, true);

const msg = (id: string, at: string, sender = "them", read: string | null = null) =>
  ({ id, connection_id: "c", sender_id: sender, body: "b", created_at: at, read_at: read });

// `now` is injected so this test does not change meaning tomorrow
const NOW = new Date("2026-10-20T12:00:00Z");
const days = groupByDay([msg("1", "2026-10-19T08:00:00Z"), msg("2", "2026-10-20T08:00:00Z")], NOW);
assert.equal(days.length, 2);
assert.equal(days[1].label, "Today");
assert.equal(days[0].label, "Yesterday");
assert.equal(groupByDay([msg("3", "2026-10-12T08:00:00Z")], NOW)[0].label, "12 October");

// unread counts only the other party's unread messages
assert.equal(unreadCount([msg("1", "2026-10-20T08:00:00Z"), msg("2", "2026-10-20T09:00:00Z", "me")], "me"), 1);
assert.equal(unreadCount([], "me"), 0);
console.log("chat ok");
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx --yes tsx --tsconfig tsconfig.json lib/chat.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `lib/chat.ts`**

`groupByDay` compares calendar days in the device timezone, not UTC offsets. Pin "today" through an injectable `now` parameter defaulting to `new Date()` so the test is not time-dependent.

- [ ] **Step 4: Run it and watch it pass**

Run: `npm run test:chat`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/chat.ts lib/chat.test.ts package.json
git commit -m "feat: add chat message validation, grouping and realtime"
```

---

### Task 12: Feature flag and deletion purge

**Files:**
- Modify: `lib/feature-flags.ts`, `lib/feature-flags.test.ts`
- Modify: `lib/data-export.ts:11-23`

**Interfaces:**
- Produces: `social_v1` added to `FeatureFlagName` with default `false`.

- [ ] **Step 1: Write the failing test**

Extend `lib/feature-flags.test.ts`:

```ts
assert.equal(FEATURE_FLAG_DEFAULTS.social_v1, false);
assert.equal(isFeatureEnabled({ feature_flags: { social_v1: true } }, "social_v1"), true);
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm run test:feature-flags`
Expected: FAIL.

- [ ] **Step 3: Add the flag and extend the purge list**

Add `social_v1` to the union and to `FEATURE_FLAG_DEFAULTS` as `false`, with a doc comment in the file's existing style. In `lib/data-export.ts`, append `buddy_profiles` (userColumn `user_id`), `connections`, `connection_requests`, `messages`, `blocks` and `reports` to `USER_TABLES`.

- [ ] **Step 4: Run it and watch it pass**

Run: `npm run test:feature-flags`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/feature-flags.ts lib/feature-flags.test.ts lib/data-export.ts
git commit -m "feat: add social_v1 flag and purge social data on deletion"
```

---

### Task 13: Buddies screens

**Files:**
- Create: `app/(main)/(buddies)/_layout.tsx`, `index.tsx`, `chat.tsx`
- Create: `components/buddies/SafetyStrip.tsx`, `components/buddies/MessageBubble.tsx`

**Interfaces:**
- Consumes: `lib/buddies.ts`, `lib/chat.ts`, `InitialDisc`, `Surface`, `TwoTone`, `social_v1`.

Build to the "Find a buddy" and "Buddy chat" boards. Both screens render nothing but a short explanatory state when `social_v1` is off.

- [ ] **Step 1: Build the buddies list**

Headline `TwoTone` "Nobody / does this / alone". Search field 52px, white, `radius.control`, placeholder **"Search by name or city"**. Filter chips: selected is Ink fill with white text, unselected is white with `inkSoft`. Result rows 86px inside a single `Surface`, `hairline` dividers between rows but none after the last: `InitialDisc`, name 16/600, `describeBuddy()` 13/`inkSoft`, and a "Say hello" outline button. Existing buddies show an underlined "Open" instead.

- [ ] **Step 2: Build the chat screen**

White header with back, `InitialDisc` 40px, name 17/700, subtitle 12/`inkSoft`, and an overflow button opening **Block** and **Report**. Body on paper: day divider in micro caps, incoming bubbles white `radius 20 20 20 6`, outgoing `ink` with white text `radius 20 20 6 20`, both capped at 282px wide, timestamps 11px. Composer: 48px `paper` input at `radius.control` inside the white footer, 48px round `ink` send button, disabled while `validateMessage` fails.

- [ ] **Step 3: Add both safety strips**

Verbatim, in `SafetyStrip`: on the list, *"Buddies see only your first name, city and goals. You can block or leave a chat at any time."*; in the thread, *"Results and reports are never shared in chat."* — the latter styled as the board's `mossTint` strip.

- [ ] **Step 4: Verify by hand**

On `npm run web` with `social_v1` on for the test account: search finds a second account by first name and by city; "Say hello" creates a request; messages send and arrive live in a second browser; Block removes the thread from both sides; Report files a row.

- [ ] **Step 5: Commit**

```bash
git add app/\(main\)/\(buddies\) components/buddies
git commit -m "feat: add buddies search and chat screens"
```

---

### Task 14: Admin report queue

**Files:**
- Create: `admin/src/pages/reports/index.tsx`
- Modify: `admin/src/App.tsx` (register the resource)

**Interfaces:**
- Consumes: the `reports` table (Task 8).

- [ ] **Step 1: Build the page**

Mirror `admin/src/pages/review-queue/index.tsx` — same Refine `useTable` + Ant Design `List`/`Table` shape. Columns: reported at, reporter, target kind, target id, reason, status. Row actions move status `open → reviewing → actioned | dismissed`.

- [ ] **Step 2: Register the resource**

Add `reports` to the `resources` array in `App.tsx`, following the existing entries' shape.

- [ ] **Step 3: Verify**

Run: `cd admin && npm run build`
Expected: builds clean. Then `npm run dev`, file a report from the app, confirm it appears and its status can be changed.

- [ ] **Step 4: Commit**

```bash
git add admin/src/pages/reports admin/src/App.tsx
git commit -m "feat: add report review queue to admin"
```

---

## Phase 4 — Designed screens

Each task below rebuilds screens to its board. The boards are extracted and readable; re-extract with the script in the spec's source note if needed. **No task in this phase changes behaviour, data or gating — only layout, type and colour.** Verification is `npx tsc --noEmit` clean plus a side-by-side look at the board on `npm run web`.

### Task 15: Login and Onboarding

**Files:**
- Modify: `app/(auth)/login.tsx`, `app/(auth)/register.tsx`, `app/(onboarding)/welcome.tsx`, `components/onboarding/OnboardingShell.tsx`

- [ ] **Step 1: Rebuild login** — moss gradient hero band carrying the wordmark and *"Look before, not after."*, white sheet at `radius.surface` overlapping it, `TwoTone` "Welcome / back", bottom-rule email and password fields, one Ink "Log in" button, then the divider and the Apple/Google outline buttons.
- [ ] **Step 2: Rebuild onboarding** — three steps, `MossPattern` or gradient card at `radius.surface`, `TwoTone` headline, 15/`inkSoft` body, a single moss-dot progress row, one Ink "Continue", "Skip" as a plain underlined link, and the disclaimer *"Prescope is a lifestyle awareness tool. It does not diagnose, detect or treat any condition."* kept verbatim.
- [ ] **Step 3: Verify** — `npx tsc --noEmit` clean; compare against the Login and Onboarding boards.
- [ ] **Step 4: Commit** — `git commit -m "feat: rebuild login and onboarding on Moss"`

### Task 16: Home

**Files:**
- Modify: `app/(main)/home.tsx`
- Modify: `components/ui/HomeStatCards.tsx`, `HomeSkeleton.tsx`

- [ ] **Step 1: Rebuild** — micro-caps date, `TwoTone` "Morning, / Priya", moss-gradient next-step card (the one gradient on this screen) linking to Tests, two white stat cards side by side (Habits, Reports) with big number plus grey unit, and the buddy message row with `InitialDisc` and an unread dot.
- [ ] **Step 2: Omit the Assistant link** — per spec §7 the Assistant is out of scope; do not render "Ask about anything on this screen".
- [ ] **Step 3: Verify** — `npx tsc --noEmit` clean; compare against the Home board.
- [ ] **Step 4: Commit** — `git commit -m "feat: rebuild home on Moss"`

### Task 17: Assessment hub and question

**Files:**
- Modify: `app/(main)/questionnaire/index.tsx`, `components/questionnaire/SectionScaffold.tsx`, `QuestionCard.tsx`, `QuestionnaireStepper.tsx`, `SectionProgress.tsx`, `SectionCompleteCard.tsx`

- [ ] **Step 1: Rebuild the hub** — gradient intro band, `TwoTone` headline, section list as 64px rows in one `Surface` with a moss progress indicator per row.
- [ ] **Step 2: Rebuild the question screen** — "Section 2 of 10" in micro caps, question as `displayL`, answers as full-width 52px rows at `radius.control` filling `mossTint` when selected, one Ink "Continue" disabled until answered with the label *"Answer to continue"*.
- [ ] **Step 3: Verify gating is untouched** — section order, save-and-resume and the symptom interrupt all still behave as before.
- [ ] **Step 4: Commit** — `git commit -m "feat: rebuild assessment hub and question on Moss"`

### Task 18: Tests — suggested and reports

**Files:**
- Modify: `app/(main)/(results)/index.tsx`, `lab-results.tsx`, `result-detail.tsx`, `components/results/StatusChip.tsx`, `components/ui/ResultCard.tsx`

- [ ] **Step 1: Rebuild suggested tests** — "From your assessment" micro caps, `TwoTone` "Worth / a / conversation", the fixed-checklist disclaimer verbatim, plain-word filter tabs ("All 3", "Blood", "Imaging"), and rows of plain name in bold with reason in grey and a status chip right.
- [ ] **Step 2: Keep the clinical term off the list** — per the UI-kit board it appears only on the detail screen.
- [ ] **Step 3: Rebuild reports and the detail screen** on the same row and chip pattern.
- [ ] **Step 4: Verify** — `npx tsc --noEmit` clean; compare against the Suggested tests and Test reports boards.
- [ ] **Step 5: Commit** — `git commit -m "feat: rebuild tests and reports on Moss"`

### Task 19: Shop and supplement detail

**Files:**
- Modify: `app/(main)/(store)/index.tsx`, `product.tsx`, `cart.tsx`, `checkout.tsx`, `components/store/ProductCard.tsx`, `components/ui/ProductCard.tsx`

- [ ] **Step 1: Rebuild the shop** — wordmark header with cart count, `displayXL` "Supplements", plain-word category tabs, a `radius.surface` moss product card with a "For you" micro-caps tag, name 20/600, 13/`inkSoft` subtitle, price as `displayL`, round 44px quantity stepper, one Ink "Add to cart".
- [ ] **Step 2: Rebuild the detail screen** on the same pattern.
- [ ] **Step 3: Verify** — `npx tsc --noEmit` clean; cart and checkout still function end to end.
- [ ] **Step 4: Commit** — `git commit -m "feat: rebuild shop and supplement detail on Moss"`

### Task 20: Habit tracker

**Files:**
- Modify: `app/(main)/(activity)/index.tsx`, `log.tsx`, `components/ui/MilestoneStatStrip.tsx`, `JourneyProgressCard.tsx`

- [ ] **Step 1: Rebuild** to the Habit tracker board — streak as a large number with grey unit, habit rows with moss progress fills, no decorative chrome.
- [ ] **Step 2: Verify** — `npx tsc --noEmit` clean; compare against the board.
- [ ] **Step 3: Commit** — `git commit -m "feat: rebuild habit tracker on Moss"`

### Task 21: Settings

**Files:**
- Modify: `app/(main)/(settings)/index.tsx`, `profile.tsx`, `notifications.tsx`, `privacy.tsx`

**Interfaces:**
- Consumes: `buddy_profiles.discoverable` (Task 8).

- [ ] **Step 1: Rebuild** — `displayXL` "Settings", profile row with `InitialDisc` plus name and email, "Your data" and "Reminders" groups as micro-caps labels over `Surface` blocks of 56px rows, switches right-aligned, "Log out" as a plain underlined link.
- [ ] **Step 2: Add the discovery switch** — under a "Buddies" group, **"Let others find me"**, bound to `buddy_profiles.discoverable`, with the subtitle *"Other members can find you by your first name and city."* Visible only when `social_v1` is on.
- [ ] **Step 3: Verify** — toggling it off removes the account from a second account's search results.
- [ ] **Step 4: Commit** — `git commit -m "feat: rebuild settings on Moss, add discovery switch"`

---

## Phase 5 — Sweep and verify

### Task 22: Sweep every remaining screen

**Files:**
- Modify: every `.tsx` under `app/` and `components/` the compiler still flags, plus `global.css` and `tailwind.config.js`

- [ ] **Step 1: Work the compiler's list to zero**

Run: `npx tsc --noEmit`
Fix each remaining error — these are the screens still referencing deleted colour aliases, radius keys, shadows or glass components. Replace with the Moss equivalent; do not reintroduce a shim.

- [ ] **Step 2: Apply the noise-reduction rules to every swept screen**

Spec §6 governs the screens with no board of their own too. On each, remove: a page title duplicated in both header and body, decorative trust badges, a disclaimer already shown on the immediately preceding screen, and stat cards whose number only restates the sentence beside it. Convert boxed section headers to 11px uppercase `inkMuted` labels (**not `inkFaint`** — at 11px that is 3.47:1 against AA's 4.5:1 requirement; `inkMuted` is the colour the boards actually use for these, at 5.36:1), and list rows to bold name + grey reason + right-aligned status.

**Cut nothing load-bearing:** clinical disclaimers, consent language, safety copy and the "not a diagnosis" framing stay in full, including the first time they appear in any sequence.

- [ ] **Step 3: Retune `global.css` and `tailwind.config.js`** to the Moss palette so the NativeWind classes match the token file.

- [ ] **Step 4: Run the forbidden-pattern greps**

```bash
grep -rn "GlassCard\|GlassSurface\|primaryBlue\|iceBlue\|deepTeal\|#2B5FE0\|#EAF1FF\|components/illustrations" app components lib admin/src
```
Expected: no output. Any hit is a sweep miss.

- [ ] **Step 5: Grep for stray shape and shadow**

```bash
grep -rn "shadowOpacity\|elevation:\|BlurView\|expo-blur" app components
```
Expected: no output outside a deliberate, commented exception.

- [ ] **Step 6: Lift the 15px inactive tab labels off the AA floor**

The boards paint inactive tabs `#8A8A84` (`inkFaint`) at 15px, in eight places. That is **3.47:1 against AA's 4.5:1 requirement for normal text** — the same defect class that `inkMuted` was created for at 11px. Here the board is the source of the defect rather than the fix, and accessibility wins over fidelity: a tab label a low-vision user cannot read is not a successful design.

Change inactive tab labels to `inkMuted` (#6B6B65, 5.36:1) in `app/(main)/(store)/index.tsx` and `app/(main)/(results)/index.tsx`. Active tabs stay `ink` at weight 600. The two files must change together — they are the same control.

- [ ] **Step 7: Catch the files the compiler and the greps above both miss**

Step 1's worklist and step 4's greps only find files that referenced a *deleted token*. A file that hardcoded its colours, or styled itself with NativeWind utility classes, compiles cleanly and matches none of those patterns — it would stay pre-Moss forever, silently. Two sweeps close that:

```bash
# off-palette raw hex (every Moss value is excluded from the match)
grep -rloP '#(?!0C0C0A|4F4F49|8A8A84|F1F1EF|FFFFFF|5F6D17|7D9022|A3B82E|EFF2E2|E4E4E0|4A5612|F0E6D2|7A5610|F3DED4|9C3E16|4C5812|2A2A26|6B6B65|C8D59A|fff|FFF)[0-9A-Fa-f]{6}\b' app components

# pre-Moss NativeWind colour classes
grep -rloP 'className="[^"]*(text|bg|border)-(charcoal|teal|sage|coral|cream|mist|slate|amber|blue)' app components
```

At the time this step was written the counts were **9 files** and **23 files** respectively. Both must reach zero. Renaming the class is not enough on its own — `text-charcoal` is a pre-Moss *concept*, so the file needs the Moss token, not a remapped alias.

- [ ] **Step 8: Commit**

```bash
git add -A app components lib global.css tailwind.config.js
git commit -m "feat: sweep remaining screens onto Moss"
```

---

### Task 23: Full verification

- [ ] **Step 1: Types**

Run: `npx tsc --noEmit`
Expected: no output.

- [ ] **Step 2: Tests**

Run: `npm test`
Expected: every suite passes, including `test:tokens`, `test:initials`, `test:buddies`, `test:chat`, `test:feature-flags`.

Run: `npm run test:social-rls`
Expected: PASS.

- [ ] **Step 3: Admin build**

Run: `cd admin && npm run build`
Expected: builds clean.

- [ ] **Step 4: Both platforms**

Run `npm run web` and `npx expo start`. On each: the tab bar shows exactly five items; no blue, blur, shadow or illustration appears on any screen; the headline two-tone rule reads correctly.

- [ ] **Step 5: Clinical gates, by hand**

A symptomatic triage still locks to Pathway B. Consents still sequence BRCA → CTC → SNP. A positive CTC still escalates. The questionnaire still gates on consents.

- [ ] **Step 6: Social, by hand, two accounts**

Search by first name and by city. Say hello, accept, exchange messages live. Block — the thread vanishes for both and a direct API read returns nothing. Report — the row reaches the admin queue. Delete the account — every social row goes with it.

- [ ] **Step 7: Commit any fixes and tag the migration complete**

```bash
git add -A
git commit -m "chore: verify Moss migration across both platforms"
```
