# Deploy PRESCOPE on the web (Vercel)

This is the same PRESCOPE patient app, exported as a static website from Expo.

## Quick deploy on Vercel

1. Push this repo to GitHub (or import the `prescope-web` repo).
2. Go to [vercel.com/new](https://vercel.com/new) and import the repo.
3. Vercel should auto-detect settings from `vercel.json`:
   - **Build command:** `npm run build:web`
   - **Output directory:** `dist`
4. Add these **Environment Variables** (Project → Settings → Environment Variables):

| Name | Value |
|------|--------|
| `EXPO_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon public key |
| `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_…` (optional; only for checkout) |

5. Click **Deploy**. First build takes ~3–5 minutes.

## Local preview (before Vercel)

```powershell
cd C:\Users\91878\LifeMate
npm install
copy .env.example .env
# Edit .env with your Supabase keys
npm run web
```

Open the URL Expo prints (usually `http://localhost:8081`).

To test the production static build locally:

```powershell
npm run build:web
npx serve dist
```

## What works on web

- Sign up / login (Supabase)
- Symptom triage, consent, full questionnaire
- Results and journey screens
- Settings and profile

Some mobile-only features are disabled or simplified on web (push notifications, native Stripe sheet, camera for profile photo).

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Blank page after deploy | Check Vercel build logs. Ensure env vars are set for **Production**. |
| Login fails | Confirm `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` in Vercel match your Supabase project. |
| 404 on refresh | `vercel.json` rewrites should handle this; redeploy after pulling latest. |
