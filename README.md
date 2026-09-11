# LifeShield (Expo mobile app)

Patient-facing mobile app for lifestyle awareness, questionnaire, and test recommendations.  
**Admin panel** is separate — see `admin/README.md` (browser only, not an APK).

## Local development

1. Copy `.env.example` to `.env` and add your Supabase URL + anon key.
2. Install dependencies: `npm install`
3. Start: `npx expo start`

## Build an Android APK (standalone install)

See **[docs/BUILD-APK.md](./docs/BUILD-APK.md)** for step-by-step instructions (Expo account, EAS secrets, `eas build`, install on phone).

**Summary:** Any email can register/login on the mobile app. Run `eas build --platform android --profile preview` and download the APK from the Expo dashboard.

## Learn more

- [Expo documentation](https://docs.expo.dev/)
- Project rules: `.cursorrules`
