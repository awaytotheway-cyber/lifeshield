# Build a LifeShield Android APK (user app)

Plain-English guide for building the **patient mobile app** — register, questionnaire, results.  
This is **not** the admin website in the `admin/` folder (that runs in a browser only).

---

## What you get

- A `.apk` file you can install on Android phones (no Google Play required for testing).
- **Any email** can register and log in. There is no invite list on the mobile app.
- Admin-only tools (e.g. entering lab results) are limited to emails in `ADMIN_EMAILS` in code. Everyone else uses the normal patient flow.

---

## Before you start

You need:

1. **A free Expo account** — sign up at [expo.dev](https://expo.dev).
2. **Your Supabase project** — the same one you use for local development.
3. **Node.js 22.13+** on your Windows PC. Check with: `node --version`.

From Supabase **Settings → API**, copy:

| Name | EAS env var / `.env` name |
|------|--------------------------|
| Project URL | `EXPO_PUBLIC_SUPABASE_URL` |
| anon **public** key | `EXPO_PUBLIC_SUPABASE_ANON_KEY` |

Never put the **service_role** key in the app or in EAS environment variables for the mobile build.

---

## One-time setup (Windows PowerShell)

Open PowerShell in the project folder: `C:\Users\91878\LifeMate`

### 1. Install the EAS CLI

Either install globally:

```powershell
npm install -g eas-cli
```

Or use `npx eas-cli` before each command (recommended — Expo’s doctor tool prefers this over installing eas-cli inside the project).

### 2. Log in to Expo

```powershell
eas login
```

### 3. Link this project to Expo (first time only)

```powershell
eas build:configure
```

Say **yes** if it asks to create a project on expo.dev. This may add a project id under `app.json` → `expo.extra.eas`.

### 4. Add Supabase keys for cloud builds

Your `.env` file is **not** uploaded to Expo’s build servers. Store the same values as **EAS environment variables** (this replaced the old `eas secret:create` command).

**Easiest (no terminal):** open [expo.dev](https://expo.dev) → your **LifeShield** project → **Project settings** → **Environment variables** → **Add variable**. Create:

| Name | Value | Environments | Visibility |
|------|--------|--------------|------------|
| `EXPO_PUBLIC_SUPABASE_URL` | your real `https://….supabase.co` URL (not the words YOUR-PROJECT) | development, preview, production | Plain text |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | the **anon public** key from Supabase (starts with `eyJ`) | same three | Plain text |

Do **not** paste the service_role key.

**Or PowerShell** (use **single quotes**, real values, and `--non-interactive` so it does not hang waiting for a yes/no):

```powershell
cd C:\Users\91878\LifeMate
npx eas-cli env:set --name EXPO_PUBLIC_SUPABASE_URL --value 'https://YOUR-REAL-PROJECT.supabase.co' --environment development --environment preview --environment production --visibility plaintext --non-interactive
npx eas-cli env:set --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value 'eyJ-your-real-anon-key' --environment development --environment preview --environment production --visibility plaintext --non-interactive
npx eas-cli env:list --environment preview --format short
```

You should see **both** names listed. Confirm names only — do not share the key.

Optional Stripe publishable key (store checkout only):

```powershell
npx eas-cli env:set --name EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY --value 'pk_test_...' --environment development --environment preview --environment production --visibility plaintext --non-interactive
```

---

## Build the APK

```powershell
cd C:\Users\91878\LifeMate
eas build --platform android --profile preview
```

You can also use `--profile apk` — both profiles build an **APK** (not a Play Store bundle).

- The build runs on **Expo’s cloud servers** (about 10–20 minutes). You do not need Android Studio on your PC.
- When it finishes, the terminal shows a link to the **Expo dashboard**.
- Open the link → **Download** the `.apk` file.

Shortcut from `package.json`:

```powershell
npm run build:apk
```

---

## Install on an Android phone

1. Copy the `.apk` to the phone (email, USB, Google Drive, etc.).
2. Open the file on the phone. If Android blocks “unknown apps”, go to **Settings → Security** (or **Install unknown apps**) and allow your file manager or browser to install apps.
3. Open **LifeShield**, tap **Create account**, and sign up with **any email** and password (8+ characters).

---

## Login and email confirmation (Supabase dashboard)

| Situation | What to do |
|-----------|------------|
| **Testing — want instant login after sign-up** | Supabase → **Authentication** → **Providers** → **Email** → turn **off** “Confirm email”. Keep **Allow new users** on. |
| **Confirm email is on** | After register, the app asks you to check your inbox. Tap the confirmation link before logging in. |
| **“Email not confirmed” on login** | Confirm the email, or turn off confirmation for testing (same path as above). |
| **Sign-up disabled** | Supabase → **Authentication** → **Providers** → **Email** → enable the email provider and allow new users. |

The mobile app does **not** check `ADMIN_EMAILS` at login. That list only unlocks admin features inside the app (and the separate `/admin` website).

---

## Build profiles in `eas.json`

| Profile | Output | Use |
|---------|--------|-----|
| `preview` | APK | Internal testing (**recommended**) |
| `apk` | APK | Same as preview |
| `development` | APK + dev client | Developers with a custom dev build |
| `production` | AAB (App Bundle) | Google Play Store submission |

App package id: `com.lifeshield.app`  
Display name: **LifeShield**

### Expo Go vs standalone APK

- **Expo Go** — quick dev on your phone with `npx expo start`; some native modules may behave differently.
- **Standalone APK** — the real installable app with Stripe, notifications, and secure storage baked in. Use this for testers and real devices.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Login shows network / fetch error on APK | Rebuild after setting `EXPO_PUBLIC_SUPABASE_*` as EAS environment variables (step 4). |
| “Add your Supabase…” banner on APK | The **anon key** is missing or you pasted the YOUR-PROJECT placeholder. Check expo.dev → Environment variables, then rebuild. |
| Build fails on Expo | Run `npx expo-doctor` locally; fix red errors. Patch version warnings are usually OK. |
| White screen | Keys must be real URL + anon key — not placeholders from `.env.example`. |

---

## Admin panel (browser only)

Staff admin UI lives in `admin/` and runs with:

```powershell
cd admin
npm install
npm run dev
```

Do **not** build the admin folder as an APK. Use the mobile app for patients and the browser admin for operations.

---

## Quick command recap

```powershell
cd C:\Users\91878\LifeMate
npx eas-cli whoami
npx eas-cli env:list --environment preview --format short
npx eas-cli build --platform android --profile preview
```

Download the APK from the Expo dashboard when the build completes.
