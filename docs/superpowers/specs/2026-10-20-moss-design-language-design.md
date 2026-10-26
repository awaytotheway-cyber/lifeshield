# Prescope — Moss Design Language migration + Buddies chat

**Date:** 2026-10-20
**Status:** Approved design, ready for implementation planning
**Source of truth for visuals:** `Prescope — Moss Design Language.html` (17 boards, extracted)

---

## 1. Intent

Replace the blue glassmorphism design system with the Moss design language across
the whole app, cut the tab bar to the five tabs the system specifies, and ship a
working buddy chat with user search. The Moss boards are not inspiration — they
are a specification, and board 02 names this repo's migration explicitly:

> This replaces the blue glassmorphism tokens in `lib/design-tokens.ts`.
> `primaryBlue` → Ink for actions and Moss Deep for accents; `iceBlue` → Paper;
> `glassFill` and the blur layers are dropped — this system has no glass, no
> shadows and no gradients outside the hero band.

**Success looks like:** no blue, no glass, no shadow and no decorative
illustration survives anywhere in the app; the tab bar is Home · Tests · Shop ·
Buddies · More; a user can find another user by name or city and hold a real
conversation with them; and every screen reads quieter than it does today
without losing a necessary word.

### Decisions taken by the product owner

| Question | Decision |
|---|---|
| Who is findable in buddy search | **Everyone**, by first name + city |
| Moderation scope | **Full gate** — chat + block/report + admin queue + deletion purge |
| Migration breadth | **Foundation + the 17 designed screens + a sweep** of the rest |
| Existing illustrations | **Delete all 20**; Moss patterns and initial discs replace them |

On discovery: the owner chose everyone-discoverable after being shown the
opt-in alternative. The design below still constrains what discovery can leak —
only first name, city and goals are reachable, from a table that holds nothing
else — and ships an opt-*out* switch. That is a containment measure, not a
reversal of the decision.

---

## 2. The design language

### 2.1 Colour

Three greens, three greys, one black. Black never decorates — it marks the
single thing to tap. Moss appears as fills and progress, never as a button.

| Token | Hex | Role |
|---|---|---|
| `ink` | `#0C0C0A` | Headlines; the one primary button per screen |
| `inkSoft` | `#4F4F49` | Body copy — 8.4:1 on paper |
| `inkFaint` | `#8A8A84` | Grey headline words, **24px and up only** (3.47:1 on white — clears the 3:1 large-text bar and nothing else) |
| `inkMuted` | `#6B6B65` | **11px uppercase micro labels and secondary meta** — 5.36:1 on white, so it passes AA where `inkFaint` does not. Used 91 times across the boards (32 on 11px labels) though the colour board's own swatch table never declares it |
| `paper` | `#F1F1EF` | Screen ground. White is for cards |
| `white` | `#FFFFFF` | Cards |
| `mossDeep` | `#5F6D17` | Text-safe green, 5.7:1 on white |
| `mossMid` | `#7D9022` | Gradient body, progress fill |
| `mossBright` | `#A3B82E` | Gradient top, fills only — **never text** |
| `mossTint` | `#EFF2E2` | Chips, soft fills, selected rows |
| `hairline` | `#E4E4E0` | The only divider, 1px, used sparingly |

**Clinical status is lightness, not hue** — green → amber → clay, never
green → red, so the three stay distinct in greyscale and for colour-blind users.
Every chip carries its word; colour is never the only signal.

| Status | Fill | Text | Contrast |
|---|---|---|---|
| Within range | `#EFF2E2` | `#4A5612` | 6.3:1 |
| Worth watching | `#F0E6D2` | `#7A5610` | 5.4:1 |
| Worth discussing | `#F3DED4` | `#9C3E16` | 5.2:1 |

The moss gradient (`155°, #A3B82E → #7D9022 → #4C5812`) is reserved for hero
bands and the assessment intro. **One per screen, never behind body copy.**

### 2.2 Typography

Schibsted Grotesk carries every screen. The look does not come from the
typeface — it comes from splitting one headline into two voices.

**The two-tone rule.** Bold black carries the meaning, regular grey carries the
grammar. *Read only the black words and the sentence still works — that is the
test.* On a moss ground, grey becomes a pale moss tint so the rule survives.

| Style | Size / line-height / tracking | Weight |
|---|---|---|
| Display XL | 46 / 0.92 / −3.5% | 700 |
| Display L | 34 / 1.0 / −3% | 700 |
| Title | 20 / 1.2 / −1% | 600 |
| Body | 15 / 1.55 | 400 |
| Label | 13 / 1.4 | 500 |
| Micro | 11 / +14% uppercase | 600 |

Weights in play: 400 grey headline words and body; 500 labels and inactive
tabs; 600 titles, buttons, active tabs; 700 display headlines only.

### 2.3 Shape, and what is forbidden

> Anything you look at gets a 20px corner. Anything you press gets a 4px
> corner — except round things, which go fully round.

- `radius.surface = 20` — cards, sheets, message bubbles, media
- `radius.control = 4` — buttons, inputs, answer rows, chat composer
- `radius.pill = 999` — status chips, steppers, avatars, send button

**No borders, no shadows, no card outlines.** White on paper does the
separating. Controls are 56px tall; tap targets never below 44px.

**One black button per screen.** Everything secondary is an outline button or a
plain underlined link. Tabs are plain words — no pills, no underline, no box;
weight and colour carry the state.

---

## 3. Token core — the leverage point

`lib/design-tokens.ts` is rewritten to Moss **keeping its existing export
names**, so all 109 importing files compile unchanged and change colour at once.

- `colors` gains the Moss names above. The legacy aliases (`primaryBlue`,
  `iceBlue`, `deepTeal`, `sage`, `coral`, `cream`…) are **deleted, not
  remapped** — a remap would let blue-era thinking survive behind a green value.
  Every call site is updated in the sweep.
- `shadows` keeps its keys but every value becomes a no-op (`shadowOpacity: 0`,
  `elevation: 0`). The 47 glass screens flatten before they are hand-touched.
- `glassBlurIntensity` → `0`, then removed once `GlassCard` is gone.
- `radius` collapses to `surface` / `control` / `pill`; old keys (`card`,
  `button`, `chip`, `glass`…) are removed in the sweep.
- `gradients.screen` is deleted. Only `heroGradient` survives.

`lib/typography.ts` switches to Schibsted Grotesk. The `fontFamily` export keys
stay identical so no screen breaks on import, but map onto the four real
weights. `@expo-google-fonts/schibsted-grotesk` is added; Manrope, Instrument
Sans, Plus Jakarta, Inter and DM Mono are removed from `package.json` and from
the font loader in `app/_layout.tsx`.

A new `<TwoTone>` component encodes the headline rule so screens cannot
accidentally violate it:

```tsx
<TwoTone bold="Worth" grey="a" bold2="conversation" />
```

### 3.1 UI primitives

`components/ui/` is reworked at the primitive level, because these feed
everything:

- **`GlassCard` and `GlassSurface` are deleted**, not shimmed, and replaced by a
  flat `Surface` (white, radius 20, no border, no shadow). A hollow shim would
  let 47 files keep glass semantics under a flat skin.
- `Button` — Ink primary, outline secondary, underlined-link tertiary, 56px,
  radius 4, disabled `#E4E4E0` on `#6B6B65`.
- `Card` → delegates to `Surface`.
- `StatusChip` — the three clinical statuses only, each with its word.
- `TextField` / `TextInput` — 56px, no box, 1.5px Ink bottom rule, 13px label.
- `RadioGroup` / `ChoiceToggle` — whole row is the target, selected fills Moss
  Tint, radius 4, 52px minimum.
- `EmptyState` — type and pattern; the illustration slot is removed.
- `ProgressBar` / `ProgressRing` — Moss Mid fill on `#E4E4E0`.
- `ColorSwitch`, `TrustBadgeGrid`, `Shimmer` and the other blue-era decorative
  primitives are reviewed in the sweep and deleted where nothing meaningful is
  lost.

### 3.2 Illustrations

`components/illustrations/` (20 components) is **deleted in full**, along with
`IllustrationFrame`. The 30 files referencing it are updated:

- Empty states → type plus a Moss pattern (a flat, tiling geometric motif drawn
  from the gradient palette — no figures, no spot art, no AI-looking scenes).
- People → tinted initial discs, exactly as the Buddy boards draw them: 46px,
  radius 999, Moss Tint ground with `#4A5612` initials, alternating to
  `#F0E6D2`/`#7A5610`.

No avatar is ever generated for a person who has not supplied one beyond their
own initials.

---

## 4. Navigation — five tabs

```
Home · Tests · Shop · Buddies · More
```

Line icons at 1.5px, labels at 10px, active Ink (600), inactive Ink Faint (500).
No pill, no glass backdrop, white bar on paper. No badge dot unless something
genuinely waits.

| Tab | Route | Notes |
|---|---|---|
| Home | `app/(main)/home.tsx` | Date, greeting, next-step hero, two stat cards, buddy message row |
| Tests | `app/(main)/(results)/` | Merges suggested tests + reports behind a filter row |
| Shop | `app/(main)/(store)/` | Was hidden; now a tab |
| Buddies | `app/(main)/(buddies)/` | **New** |
| More | `app/(main)/(settings)/` | Was "More" already |

**Questionnaire stops being a tab.** The boards reach the assessment from
Home's next-step card — which is why Home reads *"Three tests are waiting to be
talked through"*. The route group stays and all its gates stay; only its tab
entry goes.

The side `AppDrawer` (`components/navigation/AppDrawer.tsx`,
`DrawerContext.tsx`, `MenuButton.tsx`) is **deleted** — it duplicated More and
was a second navigation model competing with the tab bar.

All existing hidden groups (`(consent)`, `(triage)`, `(plan)`, `(followup)`,
`(orders)`, `(activity)`, `(goals)`, `(meal-plans)`, `(medications)`,
`(recipes)`, `(reminders)`) keep `href: null` and stay reachable by route.
**Every journey gate in `app/(main)/_layout.tsx` is preserved unchanged** —
triage lock, consent ordering, CTC escalation, questionnaire gating. This is a
visual and navigational change, not a change to clinical flow.

---

## 5. Buddies — search and chat

Built on Supabase Realtime, the in-house option in the enhancements plan §12,
so no chat vendor is introduced and no user data leaves Supabase.

### 5.1 Why a separate profile table

`profiles` carries an `own_profile` RLS policy (`FOR ALL USING (auth.uid() =
id)`), so one user cannot read another's row at all — correctly. Buddy search
therefore reads a **separate table that only ever contains shareable fields**.
The privacy boundary becomes structural rather than a promise about which
columns a query selects.

```sql
buddy_profiles (
  user_id       uuid primary key references profiles(id) on delete cascade,
  first_name    text not null,          -- first name only, never full_name
  city          text,
  goals         text[] default '{}',
  discoverable  boolean not null default true,
  created_at    timestamptz default now()
)
```

Nothing from the assessment, triage, results, orders or medications is present
in this table, so no query against it can leak them.

### 5.2 Tables

```sql
connections (
  id, user_a uuid, user_b uuid, status text, requested_at, accepted_at,
  check (user_a < user_b)                -- dedupes the pair, per plan §12
)
connection_requests (id, from_user, to_user, message, status, created_at)
messages (id, connection_id, sender_id, body text, created_at, read_at)
blocks  (id, blocker_id, blocked_id, created_at)
reports (id, reporter_id, target_kind, target_id, reason, status, created_at)
```

RLS on every table. A second user cannot read row-1's data, and that is
asserted by a test, per the plan's per-phase checklist item 2.

**Blocking is enforced in the RLS policy, not in the UI.** A blocked user cannot
read or insert into the thread even with a raw API call — hiding a thread in the
client would be a cosmetic block.

### 5.3 Search

A `search_buddies(query text)` `SECURITY DEFINER` RPC:

- matches `first_name` or `city`, case-insensitive prefix
- returns `first_name`, `city`, `goals`, `user_id` — and nothing else
- **requires `length(trim(query)) >= 2`** and caps results, so the user table
  cannot be paged through with an empty or one-letter query
- excludes rows where `discoverable = false`, the caller, and anyone in a
  `blocks` relationship with the caller either way

`discoverable` defaults `true` per the owner's decision; Settings carries a
"Let others find me" switch to turn it off.

### 5.4 Screens

- `app/(main)/(buddies)/index.tsx` — "Nobody does this alone", search field
  ("Search by name or city"), filter chips, result rows with initial disc, name,
  `city · goals`, and a "Say hello" outline button. Existing buddies show "Open".
- `app/(main)/(buddies)/chat.tsx` — day divider, incoming bubbles (white,
  `20 20 20 6`), outgoing (Ink, white text, `20 20 6 20`), timestamps, typing
  dots, 48px composer with round Ink send button.
- Overflow menu on the chat header: **Block** and **Report**, both reachable in
  two taps.

### 5.5 Safety copy

Both boards carry safety strips that ship as real components, not decoration:

- Buddies: *"Buddies see only your first name, city and goals. You can block or
  leave a chat at any time."*
- Chat: *"Results and reports are never shared in chat."*

The chat layer has no read path to results or reports, so the second line is
enforced by the schema and not only asserted by copy.

### 5.6 Moderation gate

Per enhancements plan §12, no social feature ships without all three:

1. **Block/report UI** — in the chat overflow menu (§5.4).
2. **Admin report queue** — a `reports` resource in `admin/src/pages/reports/`,
   mirroring the existing `review-queue` page (Refine + Ant Design + Supabase),
   with status transitions and a link to the reported thread.
3. **Deletion** — `buddy_profiles`, `connections`, `connection_requests`,
   `messages`, `blocks` and `reports` are added to the table list in
   `lib/data-export.ts` so account deletion purges social data and export
   includes it.

Shipped behind a new `social_v1` feature flag, **default `false`**, per the
plan's rollout mechanics.

### 5.7 Logic placement

Pure logic in `lib/buddies.ts` and `lib/chat.ts` with `lib/buddies.test.ts` and
`lib/chat.test.ts` beside them — matching of search results, connection-pair
ordering (`user_a < user_b`), block filtering, message grouping by day, and
unread counting are all pure functions testable without a network.

---

## 6. Screens to rebuild

Sixteen of the 17 boards, mapped to routes. The seventeenth, Assistant, is out
of scope — see §7.

| Board | Route |
|---|---|
| Login | `app/(auth)/login.tsx` |
| Onboarding | `app/(onboarding)/welcome.tsx` |
| Assessment hub | `app/(main)/questionnaire/index.tsx` |
| Assessment question | `components/questionnaire/SectionScaffold.tsx` + `QuestionCard.tsx` |
| Home | `app/(main)/home.tsx` |
| Suggested tests | `app/(main)/(results)/index.tsx` |
| Test reports | `app/(main)/(results)/lab-results.tsx`, `result-detail.tsx` |
| Wellness shop | `app/(main)/(store)/index.tsx` |
| Supplement detail | `app/(main)/(store)/product.tsx` |
| Habit tracker | `app/(main)/(activity)/index.tsx` |
| Find a buddy | `app/(main)/(buddies)/index.tsx` (new) |
| Buddy chat | `app/(main)/(buddies)/chat.tsx` (new) |
| Settings | `app/(main)/(settings)/index.tsx` |
| Typography / Colour / UI kit | §2–3, not screens |

### Noise reduction

Applied per screen, from the boards:

- One headline, two voices. One black button. One hero gradient at most.
- Status is a chip with a word, never a coloured dot alone.
- List rows are: plain name in bold, reason in grey, status on the right. **The
  clinical term never appears on a list** — it waits on the detail screen.
- Section labels are 11px uppercase Ink Faint, not boxed headers.
- Remove: duplicated page titles in both header and body, decorative trust
  badges, repeated disclaimers on consecutive screens, stat cards whose number
  restates the sentence beside it.
- **No necessary word is cut.** Clinical disclaimers, consent language, safety
  copy and the "not a diagnosis" framing stay in full — they are the product's
  position, not noise.

### Spacing

24px screen gutter · 20px card padding · 16px between cards · 12px between rows
within a card · 44px minimum tap target · 56px controls · 86px buddy rows ·
64px list rows.

---

## 7. Explicitly out of scope

**The Assistant board is not built.** It is designed in the system, but it
interprets clinical values — *"TSH … at 5.2 it is sitting a little above the
usual range"* — and that collides with two standing constraints:

- Enhancements plan §17: *"No LLM/chat integration is scoped. If it comes back,
  it's a separate plan."*
- Prescope's own positioning, printed on the onboarding board: *"Prescope is a
  lifestyle awareness tool. It does not diagnose, detect or treat any
  condition."* An assistant that tells a user what their TSH means is
  interpreting a result.

The board's own disclaimer (*"I can explain wording — I can't tell you what it
means for you"*) acknowledges the line, and the sample answer crosses it. This
needs a separate plan and legal review of the copy, per plan §16. Home's "Ask
about anything on this screen" link is therefore **omitted** from the Home
rebuild rather than pointing at an unbuilt screen.

Also out of scope: re-architecting routing, touching the rules engine, and any
change to clinical gating logic.

---

## 8. Order of work

1. **Foundation** — tokens, typography, fonts, `Surface`, `TwoTone`, UI
   primitives. Nothing visual is hand-tuned yet; the app goes flat and green.
2. **Navigation** — five tabs, delete `AppDrawer`, preserve every gate.
3. **Designed screens** — the 13 routes in §6, to board fidelity.
4. **Chat** — migration, RLS, RPC, `lib/`, screens, admin queue, deletion purge.
5. **Sweep** — every remaining `.tsx`: no `GlassCard`, no blue hex, no shadow,
   no gradient outside the hero, no illustration import, radius rule obeyed.
6. **Verify** — §9.

---

## 9. Verification

- `npx tsc --noEmit` clean.
- `npm test` green, including new `lib/buddies.test.ts` and `lib/chat.test.ts`
  and the RLS cross-user test.
- Greps that must return zero outside the token file: `GlassCard`,
  `GlassSurface`, `primaryBlue`, `iceBlue`, `deepTeal`, `#2B5FE0`, `#EAF1FF`,
  `components/illustrations`.
- Tab bar shows exactly five items.
- Manual QA on both `npx expo start` and `npm run web` — both work today and
  both must keep working, per plan §15 item 10.
- Journey gates re-checked by hand: symptomatic triage still locks, consents
  still sequence, CTC positive still escalates.
- Contrast spot-check of the three status chips and Ink Faint usage (grey
  headline words at 24px+ only).

---

## 10. Risks

| Risk | Mitigation |
|---|---|
| Everyone discoverable by default | Shareable fields isolated in `buddy_profiles`; 2-char minimum and result cap prevent enumeration; opt-out switch in Settings |
| Deleting `GlassCard` touches 47 files | Flat `Surface` replacement, done in the foundation step so breakage surfaces immediately rather than at sweep time |
| Dropping 4 font families | `fontFamily` export keys preserved; only weights shift |
| Token alias deletion breaks 109 files | Deliberate — the compiler enumerates every call site, which is the sweep's worklist |
| Chat is the highest-risk phase in the plan | Full moderation gate, RLS-enforced blocking, `social_v1` default off |
