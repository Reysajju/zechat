# Build & release guide

Two supported paths: **EAS Build** (cloud, recommended for your first release) and
**local builds** (Gradle / Xcode). Both produce store-ready artifacts.

## 0. Prerequisites

- Node 20+ and npm
- Expo account (free): `npm i -g eas-cli && eas login`
- For iOS local builds: macOS + Xcode 16+ + Apple Developer Program membership
- For Android local builds: JDK 21 + Android Studio (SDK 35)

## 1. Configure the deployment identity (one-time)

1. **EAS project id** — run `eas init` inside the project. It fills `extra.eas.projectId`
   and `updates.url` in `app.json`.
2. **Remote config host** — upload `remoteConfig.default.json` to any static host/CDN you
   control and put the URL in `.env` (`EXPO_PUBLIC_RC_URL`) **and** as an EAS secret:
   ```bash
   eas env:create --name EXPO_PUBLIC_RC_URL --value https://your-host/rc.json --environment production
   ```
3. **Sentry (optional)** — create a Sentry project, then:
   ```bash
   eas env:create --name EXPO_PUBLIC_SENTRY_DSN --value https://xxx@sentry.io/yyy --environment production
   # Sentry source-map uploads during builds additionally use SENTRY_ORG / SENTRY_PROJECT / SENTRY_AUTH_TOKEN
   ```
   Without a DSN the app ships with telemetry fully disabled.

## 2. EAS Build path

```bash
# Development client (internal distribution, hot reload)
eas build --profile development --platform android

# QA build: installable APK for testers
eas build --profile preview --platform android

# Production: Play Store .aab + iOS .ipa
eas build --profile production --platform android
eas build --profile production --platform ios

# Submit to stores
eas submit --platform android            # uses eas.json submit.production
```

Android signing is handled automatically by EAS (keystore generated and stored). iOS
signing uses your Apple credentials via `eas credentials`.

## 3. Local build path (Gradle / Xcode)

```bash
# Generate the native projects from app.json (safe to re-run)
npx expo prebuild --platform android --clean
npx expo prebuild --platform ios --clean

# Android release bundle
cd android && ./gradlew bundleRelease
# Output: android/app/build/outputs/bundle/release/app-release.aab

# iOS (macOS): open ios/*.xcworkspace, select the ZedChat target, Product → Archive.
# Or CLI:
npx xcodebuild -workspace ios/ZedChat.xcworkspace -scheme ZedChat -configuration Release -archivePath build/ZedChat.xcarchive archive
```

**Android signing keys (local):** create `android/keystore.properties` with
`storeFile`/`storePassword`/`keyAlias`/`keyPassword`, or reuse the EAS-managed keystore by
running `eas credentials` once and downloading it. **Never commit keystores.**

## 4. OTA updates (JS-only hot fixes)

```bash
eas update --branch production -m "Patch selectors for site redesign"
```

`runtimeVersion.policy = "appVersion"` means OTA only reaches matching native versions —
native fixes still require a store release. Use the remote config `cssPatch` /
`selectors` for CSS/DOM-level fixes with **no** release at all.

## 5. Release checklist

- [ ] `app.json` version + `versionCode`/`buildNumber` bumped (or rely on `autoIncrement`)
- [ ] `eas build --profile production` artifacts install & launch on real devices
- [ ] `docs/TEST_PLAN.md` acceptance checklist green on Android 12–15 + iOS 16–18
- [ ] Store listing text finalised (`docs/PLAY_STORE_LISTING.md`), privacy policy hosted
- [ ] `docs/DECISIONS.md` flags resolved (name/trademark, auth strategy, data safety)
- [ ] Tag the repo: `git tag v1.0.0 && git push --tags`

## 6. iOS Share Extension (optional, Phase-4b)

Android share-to-app works out of the box (`expo-share-intent`). On iOS, system-share
intake requires a native Share Extension target:

1. `npx expo prebuild --platform ios`, open the workspace.
2. Add a **Share Extension** target named `ZedChatShareExtension`.
3. Follow the `expo-share-intent` docs (iOS setup section) to wire the extension to the
   app group + `getShareExtensionKey()`.
4. Everything else in the app is unaffected; the extension only feeds `useShareIntake`.

Ship without it if you don't need iOS share-intake — it's a feature add, not a store blocker.
