# PRESCOPE Admin Panel (Phase 4 Day 2–4)

This folder is a **separate browser app** for back-office staff. It does **not** run inside the Expo mobile app. Admins open it on a laptop in Chrome or Edge.

## What this is

- **Refine** — open-source React admin framework (free, self-hosted)
- **Supabase** — same database as the mobile app (`@refinedev/supabase` data provider)
- **Vite** — fast dev server for local development

Day 2–4 resources:

| Menu item   | Table                  | What you can do                          |
|------------|------------------------|------------------------------------------|
| **Review queue** | `interventions` + results | **Day 4** — approve / decline / finalise patient plans |
| **Clinical thresholds** | `clinical_thresholds` | **Day 3** — edit TSH, BMI, insulin cut-offs (owner/admin); clinicians read-only |
| Clinics    | `clinics`              | Full create / edit / list                  |
| Doctors    | `doctors`              | Full create / edit / list                  |
| Products   | `products`             | Full CRUD — edit test prices here          |
| Orders     | `orders`               | List, view, update fulfilment status       |
| Order items| `order_items`          | List and view line items (read-only)       |
| Patients   | `profiles`             | Read-only list                             |

**Not built yet (later days):** live lab provider, notifications.

---

## Change TSH / BMI cut-offs in the browser (Day 3)

1. Sign in as **owner** or **admin** (clinicians can view but not edit).
2. Sidebar → **Clinical thresholds**.
3. Click **Edit** on a row, for example:
   - **Obesity BMI threshold** (`bmi_obesityThreshold`) — default 30
   - **TSH subclinical hypothyroid cut-off** (`tsh_subclinicalHypo`) — default 4.5
   - **Fasting insulin elevated cut-off** (`fastingInsulin_elevated`) — default 8
4. Change **Value**, keep the plain **description** readable, set **Status** to *Confirmed* when a clinician agrees → **Save**.

The mobile app loads these numbers from Supabase when someone finishes the questionnaire or refreshes their plan. If the phone is offline or the fetch fails, it silently uses the hard-coded defaults in `lib/clinical-thresholds.ts` — the app never crashes.

**One-time SQL (if you ran Phase 4 schema before Day 3):** paste and run `supabase/phase4-day3-thresholds-read.sql` in the SQL Editor so signed-in mobile users can read threshold rows.

**Quick test without the phone:** from the project root run `npm run test:rules` — includes checks that custom threshold overrides change rule outcomes.

---

## One-time setup

### 1. Environment variables

Copy the example file and paste your Supabase keys (same project as the mobile app):

```powershell
cd C:\Users\91878\LifeMate\admin
copy .env.example .env
```

Edit `admin/.env`:

```env
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_public_key_here
```

These are the **public** keys from Supabase → **Settings → API**.  
**Never** put the service-role key in this file — the anon key + Row Level Security is enough for staff.

The mobile app uses `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`; the values are the same, only the variable names differ (Vite requires the `VITE_` prefix).

### 2. Staff role in Supabase

Signing in with Supabase auth is **not enough**. Your user must have a row in `staff_roles`.

In Supabase → **SQL Editor**, run (replace the UUID with your auth user id from **Authentication → Users**):

```sql
INSERT INTO public.staff_roles (user_id, role)
VALUES ('YOUR-AUTH-USER-UUID-HERE', 'owner')
ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;
```

Allowed roles: `owner`, `admin`, `clinician`, `clinic_staff`. For Day 2 catalog work, use **`owner`** or **`admin`**.

### 3. Install and run

```powershell
cd C:\Users\91878\LifeMate\admin
npm install
npm run dev
```

Open the URL shown in the terminal — usually **http://localhost:5173**

Sign in with the **same email and password** you use in the mobile app (must have `staff_roles` as above).

If you sign in but see **“Not authorized”**, you are missing the `staff_roles` row — add it in SQL Editor and try again.

---

## Troubleshooting “Failed to fetch” / can’t sign in

### 1. Check `admin/.env` (most common fix)

The admin app reads **`VITE_SUPABASE_URL`** and **`VITE_SUPABASE_ANON_KEY`**. They must be the **same values** as the mobile app’s `EXPO_PUBLIC_*` keys in the project root `.env`:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...your_anon_key...
```

Rules:

- URL must start with `https://` and end with `.supabase.co` (no trailing slash, no quotes).
- Copy from Supabase → **Settings → API** (Project URL + anon public key).
- **Never** put the service-role key here.

After any change to `admin/.env`, **stop and restart** the dev server (`Ctrl+C`, then `npm run dev` again). Vite only loads env vars at startup.

### 2. Supabase Auth URL settings (for redirects / OAuth)

For email/password login this is usually optional, but set it if redirects fail:

1. Supabase dashboard → **Authentication → URL Configuration**
2. **Site URL:** `http://localhost:5173`
3. **Redirect URLs:** add `http://localhost:5173/**`

### 3. CORS and “Failed to fetch”

Supabase’s hosted API already sends CORS headers for browser apps. A raw **“Failed to fetch”** or **AuthRetryableFetchError** almost always means the browser **never got a response** — not a wrong password.

Typical causes:

| Cause | Fix |
|-------|-----|
| Missing or wrong `admin/.env` | Copy keys from root `.env`, restart dev server |
| Dev server started before `.env` existed | Restart `npm run dev` |
| Supabase project paused (free tier) | Open supabase.com → restore project |
| VPN / firewall / ad blocker | Try another network or disable blockers for `*.supabase.co` |
| Typo in URL (extra space, missing `https://`) | Re-paste URL and key, save, restart |

You do **not** need to configure custom CORS on Supabase for this admin panel.

Quick health check (replace with your project URL):

```powershell
curl.exe -s -o NUL -w "%{http_code}" -H "apikey: YOUR_ANON_KEY" "https://YOUR-PROJECT.supabase.co/rest/v1/"
```

A response of **401** or **200** means Supabase is reachable. **000** or timeout means network/DNS/firewall.

---

## Quick verification (Day 2 checklist)

### Add a clinic

1. Sign in → sidebar **Clinics** → **Create**
2. Enter a name (required), city, phone, etc. → **Save**
3. Confirm it appears in the list

### Edit a test price

1. Sidebar **Products**
2. Filter or scroll to a **test** row (e.g. “Routine bloods”)
3. Click **Edit** → change **Price** → **Save**
4. Optional: open Supabase **Table Editor → products** and confirm the new price

### Update order fulfilment (if you have orders)

1. Sidebar **Orders** → pick an order → **Edit**
2. Change **Fulfilment status** (e.g. `processing` → `shipped`) → **Save**

---

## Scripts

| Command        | Purpose                          |
|----------------|----------------------------------|
| `npm run dev`  | Local dev server (port 5173)     |
| `npm run build`| Production build to `dist/`      |
| `npm run preview` | Preview production build      |

---

## Mobile app unchanged

The Expo app in the project root is untouched. Start it as before:

```powershell
cd C:\Users\91878\LifeMate
npx expo start
```

---

## Installed versions (Day 2)

- Refine core v5 + Ant Design UI v6 + Supabase data provider v6
- React 19, Vite 8, TypeScript 7
- Node 22+ recommended (same as Expo SDK 57)

If `npm install` prints peer-dependency warnings, note them — do not force `--legacy-peer-deps` unless Refine docs say so.

---

## Review Queue — clinician sign-off (Day 4)

### How a clinician opens the review queue

1. `cd admin` → `npm run dev` → open **http://localhost:5173**
2. Sign in with a staff account (`staff_roles` row required).
3. Sidebar → **Review queue**.
4. Click **Open review** on a patient with draft plan items.

On the patient screen you will see:

- **Safety flags** at the top (iodine hard-stop, DIM/omega-3 vs hormone therapy / blood thinners)
- **Lab results** (plain name + clinical test name + values)
- **Plan interventions** with clinical basis
- Per row: **Approve**, **Decline**, **Edit note** (dosage note)
- **Finalise plan** when every draft is decided — flips approved rows to `active`

### Who can approve?

| Role | Can approve / finalise? |
|------|-------------------------|
| `owner` / `admin` | Yes |
| `clinician` with `can_sign_off = true` on `doctors` | Yes |
| `clinician` without `can_sign_off` | View queue only |
| `clinic_staff` | No clinical review |

To let a clinician sign off, set **Can sign off** when editing their row under **Doctors**, and link their **Auth user id** to their Supabase login.

### One-time SQL (required for sign-off)

In Supabase → **SQL Editor**, paste and run:

`supabase/phase4-day4-sign-off.sql`

This creates the `sign_off_intervention()` fallback used when the Edge Function is not deployed.

### Deploy the sign-off Edge Function (recommended)

See `supabase/functions/sign-off-intervention/README.md` for full steps.

Short version:

1. Supabase → **Settings → API** → copy the **service_role** key (never put it in `admin/.env`).
2. Edge Functions → create **`sign-off-intervention`** → paste `index.ts` → Deploy.
3. Add secret `SUPABASE_SERVICE_ROLE_KEY` if the dashboard did not set it automatically.

Or from the project root (if Supabase CLI is linked):

```powershell
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
npx supabase functions deploy sign-off-intervention
```

The admin panel tries the Edge Function first, then falls back to the SQL helper.

### How approval unlocks the store for the patient

On the phone, `canPurchase()` blocks supplements linked to a **draft** intervention.

| Status after your action | Patient can order from store? |
|--------------------------|-------------------------------|
| `draft` | No — still pending review |
| `clinician_approved` | Yes — you approved that item |
| `active` (after Finalise plan) | Yes — plan is live |

After **Finalise plan**, the Plan tab shows the finalised banner and approved supplements are purchasable.

---

## Next step (Day 5 — not done yet)

Day 5 adds the live lab provider interface. **Stop here until the review queue works for you.**
