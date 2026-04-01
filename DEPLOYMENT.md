# Deployment Guide — Ledgerist

This guide covers building and distributing the app for Android and iOS, both for free (local builds / sideloading) and through the paid store routes (Google Play / Apple App Store).

---

## Prerequisites (all methods)

```bash
npm install
```

Make sure you have an `app.json` or `app.config.js` at the project root with at minimum:

```json
{
  "expo": {
    "name": "Ledgerist",
    "slug": "ledgerist",
    "version": "1.0.0",
    "android": {
      "package": "com.yourname.financetracker"
    },
    "ios": {
      "bundleIdentifier": "com.yourname.financetracker"
    }
  }
}
```

---

## Android

### Free — Local APK (sideload, no Play Store)

Builds the APK on your machine. No account or fee required. The app can be installed directly on any Android device with "Install from unknown sources" enabled.

**Requirements:**
- [Android Studio](https://developer.android.com/studio) installed (provides the Android SDK and build tools)
- Java 17+ (`java -version`)

**Steps:**

```bash
# 1. Generate a local development build
npx expo run:android --variant release
```

The APK will be output to:
```
android/app/build/outputs/apk/release/app-release.apk
```

Transfer it to your device (USB, Google Drive, email) and install it.

> **Note:** Local release builds are unsigned by default. To install on most devices you need to sign it. Generate a keystore once:
> ```bash
> keytool -genkey -v -keystore my-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias my-key-alias
> ```
> Then add the keystore config to `android/app/build.gradle` under `signingConfigs`.

---

### Paid — Google Play Store ($25 one-time fee)

**Requirements:**
- [Google Play Developer account](https://play.google.com/console) ($25 one-time registration)
- An [Expo account](https://expo.dev) (free) for EAS Build (optional but recommended)

#### Option A — EAS Build (recommended, builds in the cloud)

```bash
# 1. Install EAS CLI
npm install -g eas-cli

# 2. Log in to Expo
eas login

# 3. Configure the project (run once)
eas build:configure

# 4. Build an AAB (Android App Bundle) for Play Store
eas build --platform android --profile production
```

EAS will build in the cloud and give you a download link for the `.aab` file. No Android Studio needed.

> EAS Build free tier: 30 builds/month. Paid plans available at expo.dev/pricing.

#### Option B — Local AAB build

```bash
cd android
./gradlew bundleRelease
```

Output: `android/app/build/outputs/bundle/release/app-release.aab`

**Upload to Play Store:**
1. Go to [Google Play Console](https://play.google.com/console)
2. Create a new app → fill in store listing, screenshots, privacy policy
3. Go to **Production → Releases → Create release**
4. Upload the `.aab` file
5. Submit for review (typically 1–3 days)

---

## iOS

### Free — Run on your own device (no App Store, requires Apple ID)

You can install directly on up to 3 personal devices using Xcode for free. No paid developer account needed.

**Requirements:**
- macOS with [Xcode](https://developer.apple.com/xcode/) installed
- A free Apple ID

**Steps:**

```bash
# 1. Generate the native iOS project
npx expo run:ios --device
```

Expo will open Xcode. In Xcode:
1. Select your connected iPhone under the target device
2. Go to **Signing & Capabilities** → sign in with your Apple ID → select "Personal Team"
3. Press **Run (▶)**

The app installs on your device. It expires after 7 days with a free account (you re-run to refresh it).

---

### Paid — Apple App Store ($99/year)

**Requirements:**
- [Apple Developer Program](https://developer.apple.com/programs/) membership ($99/year)
- macOS with Xcode, or use EAS Build (cloud, no Mac needed)

#### Option A — EAS Build (builds in the cloud, no Mac required)

```bash
# 1. Install EAS CLI (skip if already done)
npm install -g eas-cli

# 2. Log in
eas login

# 3. Configure (skip if already done)
eas build:configure

# 4. Build for App Store
eas build --platform ios --profile production
```

EAS outputs an `.ipa` file. Download it from the Expo dashboard.

#### Option B — Local build with Xcode

```bash
npx expo run:ios --configuration Release
```

Then in Xcode:
1. Select **Any iOS Device (arm64)** as the target
2. **Product → Archive**
3. In the Organizer window, click **Distribute App → App Store Connect**

**Upload to App Store:**
1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Create a new app → fill in metadata, screenshots, App Review info
3. Select the uploaded build under **TestFlight** or **App Store** tab
4. Submit for review (typically 1–3 days, can be longer)

---

## Summary

| Method | Platform | Cost | Requires |
|---|---|---|---|
| Local APK sideload | Android | Free | Android Studio |
| Google Play Store | Android | $25 one-time | Play Developer account |
| EAS Build (Android) | Android | Free tier / paid | Expo account |
| Xcode personal device | iOS | Free | macOS + Xcode |
| App Store | iOS | $99/year | Apple Developer account |
| EAS Build (iOS) | iOS | Free tier / paid | Expo account + Apple cert |

---

## EAS Build Profiles (app.json / eas.json)

If using EAS, create an `eas.json` at the project root:

```json
{
  "cli": {
    "version": ">= 12.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {}
  }
}
```

---

## Useful Commands

```bash
# Start dev server
npx expo start --clear

# Run on Android emulator / device
npx expo run:android

# Run on iOS simulator / device (macOS only)
npx expo run:ios

# EAS build for both platforms
eas build --platform all --profile production

# EAS submit to stores (after build)
eas submit --platform android
eas submit --platform ios
```
Android APK
`eas build --platform android --profile preview`