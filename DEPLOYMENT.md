# Ledgerist — Google Play Store Deployment Guide

## Pre-flight Checklist

Before running any build, confirm every item below is done.

---

## 1. Secrets & Security (do this first)

### 1a. Rotate the leaked OAuth credential
A Google OAuth client secret JSON (`client_secret_671746422382-...json`) was committed to git.

1. Go to [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)
2. Find the affected OAuth 2.0 Client ID and click **Delete** (or regenerate)
3. Create a new Web client ID for Firebase Auth if needed
4. Update `FIREBASE_*` values in your `.env` if anything changed
5. Remove the file from your repo and block it from being re-added:

```bash
# Remove from disk and git tracking
rm client_secret_*.json
echo "client_secret_*.json" >> .gitignore
echo "*.plist" >> .gitignore
git rm --cached client_secret_*.json
git commit -m "remove leaked oauth secret"
```

6. Scrub from git history (optional but recommended for private repos):

```bash
# Using BFG Repo Cleaner (faster than git filter-branch)
brew install bfg
bfg --delete-files "client_secret_*.json" --no-blob-protection
git reflog expire --expire=now --all && git gc --prune=now --aggressive
git push --force
```

### 1b. Verify .env is never bundled
`.env` is in `.gitignore`. EAS Build reads `.env` only at build time via `app.config.ts` → `process.env`.
The values are baked into the JS bundle as `Constants.expoConfig.extra.*` — this is the correct Expo pattern.
Never store secret keys (Stripe secret, Firebase admin SDK) in `.env` for the client app.

---

## 2. Privacy Policy & Terms of Service

Google Play **requires** a privacy policy URL for any app that:
- Handles user accounts (Firebase Auth)
- Processes payments (Stripe)
- Sends notifications
- Uses biometrics

### What to cover in your privacy policy
- What data is collected (email, financial transactions, device biometrics used locally only)
- Where data is stored (Firebase Firestore, SQLite on-device)
- Payment processing via Stripe (link to Stripe's privacy policy)
- Notifications (bill reminders, local only — no marketing)
- Data deletion / account deletion procedure
- Contact email

### Hosting options (free)
- GitHub Pages: create a `docs/` folder in a public repo and enable Pages
- Vercel: deploy a single static HTML file
- Google Sites: free, no code needed

Once hosted, add the URL to your Play Store listing under **Store Presence → Privacy Policy**.

---

## 3. Release Keystore

You need a signing key to publish on Play Store. **Generate it once and never lose it** — if you lose
this key, you cannot push updates to your existing app.

```bash
keytool -genkey -v \
  -keystore ledgerist-release.jks \
  -alias ledgerist \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

Store the `.jks` file and its passwords securely (password manager, **not git**).

### Wire it into EAS Build (recommended)

```bash
eas credentials
# Follow prompts: select Android → Upload a keystore → provide .jks path + passwords
```

EAS stores the keystore encrypted in the Expo cloud. Your local `.jks` file becomes your offline backup.

### Alternative: local signing in `android/app/build.gradle`

```gradle
android {
    signingConfigs {
        release {
            storeFile file(System.getenv("KEYSTORE_PATH") ?: "ledgerist-release.jks")
            storePassword System.getenv("KEYSTORE_PASSWORD")
            keyAlias System.getenv("KEY_ALIAS")
            keyPassword System.getenv("KEY_PASSWORD")
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
        }
    }
}
```

---

## 4. Environment Variables for Production Build

Create or update `.env` with production values:

```env
# Firebase (production project)
FIREBASE_API_KEY=your_prod_api_key
FIREBASE_AUTH_DOMAIN=your_proj.firebaseapp.com
FIREBASE_PROJECT_ID=your_proj
FIREBASE_STORAGE_BUCKET=your_proj.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your_sender_id
FIREBASE_APP_ID=1:xxx:android:xxx

# Stripe — use LIVE keys for production
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
```

> **Important:** Switch from Stripe **test** keys (`pk_test_`) to **live** keys (`pk_live_`) on both
> the client (`.env` above) and your Cloudflare Worker backend before publishing. Your worker at
> `https://snowy-truth-4248.addressnidaniel2.workers.dev` must also use `sk_live_` for real payments.

---

## 5. Versioning

`app.config.ts` has `version: '1.0.0'` and `eas.json` production profile has `"autoIncrement": true`
for `versionCode`. This means:

- **`version`** (user-visible, e.g. "1.0.1") — update manually in `app.config.ts` before each release
- **`versionCode`** (integer, e.g. 1, 2, 3) — auto-incremented by EAS on each production build

For your first submission, `versionCode` will start at 1.

---

## 6. Firestore Security Rules

Deploy these rules before going live. Without them, any authenticated user can read any other user's data.

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

Deploy via Firebase Console or CLI:

```bash
firebase deploy --only firestore:rules
```

---

## 7. Build the Production AAB

```bash
# Log in to EAS
eas login

# Trigger production build (outputs .aab for Play Store)
eas build --platform android --profile production
```

The build runs on Expo's cloud servers. When complete, download the `.aab` from the EAS dashboard
or from the link printed in the terminal.

---

## 8. Google Play Console Setup

### First-time setup
1. Go to [play.google.com/console](https://play.google.com/console)
2. Create a new app → **Android** → app name "Ledgerist"
3. Complete the store listing:
   - Short description (80 chars max)
   - Full description
   - Screenshots (phone: min 2, max 8 — 16:9 ratio recommended)
   - Feature graphic (1024×500 px)
   - App icon (512×512 px — use `assets/icon.png`)
   - Privacy policy URL (from step 2)

### App content questionnaire
Fill out all required sections:
- **Target audience**: 18+ (financial app)
- **Data safety**: declare Firebase Auth (email), Stripe payment data, biometrics (local only), notifications
- **Ads**: None
- **Content rating**: complete the IARC questionnaire (likely Everyone)

### Upload the AAB
1. **Release → Production → Create new release**
2. Upload the `.aab` from step 7
3. Add release notes (e.g. "Initial release")
4. Review → **Submit for review**

Standard Play Store review time: 1–3 business days for first submissions.

---

## 9. Automated Uploads with `eas submit` (optional)

To skip manual uploads in the future, create a service account:

1. Google Play Console → **Setup → API access** → Link to a Google Cloud project
2. Create a service account → grant **Release Manager** role
3. Download the JSON key → save as `google-play-service-account.json` in project root
4. Add to `.gitignore`: `echo "google-play-service-account.json" >> .gitignore`

Then for all future releases:

```bash
eas build --platform android --profile production
eas submit --platform android --profile production
```

The `eas.json` submit config is already wired up to use `google-play-service-account.json` and
submit to the **internal** track first (safe — internal testers only, not public).

---

## 10. Recurring Release Flow

For every version after launch:

```bash
# 1. Bump version string in app.config.ts  (e.g. "1.0.0" → "1.1.0")
# 2. Build — versionCode auto-increments
eas build --platform android --profile production
# 3. Submit
eas submit --platform android --profile production
# 4. In Play Console: promote from Internal → Production when satisfied
```

---

## 11. Post-Launch Recommendations

Not required for launch, but strongly recommended before real users arrive:

| Task | Priority | Reason |
|---|---|---|
| Add Sentry (`@sentry/react-native`) | High | See production crashes in real-time |
| Show app version in Settings screen | Medium | Users and support need to identify builds |
| Move `SERVER_URL` to `app.config.ts` extra | Medium | Avoid code changes when Cloudflare Worker URL changes |
| Remove `@react-native-google-signin/google-signin` from `package.json` | Low | Dead dependency, adds build weight |
| "Last synced X ago" indicator in Settings | Medium | Users need confidence their data is backed up |
| iOS App Store setup | Low | Bundle ID `com.ledgerist.app` is already configured |

---

## Blocker Status

| # | Item | Status |
|---|---|---|
| 1 | Rotate leaked OAuth client secret | **Action required** |
| 2 | Privacy policy hosted at a public URL | **Action required** |
| 3 | Release keystore generated and stored in EAS | **Action required** |
| 4 | Stripe live keys in `.env` and Cloudflare Worker | **Action required before real payments** |
| 5 | Firestore security rules deployed | **Action required** |
| 6 | `eas.json` production → `aab` + `autoIncrement` | Fixed in this commit |
| 7 | `targetSdkVersion 34` | Set automatically by Expo SDK 54 — verify after first build |
