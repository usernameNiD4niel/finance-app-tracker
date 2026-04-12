# Android Deployment Guide — Ledgerist

This document covers everything needed to build, test, and publish Ledgerist on Android via the Google Play Store.

---

## Prerequisites

| Requirement | Notes |
|---|---|
| Expo account | expo.dev — free |
| EAS CLI | `npm install -g eas-cli` |
| Google Play Developer account | $25 one-time fee at play.google.com/console |
| Android device or emulator | For testing the installed APK |

---

## Environment Variables on EAS

Your `.env` file is local-only and is **not** sent to EAS build servers. You must add your environment variables to EAS manually.

Go to **expo.dev → Your Project → Environment Variables → Production** and add each of the following:

```
FIREBASE_API_KEY
FIREBASE_AUTH_DOMAIN
FIREBASE_PROJECT_ID
FIREBASE_STORAGE_BUCKET
FIREBASE_MESSAGING_SENDER_ID
FIREBASE_APP_ID
```

> The values for each are in your local `.env` file.

---

## Build Commands

### Development APK (for local testing, no Play Store needed)
```bash
eas build --platform android --profile development
```
Downloads as an `.apk` you can sideload directly onto any Android device.

### Preview APK (internal sharing, no Play Store needed)
```bash
eas build --platform android --profile preview
```
Same as development but without the dev client. Good for sharing with testers via a direct download link.

### Production AAB (for Play Store submission)
```bash
eas build --platform android --profile production
```
Produces an `.aab` (Android App Bundle) required by Google Play.

---

## Google Play Console Setup (one-time)

Do this when you're ready to publish. Steps are in order.

### 1. Create the app
- Go to **play.google.com/console**
- Click **Create app**
- App name: `Ledgerist`
- Default language: English
- App or game: App
- Free or paid: Free (payment is handled in-app)

### 2. Complete the store listing
- Short description (80 chars max)
- Full description
- Screenshots (at least 2, phone size)
- Feature graphic (1024×500)
- App icon (512×512, already in `assets/icon.png`)

### 3. Set up internal testing track
- Go to **Testing → Internal testing → Create new release**
- Upload your production `.aab` from the EAS build
- Add testers (your own Gmail account)
- Save and roll out

> This step is required before Google Play Billing can be tested.

### 4. Complete app content questionnaire
Play Console will prompt you to fill out:
- Privacy policy URL (required — host a simple one)
- Content rating questionnaire
- Target audience
- Data safety form

---

## Submit to Play Store via EAS (optional automation)

You need a **Google Play service account** to use `eas submit`. This lets EAS upload your AAB automatically.

### Create the service account
1. Go to **Google Cloud Console** → IAM → Service Accounts → Create
2. Name it `eas-submit`
3. Download the JSON key
4. In **Play Console → Setup → API access** → link the service account
5. Grant it **Release manager** permission

### Place the key file
Save the downloaded JSON as:
```
google-play-service-account.json
```
in the project root (this path is already configured in `eas.json`).

> Add `google-play-service-account.json` to `.gitignore` — never commit this file.

### Submit command
```bash
eas build --platform android --profile production
eas submit --platform android --profile production
```
This uploads the AAB directly to the internal testing track.

---

## Version Management

Since `appVersionSource` is set to `local` in `eas.json`, you control the version in `app.config.ts`.

Bump the version before each release:
```ts
version: '1.0.1',  // user-visible version
```

For the Android version code (must increment with every Play Store upload), add to `app.config.ts`:
```ts
android: {
  ...
  versionCode: 2,  // increment each build
}
```

---

## Deployment Checklist

Follow this order every time you release a new build:

- [ ] Increment `versionCode` in `app.config.ts`
- [ ] Bump `version` string if user-visible changes
- [ ] Commit changes to git
- [ ] Run `eas build --platform android --profile production`
- [ ] Download and install the AAB on a test device via internal testing
- [ ] Smoke test: login, add expense, check premium modal
- [ ] Run `eas submit --platform android --profile production` (or upload manually)
- [ ] Roll out in Play Console

---

## Future: Payment Integration (Before Public Release)

> **Important:** The current payment flow uses **Lemon Squeezy** via a WebView checkout. Google Play **prohibits** external payment processors for in-app digital subscriptions. The app must not be published to open/production track until payment is migrated.

### What needs to change before going public:
1. Replace Lemon Squeezy with **Google Play Billing** (`react-native-iap`)
2. Create a subscription product in Play Console (product ID: `ledgerist_premium_monthly`, price: $0.90/month)
3. Add server-side purchase verification via Google Play Developer API (Cloudflare Worker)

The app is fully testable on the **internal testing track** in its current state — payment just won't be approved for a public release.

---

## Useful Commands Reference

```bash
# Build for Play Store
eas build --platform android --profile production

# Build shareable APK (no Play Store)
eas build --platform android --profile preview

# Submit to Play Store (requires google-play-service-account.json)
eas submit --platform android --profile production

# Check build status
eas build:list

# View build logs
eas build:view
```
