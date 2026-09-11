# Build a LifeShield Android APK (user app)

> **Canonical guide:** [docs/BUILD-APK.md](./docs/BUILD-APK.md) — this file is kept as a short link from the repo root.

This guide is for the **patient mobile app** (register → questionnaire → results).  
It is **not** for the admin panel in the `admin/` folder — that runs in a web browser only.

---

## What you get

- A `.apk` file you can install on Android phones (no Google Play required for testing).
- **Any email** can register and log in — there is no invite list on the mobile app.
- Admin-only tools (e.g. entering lab results) are limited to emails in `ADMIN_EMAILS` in code; everyone else uses the normal patient flow.

---

## Before you start

You need:

1. **A free Expo account** — sign up at [expo.dev](https://expo.dev).
2. **Supabase project** — same one you use for development.
3. **Node.js 22.13+** on your Windows PC (`node --version`).

Your Supabase keys (from **Settings → API**):

| Name | Where it goes |
|------|----------------|
| Project URL | `EXPO_PUBLIC_SUPABASE_URL` |
| anon **public** key | `EXPO_PUBLIC_SUPABASE_ANON_KEY` |

Never put the **service_role** key in the app or in EAS environment variables for the mobile build.

---

## One-time setup

Open **PowerShell** in the project folder (`C:\Users\91878\LifeMate`).

### 1. Install the EAS CLI

```powershell
npm install -g eas-cli
```

(Or use `npx eas-cli` before each command instead of installing globally.)

### 2. Log in to Expo

```powershell
eas login
```

### 3. Link this project to Expo (first time only)

```powershell
eas build:configure
```

This adds an Expo project id to `app.json`. Say **yes** if it asks to create a project on expo.dev.

### 4. Add Supabase keys for cloud builds

See **[docs/BUILD-APK.md](./docs/BUILD-APK.md)** step 4. Use **EAS environment variables** (`eas env:set` or the Expo website), not the old `eas secret:create` command.

To check names only (no key values):

```powershell
npx eas-cli env:list --environment preview --format short
```

---

## Build the APK

```powershell
cd C:\Users\91878\LifeMate
eas build --platform android --profile preview
```

You can also use `--profile apk` — both profiles build an **APK** (not a Play Store bundle).

- The build runs on Expo’s servers (about 10–20 minutes).
- When it finishes, the terminal shows a link to the **Expo dashboard**.
- Open the link → **Download** the `.apk` file.

---

## Install on an Android phone

1. Copy the `.apk` to the phone (email, USB, Google Drive, etc.).
2. On the phone, open the file. If Android blocks “unknown apps”, go to **Settings → Security** (or **Install unknown apps**) and allow your file manager or browser to install apps.
3. Open **LifeShield**, tap **Create account**, and sign up with **any email** and password (8+ characters).

---

## Login & email confirmation (Supabase)

| Situation | What to do |
|-----------|----------------|
| **Testing — want instant login after sign-up** | Supabase → **Authentication** → **Providers** → **Email** → turn **off** “Confirm email”. |
| **Confirm email is on** | After register, the app says to check your inbox. User must tap the link before login works. |
| **“Email not confirmed” on login** | Same as above — confirm the email or turn off confirmation for testing. |
| **Sign-up disabled** | Supabase → **Authentication** → **Providers** → **Email** → enable email provider and allow new users. |

The mobile app does **not** check `ADMIN_EMAILS` at login. That list only unlocks admin features inside the app (and the separate `/admin` website).

---

## Profiles in `eas.json`

| Profile | Output | Use |
|---------|--------|-----|
| `preview` | APK | Internal testing (recommended) |
| `apk` | APK | Same as preview |
| `development` | APK + dev client | For developers with `expo-dev-client` |
| `production` | AAB (App Bundle) | Google Play Store submission |

App id: `com.lifeshield.app`  
Display name: **LifeShield**

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Login shows network / fetch error on APK | Rebuild after setting `EXPO_PUBLIC_SUPABASE_*` as EAS environment variables (see step 4). |
| “Add your Supabase…” banner on APK | The anon key is missing, or you pasted a placeholder. Check expo.dev → Environment variables, then rebuild. |
| Build fails on Expo | Run `npx expo-doctor` locally; fix red errors. Patch version warnings are usually OK. |
| White screen | Keys must start with `https://` and a real anon key — not placeholders from `.env.example`. |

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

## iOS (iPhone) — Windows is OK with EAS cloud

You **do not need a Mac** to *build* the iPhone app. Expo’s cloud (EAS) compiles iOS on Apple machines. A Mac is only required if you want to run `npx expo run:ios` on a simulator on your desk.

You **do** need:

1. An **Apple Developer Program** membership ($99/year) to install on a real iPhone or submit to the App Store. Apple’s site: [developer.apple.com](https://developer.apple.com).
2. The same **EAS environment variables** as Android (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`).
3. During the first iOS build, Expo will ask you to log in with your **Apple ID** and choose your team. That step is interactive (browser / 2FA). It often cannot be completed inside Cursor’s terminal — run these commands in **your own PowerShell** window.

```powershell
cd C:\Users\91878\LifeMate
eas login
npx eas-cli env:list --environment preview --format short
eas build --platform ios --profile preview
```

Use **preview** for TestFlight / internal install. Use **development** only if you need a custom Expo Dev Client. **production** is for App Store.

Push notifications on iOS also need an **APNs key** from Apple Developer (Certificates, Identifiers & Profiles → Keys) uploaded in the Expo dashboard. There is no `GoogleService-Info.plist` in this project — we use Expo push, not Firebase.

Apple Pay (`merchant.com.lifeshield` in `app.json`) is extra Apple setup; card checkout can still work without it.

---

## Quick command recap

```powershell
npm install -g eas-cli
eas login
eas build:configure
npx eas-cli env:set --name EXPO_PUBLIC_SUPABASE_URL --value 'https://...' --environment preview --visibility plaintext --non-interactive
npx eas-cli env:set --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value 'eyJ...' --environment preview --visibility plaintext --non-interactive
eas build --platform android --profile preview
```

Download the APK from the Expo dashboard link when the build completes.
