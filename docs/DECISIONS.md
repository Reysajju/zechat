# ⚠️ Compliance & store decision flags — REVIEW BEFORE PUBLISHING

Your instruction was: *"Ask me before any decision that affects legal or store
compliance."* These are exactly those decisions. Each has a default chosen in the code,
plus how to change it. Nothing below blocks local development — but resolve all five
before a Play Store submission.

---

## 1. App name / trademark positioning — DEFAULT: "Zed Chat" + visible unofficial disclaimer

You cannot publish "Z.ai" as the app name or use their logo: that trips Play's
**Impersonation & IP** policy and likely their trademark policy. The default here is a
distinct name ("Zed Chat"), a distinct icon (generated — no Z.ai assets), an
"Unofficial client of chat.z.ai" line in Settings → About **and** in the store listing.

- Safer option: email Z.ai for permission/affiliate status; upgrade the listing if granted.
- Change name: `app.json` → `name`, `src/constants.ts` → `APP_NAME`, listing docs.

## 2. Google sign-in inside an embedded window — DEFAULT: `modal` strategy

Google's policies restrict OAuth in embedded WebViews. The default `modal` strategy
presents Google's login inside an in-app window with a browser-grade mobile UA (this is
what most wrapper apps do in practice, but it is a gray zone for Google's ToS).

Options (remote-config switchable without a release):
- `modal` (default) — works reliably; keep the UA presentational-only; legal review advised.
- `external` — opens Custom Tabs/SFSafariAuthenticationSession; most conservative. The
  return trip is imperfect because Z.ai controls the OAuth redirect URL (we can't claim
  deep links on their domain — they publish no app links). Users tap "Done".
- `same` — let the site do whatever it does inside the main WebView.

Switch at runtime: Settings → Sign-in, or ship `authStrategy` in remote config.

## 3. Privacy policy + Data safety — DEFAULT: template with placeholders

`docs/PRIVACY_POLICY.md` is a ready template with `{placeholders}` (contact email,
legal entity, crash-reporting state). You must host it at a public URL, fill the Play
Data safety form per `docs/PLAY_STORE_LISTING.md`, and be truthful about Sentry if you
enable a DSN. Not doing this is a takedown risk.

## 4. Pinch-zoom disabled in chat — DEFAULT: `allowZoom: false`

Prevents accidental zoom (matches your spec) but reduces accessibility for low-vision
users. The viewport MutationObserver enforces it. If you want to honor system font/zoom
preferences instead, ship `"allowZoom": true` via remote config — no code change.

## 5. Analytics scope — DEFAULT: none

No analytics SDK is bundled. Sentry is dormant until you set a DSN. If you add any
telemetry later, update the privacy policy and Data safety form — the code comment in
`src/services/Analytics.ts` marks the boundary.

---

### Resolved-by-design items (no action needed)

- **"Minimal functionality / repackaged website" policy** — the app ships native
  features the site doesn't have: share-intake, native downloads with save dialog,
  completion notifications, biometric lock, offline/error UX, settings, haptics,
  keep-awake. This is the documented defense if the store review asks.
- **Strip-branding risk you flagged** — nothing in the injected CSS/JS hides Z.ai's
  branding; all fixes are layout-only. Keep it that way when patching `cssPatch`.
- **Allowlist integrity** — only chat.z.ai's real surface + its own CDNs/analytics
  load in-app (researched from the live site); everything else opens in the system
  browser.
