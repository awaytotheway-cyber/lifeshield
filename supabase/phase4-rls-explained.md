# Phase 4 RLS — Plain English Guide (read BEFORE running the SQL)

This document explains **who can see what** after you run `phase4-schema.sql` in the Supabase SQL Editor.

**Important:** This file is SQL for the **SQL Editor only** — not an Edge Function. You paste `phase4-schema.sql`, not TypeScript.

---

## The four roles

| Role | Who they are | What they can do |
|------|----------------|------------------|
| **patient** | Anyone using the mobile app | Only their own rows (unchanged from Phase 1–3) |
| **owner / admin** | You and trusted operators | Full back-office read & write |
| **clinician** | Doctors reviewing plans | Review queue + linked patients only — **not** the whole patient database |
| **clinic_staff** | Fulfilment / lab desk | Orders + lab tracking — **not** clinical results or questionnaire answers |

---

## Helper functions (how policies check roles)

These run inside the database so policies stay simple and consistent:

| Function | What it does |
|----------|----------------|
| `is_staff_role('owner')` etc. | TRUE if the signed-in person has that exact role in `staff_roles` |
| `is_admin_staff()` | TRUE for **owner** or **admin** |
| `is_clinician_staff()` | TRUE for **clinician** |
| `is_clinic_staff_role()` | TRUE for **clinic_staff** |
| `get_my_doctor_id()` | Returns the `doctors` row id for the signed-in auth user |
| `clinician_can_view_patient(user_id)` | TRUE only when a clinician is allowed to see that patient (see below) |

### How clinician ↔ patient linking works (Day 1 foundation)

A clinician can see a patient **only if**:

1. That patient has at least one **draft** intervention (they are in the sign-off queue), **or**
2. The clinician **previously approved** one of that patient's interventions (`approved_by` matches their doctor name in the `doctors` table).

**Explicit guarantee:** A clinician **cannot** browse every patient in `profiles`. If a patient has no draft plan and the clinician never approved their plan, the clinician sees nothing for that person.

> Day 4 will add the Refine Review Queue UI and a server-side sign-off Edge Function. Today's SQL sets the access rules that UI will rely on.

---

## New tables — policies

### `clinics`

| Policy | Who | Access |
|--------|-----|--------|
| `admin_clinics_all` | owner, admin | Create, read, update, delete all clinics |
| `staff_clinics_read` | clinician, clinic_staff | Read clinics (for context when fulfilling or reviewing) |

### `doctors`

| Policy | Who | Access |
|--------|-----|--------|
| `admin_doctors_all` | owner, admin | Manage all doctor records |
| `clinician_doctors_read` | clinician | Read their own doctor row, doctors at the same clinic, and active doctors |
| `clinic_staff_doctors_read` | clinic_staff | Read active doctors only |

### `clinical_thresholds`

| Policy | Who | Access |
|--------|-----|--------|
| `admin_thresholds_all` | owner, admin | Read and edit threshold values (TSH, BMI, etc.) |
| `clinician_thresholds_read` | clinician | Read thresholds only (cannot edit) |
| `authenticated_thresholds_read` | any signed-in user (mobile app) | Read cut-offs so the rules engine can load them |

Seeded values match `lib/clinical-thresholds.ts` (code fallback if fetch fails):

- `fastingInsulin_elevated` = 8
- `bmi_obesityThreshold` = 30
- `tsh_subclinicalHypo` = 4.5
- `liverEnzyme_altAstElevated` = 40

### `staff_roles`

| Policy | Who | Access |
|--------|-----|--------|
| `own_staff_role_read` | everyone signed in | See **your own** role row only |
| `admin_staff_roles_all` | owner, admin | Assign and change staff roles |

You cannot give yourself `owner` through the app — the first owner row is inserted manually in SQL Editor (see below).

### `lab_orders`

| Policy | Who | Access |
|--------|-----|--------|
| `own_lab_orders` | patient | Read your own lab order status |
| `admin_lab_orders_all` | owner, admin | Full access |
| `clinic_staff_lab_orders_fulfil` | clinic_staff | Read all lab orders |
| `clinic_staff_lab_orders_update` | clinic_staff | Update status (kit dispatched, sample received, etc.) |
| `clinician_lab_orders_read` | clinician | Read lab orders for linked/queue patients only |

### `push_tokens`

| Policy | Who | Access |
|--------|-----|--------|
| `own_push_tokens` | patient | Save and manage your own device push token |
| `admin_push_tokens_read` | owner, admin | Read all tokens (for sending push notifications in Day 7) |

---

## Existing tables — NEW staff policies (patient policies unchanged)

Phase 1–3 patient policies (`own_profile`, `own_orders`, `own_results_select`, etc.) are **not removed**. Patients still only see their own data.

### `products`

| Policy | Who | Access |
|--------|-----|--------|
| `read_products` | everyone | Browse catalog (unchanged from Phase 3) |
| `admin_products_write` | owner, admin | Add, edit, deactivate products |

### `orders` and `order_items`

| Policy | Who | Access |
|--------|-----|--------|
| `own_orders` / `own_order_items` | patient | Your orders only (unchanged) |
| `admin_orders_all` / `admin_order_items_all` | owner, admin | All orders and line items |
| `clinic_staff_orders_read` | clinic_staff | See all orders for packing/shipping |
| `clinic_staff_orders_fulfil` | clinic_staff | Update fulfilment status |
| `clinic_staff_order_items_read` | clinic_staff | See what was ordered |

**clinic_staff cannot see:** `test_results`, `questionnaire_responses`, `interventions`, or `profiles` (no policies granted).

### `profiles`

| Policy | Who | Access |
|--------|-----|--------|
| `own_profile` | patient | Your profile only (unchanged) |
| `admin_profiles_all` | owner, admin | Full patient list |
| `clinician_profiles_read` | clinician | **Only** patients in the review queue or previously approved |

**clinic_staff cannot see patient profiles.**

### `test_orders`

| Policy | Who | Access |
|--------|-----|--------|
| `own_tests` | patient | Your recommended tests (unchanged) |
| `admin_test_orders_all` | owner, admin | All test orders |
| `clinician_test_orders_read` | clinician | Test orders for linked/queue patients only |

### `test_results` ⚠️ sensitive

| Policy | Who | Access |
|--------|-----|--------|
| `own_results_select` | patient | Your own results (unchanged) |
| `admin_test_results_all` | owner, admin | All results — read and write |
| `clinician_test_results_read` | clinician | Results for linked/queue patients only |

**Explicit guarantee: clinic_staff have NO policy on `test_results`. They cannot read clinical result values.**

### `interventions` (the personalised plan)

| Policy | Who | Access |
|--------|-----|--------|
| `own_interventions` | patient | Your plan rows (unchanged) |
| `admin_interventions_all` | owner, admin | All interventions |
| `clinician_interventions_read` | clinician | All **draft** rows (review queue) + linked patients' rows |
| `clinician_interventions_update` | clinician | Update interventions for linked/queue patients (approval prep — final sign-off goes through Edge Function on Day 4) |

**clinic_staff cannot see interventions.**

### `questionnaire_responses` ⚠️ sensitive

| Policy | Who | Access |
|--------|-----|--------|
| `own_questionnaire` | patient | Your answers (unchanged) |
| `admin_questionnaire_all` | owner, admin | Read all questionnaire data |
| `clinician_questionnaire_read` | clinician | Read answers for linked/queue patients only |

**Explicit guarantee: clinic_staff have NO policy. They cannot see questionnaire clinical data.**

### `triage_responses`, `consent_records`, `follow_ups`

| Table | owner/admin | clinician | clinic_staff |
|-------|-------------|-----------|--------------|
| `triage_responses` | read all | read linked/queue patients | **no access** |
| `consent_records` | read all | read linked/queue patients | **no access** |
| `follow_ups` | full access | read linked/queue patients | **no access** |

### `cart_items`

| Policy | Who | Access |
|--------|-----|--------|
| `own_cart` | patient | Your cart (unchanged) |
| `admin_cart_read` | owner, admin | Read any cart (support) |

---

## Quick safety checklist

- ✅ Patients: only own data (Phase 1–3 rules intact)
- ✅ Clinicians: review queue + linked patients — **not** whole database
- ✅ Clinic staff: orders + lab fulfilment — **not** test results or questionnaire
- ✅ Owner/admin: full back-office access
- ✅ First owner must be inserted manually in SQL Editor (bootstrap)

---

## What to do in Supabase (step by step)

1. Open [supabase.com](https://supabase.com) → your PRESCOPE project → **SQL Editor** → **New query**.
2. Open the file `supabase/phase4-schema.sql` from this project in a text editor.
3. Copy **the entire file** and paste it into the SQL Editor.
4. Click **Run**. You should see “Success” with no red errors.
5. Check **Table Editor** — you should see new tables: `clinics`, `doctors`, `clinical_thresholds`, `staff_roles`, `lab_orders`, `push_tokens`.
6. Check `clinical_thresholds` — four seeded rows should appear.

**Safe to re-run:** If a previous run failed partway through (e.g. a "relation does not exist" error), paste the **whole file again** and click Run. The script is idempotent — tables use `IF NOT EXISTS`, policies are dropped and recreated, functions use `CREATE OR REPLACE`, and threshold seeds use `ON CONFLICT`. No tables are ever dropped.

---

## How to add yourself as owner (after you sign up in the app)

You need your **user id** from Supabase (not your email password).

1. Sign up or log in once in the mobile app (so a row exists in `auth.users`).
2. In Supabase: **Authentication** → **Users** → click your account → copy the **User UID** (a long UUID like `a1b2c3d4-...`).
3. In **SQL Editor**, run this **one-time** insert (replace the placeholder with your real UID):

```sql
INSERT INTO public.staff_roles (user_id, role)
VALUES ('YOUR-USER-UID-HERE', 'owner')
ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;
```

4. Optionally link yourself as a doctor (for clinician portal testing later):

```sql
INSERT INTO public.doctors (auth_user_id, name, can_sign_off, active)
VALUES ('YOUR-USER-UID-HERE', 'Dr Your Name', TRUE, TRUE);
```

(Run this once — if you run it twice you will get two doctor rows.)

5. Sign out and back in to the admin app (Day 2) or refresh your session.

**You only need one `owner` row to bootstrap.** After that, owners can assign other staff through the admin panel (Day 2).

---

## What was NOT changed

- No mobile app screens were modified for Day 1.
- Phase 1–3 SQL files are untouched — this is a **new** file you run **after** the earlier schemas.
- Day 2 (Refine admin scaffold) has **not** started — stop here and confirm these policies look right before continuing.
