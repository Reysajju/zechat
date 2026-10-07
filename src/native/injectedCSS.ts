/**
 * ============================================================================
 * Zed Chat — injected stylesheet (Phase 3: mobile layout fixes)
 * ============================================================================
 * Every fix carries an ID (`F#`). If a chat.z.ai update breaks a selector,
 * patch the rule here — or ship a hot-patch instantly via remote config
 * `cssPatch` (appended verbatim after this stylesheet) without a store release.
 *
 * Keep this file conservative: it must never remove the site's own branding,
 * dialogs or functionality. Layout-only fixes.
 * ============================================================================
 */

export const INJECTED_CSS_VERSION = '2026.10.05-1';

export const INJECTED_CSS = `
/* ==== Zed Chat injected CSS v${INJECTED_CSS_VERSION} ===================== */

/* F1 — theme handshake: make form controls & scrollbars follow the site theme
   and stop iOS from auto-inflating text. */
:root { color-scheme: light dark; }
html { -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }

/* F2 — never allow sideways page scroll on phones (the #1 mobile breakage).
   Scrolling containers (code blocks, tables) handle their own overflow. */
html, body { max-width: 100% !important; overflow-x: hidden !important; }

/* F3 — 100vh bug. The runtime sets --app-height from visualViewport on every
   resize/keyboard event; 100dvh is the standards-based fallback. */
:root { --app-height: 100dvh; --kb: 0px; }
body { min-height: var(--app-height); height: auto; }

/* F4 — notch, status bar and home indicator. viewport-fit=cover is forced by
   the injected viewport meta, so the page must pad itself. */
body { padding-left: env(safe-area-inset-left); padding-right: env(safe-area-inset-right); }

/* F5 — iOS Safari zooms into any input with font-size < 16px on focus.
   Forcing 16px kills that "input zoom jump". */
textarea, input, select,
[contenteditable="true"], [contenteditable=""] {
  font-size: 16px !important;
  line-height: 1.4 !important;
}

/* F6 — remove the legacy 300ms tap delay & double-tap-zoom jitter on UI
   controls; keeps taps feeling native. */
a, button, [role="button"], input, select, textarea, label, summary {
  touch-action: manipulation;
}
* { -webkit-tap-highlight-color: transparent; }

/* F7 — code blocks and tables scroll inside their own containers instead of
   widening the page. Scoped to message/markdown containers so site chrome
   (headers, dropdowns) is untouched. */
pre, pre code {
  overflow-x: auto;
  max-width: 100%;
  overscroll-behavior-x: contain;
  white-space: pre;
  word-wrap: normal;
}
.markdown-body table, [class*="markdown"] table, [class*="message"] table,
[class*="prose"] table {
  display: block;
  width: max-content;
  max-width: 100%;
  overflow-x: auto;
  overscroll-behavior-x: contain;
}

/* F8 — images/media never blow out the layout width. */
img, video, canvas, iframe { max-width: 100%; }

/* F9 — momentum scrolling everywhere + keep rubber-band pull-to-refresh from
   chaining into a page reload inside the chat. */
* { -webkit-overflow-scrolling: touch; }
html, body { overscroll-behavior-y: contain; }

/* F10 — text selection: keep native copy/callout for message content, but do
   not let stray long-presses select whole UI chrome. */
nav, header, footer, aside, [class*="sidebar"], [class*="toolbar"] {
  -webkit-user-select: none;
  user-select: none;
}

/* F11 — desktop-width defensive net: if the site ever renders wider than the
   phone viewport (its own responsive CSS failed), clamp it. The runtime also
   detects this in JS and can reload with a forced-mobile pass. */
@media (max-width: 900px) {
  html, body { min-width: 0 !important; }
  body > * { max-width: 100vw; }
}

/* F12 — injected "scroll to bottom" pill (created by injectedJS.ts). */
#zed-stb {
  position: fixed;
  right: 14px;
  bottom: calc(84px + env(safe-area-inset-bottom) + var(--kb));
  z-index: 2147483000;
  width: 40px; height: 40px;
  border-radius: 20px;
  border: 1px solid rgba(128,128,128,.35);
  background: rgba(30,30,32,.85);
  color: #fff;
  font-size: 18px;
  display: none;
  align-items: center; justify-content: center;
  cursor: pointer;
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}
@media (prefers-color-scheme: light) {
  #zed-stb { background: rgba(250,250,252,.9); color: #111; }
}
#zed-stb[data-visible="1"] { display: flex; }

/* F13 — hide scrollbars on touch surfaces for an app-like look. */
::-webkit-scrollbar { width: 0px; height: 4px; }
::-webkit-scrollbar-thumb { background: rgba(128,128,128,.4); border-radius: 2px; }

/* ==== end Zed Chat CSS ================================================ */
`;
