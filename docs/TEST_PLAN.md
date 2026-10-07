# Test plan & acceptance checklists

Run the whole plan on every release. Device matrix first, then the per-phase checklists
matching the spec's five phases.

## Device matrix

| Dimension | Coverage |
|---|---|
| Android | 10, 12, 13, 14, 15 (small 360px, standard 412px, tablet 768–800px) |
| iOS | 16, 17, 18 (SE 375px, standard 390px, Plus/Max 430px, iPad) |
| Network | Wi-Fi, throttled "slow 3G" (emulator network speed), full offline |
| Locale | LTR default; sanity-check any RTL system locale for layout survival |
| Theme | System dark + system light, plus manual override in Settings |

## Phase 1 — scaffold & WebView load

- [ ] Cold start shows splash < 1.5s, then full-screen chat.z.ai; no URL bar anywhere
- [ ] No white flash on cold start in either system theme
- [ ] Page loads the real SPA (assets from z-cdn.chatglm.cn load — allowlist complete)
- [ ] Status bar style follows theme; safe areas respected (notch/home indicator)
- [ ] iOS swipe-back navigates chat history without leaving the app

## Phase 2 — auth & persistence

- [ ] Sign in (email + Google); main view shows logged-in state after the auth window closes
- [ ] Force-quit and relaunch → still signed in; reboot device → still signed in
- [ ] Non-allowlisted link (e.g. from chat output) opens in the system browser, not in-app
- [ ] Auth hosts stay in-app (modal window); Cancel and Done both behave sanely
- [ ] Settings → Clear browsing data forces a fresh load; site session still recoverable by signing in
- [ ] Switching auth strategy (Settings → Sign-in) takes effect without reinstall

## Phase 3 — mobile layout fixes

- [ ] 360 / 390 / 412 / 768 px widths: no horizontal page scroll anywhere
- [ ] No desktop layout: header/sidebar render as mobile drawer; if a desktop layout ever
      appears, the app auto-reloads once and fixes it (check logs for `desktop_layout_reload`)
- [ ] Site cannot defeat the viewport: even if it rewrites the meta tag, it snaps back
      (MutationObserver) — verify via remote config `cssPatch` simulation
- [ ] Keyboard: composer always visible above keyboard on both OSes; last message stays in
      view; no layout jump on open/close
- [ ] `--app-height`/`--kb` correct with keyboard open (bridge log `kb.open`)
- [ ] Inputs never trigger iOS input zoom (font-size floor 16px)
- [ ] Code blocks and wide tables scroll inside their own containers
- [ ] Scroll-to-bottom pill appears >1 screen up, scrolls smoothly, hides at the bottom
- [ ] Pull-to-refresh is disabled inside the chat; overscroll doesn't rubber-band the header
- [ ] Taps feel instant (no 300ms delay); double-tap doesn't zoom the chat
- [ ] Dark/light follows system instantly; WebView background matches (no flash)
- [ ] Tablet/landscape: layout usable, nothing clipped

## Phase 4 — native features

- [ ] Attach photo → native picker; Camera capture works (Android grants via same-host rule)
- [ ] Share text from another app → composer pre-filled; share image/PDF → paste-attach
      attempted, fallback toast if the site can't accept it
- [ ] Download a generated file → native Save/Open dialog → file opens correctly
- [ ] Large/cancelled downloads degrade gracefully (size cap alert, 45s fallback timer)
- [ ] Start an agent task → screen stays awake while running; background the app → completion
      notification arrives; screen-awake released after completion
- [ ] Haptic fires on send; no haptic on ordinary taps
- [ ] Enable App Lock → background+resume → biometric prompt; cancel keeps app locked
- [ ] Airplane mode → offline gate; reconnect → auto-recover with session intact
- [ ] Render-crash recovery: force WebView crash (dev tools) → auto reload
- [ ] Android back: closes Settings → closes auth window → web history → double-tap exits
- [ ] OTA: publish an OTA update → "Update ready" dialog → reload applies it
- [ ] Remote config: change a selector/CSS patch server-side → Settings → Refresh applies it
      without a store release
- [ ] Sentry: with DSN set, a forced JS error appears in Sentry; without DSN, nothing is sent

## Phase 5 — store readiness

- [ ] `eas build --profile production -p android` produces an installable .aab
- [ ] Local `./gradlew bundleRelease` succeeds with signing configured
- [ ] iOS archive succeeds; TestFlight install works
- [ ] Privacy policy hosted at the listing URL; placeholders replaced
- [ ] Data safety + content rating forms completed per PLAY_STORE_LISTING.md
- [ ] `docs/DECISIONS.md` — all five flags resolved and recorded
- [ ] Screenshots + feature graphic uploaded from `docs/store/`

## Debug shortcuts

- Bridge logs: set `"debug": true` in the remote config JSON → page logs flow to Metro console.
- Selector drift after a Z.ai redesign: patch `selectors.*` / `cssPatch` remotely, then
  fold verified fixes back into `src/native/` at the next release.
