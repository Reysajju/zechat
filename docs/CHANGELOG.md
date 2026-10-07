# Changelog

All notable changes are documented here. Format: Keep a Changelog; versioning: SemVer
(store version in `app.json`).

## [1.0.0] — 2026-10-05

### Added
- **Core**: full-screen WebView hosting chat.z.ai with splash, no browser chrome, and
  full session persistence (cookies, localStorage, IndexedDB, cache).
- **Navigation policy**: researched allowlist (`*.z.ai`, `z-cdn.chatglm.cn`,
  `o.alicdn.com`, monitoring/analytics/Cloudflare/fonts) with system-browser for
  everything else; OAuth routing with three remote-switchable strategies (modal /
  external / same-window).
- **Mobile fixes**: forced mobile viewport with MutationObserver re-assertion, explicit
  mobile UA, `--app-height`/`--kb` visualViewport sizing, keyboard-safe composer,
  safe-area padding, horizontal-overflow elimination, 16px input floor (no iOS zoom),
  tap-delay removal, internal scrolling for code blocks/tables, momentum + overscroll
  containment, scroll-to-bottom pill, pull-to-refresh disabled, desktop-layout runtime
  detection with one-shot reload, dark/light following system with zero white flash.
- **Native features**: share-sheet intake (text/files) into a new chat, download manager
  with in-page cookie-authenticated blob streaming + native fallback + system save/open
  dialog, agent-task keep-awake + completion notification, send haptics, biometric app
  lock, offline gate with auto-recovery, error/render-crash recovery, Android back-button
  stack (settings → auth → drawer → history → exit), OTA updates + store-version gate,
  optional Sentry crash reporting (dormant without DSN).
- **Ops**: versioned injected CSS/JS (`2026.10.05-1`) with per-fix comments, remote
  config hot-patch channel (CSS/JS selectors/auth strategy/allowlist) with offline
  cache, native Settings sheet, draggable menu button, generated icon/splash set, EAS
  profiles, Play Store listing kit, privacy policy template, test plan, compliance
  decision flags.
