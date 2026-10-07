# Zed Chat — native mobile client for chat.z.ai

**Zed Chat** is a production-quality React Native (Expo SDK 57 / TypeScript) app that hosts
<https://chat.z.ai> in a hardened native shell. It is deliberately **not a plain WebView
wrapper**: every mobile failure mode of the web app is fixed natively, and the shell adds the
platform features Google Play expects from a real app.

> **Unofficial client.** Zed Chat is an independent app that hosts the public chat.z.ai web
> app. It is not affiliated with or endorsed by Z.ai. See `docs/DECISIONS.md` before
> publishing.

---

## Feature map (spec → implementation)

| Spec requirement | Where |
|---|---|
| Full-screen WebView, splash, no browser chrome | `src/screens/WebViewScreen.tsx`, `src/components/AppSplash.tsx` |
| Persisted login (cookies, localStorage, IndexedDB) | `sharedCookiesEnabled`, `domStorageEnabled`, `thirdPartyCookiesEnabled`, `cacheEnabled`, `incognito={false}` |
| Mobile UA + never "request desktop site" | `src/native/userAgent.ts` |
| Forced mobile viewport + MutationObserver re-assert | `src/native/injectedJS.ts` (`BOOTSTRAP_JS`) |
| 100vh fix (`--app-height` / `--kb` from visualViewport) | `src/native/injectedJS.ts` (G1), `injectedCSS.ts` (F3) |
| Keyboard handling, no input hidden / no jump | Android `adjustResize` (app.json) + iOS Keyboard listeners (G1) |
| Safe areas (notch / home indicator) | `viewport-fit=cover` + `env(safe-area-inset-*)` (F4) |
| No horizontal overflow; code/tables scroll internally | F2, F7 |
| Tap delay removed, ≥44px targets, zoom control | F5, F6, viewport `maximum-scale=1` (remote-togglable) |
| Sidebar/drawer back-button support | G8 `__zedCloseDrawer` + back handler in `WebViewScreen` |
| Scroll-to-bottom pill | G7 + F12 |
| Pull-to-refresh disabled | `pullToRefreshEnabled={false}` + `overscroll-behavior: contain` |
| Desktop-layout runtime detection + one-shot reload | G4 + bridge `layout` message |
| Dark/light follows system, no white flash | `src/theme/ThemeProvider.tsx`, F1 |
| Allowlist `*.z.ai` + required CDNs; rest → system browser | `src/utils/allowList.ts` (seeded from live-site research) |
| OAuth (Google/GitHub/Apple) via modal / external / same | `src/services/AuthHandler.ts`, `src/components/AuthWindow.tsx` |
| File/image upload + camera capture | Native file chooser + `mediaCapturePermissionGrantType="grantIfSameHostElsePrompt"` |
| Share-to-app (text / images / files) | `src/services/ShareIntake.ts` + `expo-share-intent` |
| Downloads with native save/open dialog | `src/services/DownloadManager.ts` (in-page blob streaming + native fallback + `expo-sharing`) |
| Haptics on send | G6 + `expo-haptics` |
| Biometric app lock | `src/services/BiometricLock.ts` |
| Offline screen w/ retry + auto-recover | `src/components/OfflineScreen.tsx` + NetInfo |
| Error screen, render-crash recovery | `ErrorScreen`, `onRenderProcessGone`, `onContentProcessDidTerminate`, `CrashBoundary` |
| Agent task: keep-awake + completion notification | `taskRunning` heuristics (G5) + `expo-keep-awake` + `NotificationService` |
| Hardware back: modal → drawer → history → exit | back handler in `WebViewScreen.tsx` |
| In-app updates (OTA + store gate) | `src/services/UpdateService.ts`, `expo-updates` |
| Crash reporting (opt-in) | `src/services/Analytics.ts` (@sentry/react-native, no-OP until DSN set) |
| Versioned injected CSS/JS + remote hot-patch | `src/native/injectedCSS.ts`, `injectedJS.ts`, `src/services/RemoteConfig.tsx`, `remoteConfig.default.json` |
| Native settings sheet | `src/components/SettingsSheet.tsx`, `FloatingMenuButton.tsx` |

## Project structure

```
zedchat/
├── App.tsx                     # root shell: boot → lock/offline/webview state machine
├── index.ts                    # entry; Sentry init before first render
├── app.json                    # Expo config: permissions, deep links, keyboard mode, plugins
├── eas.json                    # EAS build profiles (dev / preview APK / production AAB)
├── .env.example                # EXPO_PUBLIC_* deploy variables
├── remoteConfig.default.json   # servable hot-patch config example
├── assets/                     # generated icons + splash
├── docs/
│   ├── BUILD.md                # EAS + local Gradle/Xcode, signing, release flow
│   ├── PLAY_STORE_LISTING.md   # listing text, data-safety answers, screenshots
│   ├── PRIVACY_POLICY.md       # ready-to-host privacy policy
│   ├── TEST_PLAN.md            # device matrix + acceptance checklists per phase
│   ├── DECISIONS.md            # ⚠️ legal/store compliance flags you must review
│   ├── CHANGELOG.md
│   └── remote-config.schema.json
└── src/
    ├── constants.ts  types.ts
    ├── native/
    │   ├── injectedCSS.ts      # versioned stylesheet, one commented fix per rule
    │   ├── injectedJS.ts       # bootstrap + runtime bridge (viewport, vh, tasks, blobs…)
    │   └── userAgent.ts        # explicit mobile UA
    ├── screens/WebViewScreen.tsx   # core orchestrator
    ├── services/               # AuthHandler, DownloadManager, RemoteConfig, ShareIntake,
    │                           # NotificationService, BiometricLock, UpdateService,
    │                           # Analytics, UiProvider
    ├── components/             # AppSplash, Offline/Error/Lock screens, AuthWindow,
    │                           # SettingsSheet, FloatingMenuButton, Toasts, CrashBoundary
    ├── theme/ThemeProvider.tsx
    └── utils/                  # allowList, domain, bridge, storage, base64, version
```

## Quick start

```bash
npm install
npm run android          # Expo dev client / emulator
npm run ios              # macOS + Xcode required
```

Production builds and store submission: see **docs/BUILD.md**.
Testing checklist: **docs/TEST_PLAN.md**.
Compliance flags before you publish: **docs/DECISIONS.md**.

## Verification status

- `npx tsc --noEmit` — **0 errors** (strict mode)
- `npx expo export --platform android` — bundles 1155 modules, Hermes OK
- Injected bootstrap/runtime JS — compiled + marker-checked (`scripts/injcheck`)
- `npx expo config` — all config plugins resolve
