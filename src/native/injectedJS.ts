/**
 * ============================================================================
 * Zed Chat — injected JavaScript (Phases 2 & 3)
 * ============================================================================
 * Two scripts:
 *   BOOTSTRAP_JS — runs BEFORE content loads: asserts the mobile viewport meta
 *                  (with a MutationObserver that re-asserts it if the site
 *                  changes it), seeds the CSS vars, reports theme.
 *   RUNTIME_JS   — runs after load: bridge, --app-height/keyboard tracking,
 *                  desktop-layout detection, agent-task detection, send
 *                  haptics, scroll-to-bottom pill, share-intake helpers.
 *
 * Both are versioned and idempotent. Site-specific selectors come from remote
 * config (`selectors`) so a chat.z.ai redesign can be hot-patched without a
 * store release.
 * ============================================================================
 */
import type { RemoteConfig } from '../types';

export const BOOTSTRAP_JS_VERSION = '2026.10.05-1';
export const RUNTIME_JS_VERSION = '2026.10.05-1';

const VIEWPORT_CONTENT =
  'width=device-width, initial-scale=1, viewport-fit=cover';

/** F-viewport: force correct mobile viewport; never fall back to desktop width. */
function viewportScript(allowZoom: boolean): string {
  const content = allowZoom ? VIEWPORT_CONTENT : `${VIEWPORT_CONTENT}, maximum-scale=1, user-scalable=no`;
  return `
(function () {
  if (window.__ZED_BOOT__) return; window.__ZED_BOOT__ = true;
  var CONTENT = ${JSON.stringify(content)};
  function assertViewport() {
    try {
      var m = document.querySelector('meta[name="viewport"]');
      if (!m) {
        m = document.createElement('meta');
        m.setAttribute('name', 'viewport');
        (document.head || document.documentElement).appendChild(m);
      }
      if (m.getAttribute('content') !== CONTENT) m.setAttribute('content', CONTENT);
    } catch (e) {}
  }
  assertViewport();
  document.addEventListener('DOMContentLoaded', assertViewport);
  // If the site rewrites the meta at runtime, put ours straight back.
  document.addEventListener('DOMContentLoaded', function () {
    try {
      var mo = new MutationObserver(assertViewport);
      mo.observe(document.documentElement, { attributes: true, subtree: true, attributeFilter: ['content'] });
    } catch (e) {}
  });
  // Seed CSS vars used by injectedCSS F3/F12.
  function seed() {
    var h = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    document.documentElement.style.setProperty('--app-height', h + 'px');
  }
  seed();
  if (window.visualViewport) visualViewport.addEventListener('resize', seed);
})();
true;
`;
}

/**
 * Runtime bridge. Everything is defensive: the site must keep working even if
 * every heuristic below stops matching after a redesign.
 */
export function buildRuntimeJS(config: RemoteConfig, debug: boolean): string {
  const sel = config.selectors;
  const payload = {
    sel: {
      composer: sel.composer ?? '',
      newChat: sel.newChat ?? '',
      chatScroll: sel.chatScroll ?? '',
      drawerClose: sel.drawerClose ?? '',
      taskRunning: sel.taskRunning ?? [],
      sendButton: sel.sendButton ?? [],
    },
    debug,
    version: RUNTIME_JS_VERSION,
  };

  return `
(function () {
  if (window.__ZED_RUNTIME__) return;
  window.__ZED_RUNTIME__ = true;
  var CFG = ${JSON.stringify(payload)};
  var SEL = CFG.sel;

  function post(o) {
    try { o.t = 'bridge'; o.v = 1; window.ReactNativeWebView.postMessage(JSON.stringify(o)); } catch (e) {}
  }
  function dbg(m) { if (CFG.debug) post({ type: 'log', msg: m }); }
  function throttle(fn, ms) {
    var last = 0, timer = null;
    return function () {
      var now = Date.now();
      if (now - last >= ms) { last = now; fn(); }
      else if (!timer) { timer = setTimeout(function () { timer = null; last = Date.now(); fn(); }, ms - (now - last)); }
    };
  }

  /* ---- G1: dynamic viewport height (--app-height) + keyboard inset ---- */
  function setAppHeight() {
    var vv = window.visualViewport;
    var h = vv ? vv.height : window.innerHeight;
    var kb = vv ? Math.max(0, window.innerHeight - vv.height - vv.offsetTop) : 0;
    var root = document.documentElement.style;
    root.setProperty('--app-height', h + 'px');
    root.setProperty('--kb', Math.round(kb) + 'px');
    post({ type: 'kb', open: kb > 120 });
  }
  setAppHeight();
  if (window.visualViewport) {
    visualViewport.addEventListener('resize', setAppHeight);
    visualViewport.addEventListener('scroll', setAppHeight);
  }
  window.addEventListener('resize', setAppHeight);

  /* ---- G2: route tracking (pushState/replaceState/popstate) ---- */
  function reportRoute() { post({ type: 'route', url: location.href }); }
  ['pushState', 'replaceState'].forEach(function (k) {
    var orig = history[k];
    if (typeof orig === 'function') {
      history[k] = function () { var r = orig.apply(this, arguments); reportRoute(); return r; };
    }
  });
  window.addEventListener('popstate', reportRoute);
  reportRoute();

  /* ---- G3: theme report (native UI syncs, no white flash) ---- */
  function reportTheme() {
    var dark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    post({ type: 'theme', scheme: dark ? 'dark' : 'light' });
  }
  reportTheme();
  if (window.matchMedia) {
    try { window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', reportTheme); } catch (e) {}
  }

  /* ---- G4: desktop-layout detector. If the page renders wider than the
     phone viewport (layout > 900px style failure), ask native for ONE
     reload with the mobile pass re-applied. ---- */
  var desktopReports = 0;
  var checkDesktop = throttle(function () {
    try {
      var iw = window.innerWidth, sw = document.documentElement.scrollWidth;
      var suspected = iw < 900 && sw > iw * 1.08 && sw > 900;
      if (suspected && desktopReports < 2) {
        desktopReports++;
        post({ type: 'layout', desktopSuspected: true, innerWidth: iw, scrollWidth: sw });
      }
    } catch (e) {}
  }, 600);
  window.addEventListener('resize', checkDesktop);
  window.addEventListener('load', checkDesktop);

  /* ---- G5: agent-task detection (heuristic, remote-patchable).
     A "stop generating" style control visible => task running. ---- */
  var taskRunningSel = (SEL.taskRunning || []).filter(Boolean).join(',');
  var lastTask = null;
  function computeTask() {
    if (!taskRunningSel) return null;
    try {
      var el = document.querySelector(taskRunningSel);
      return el && el.offsetParent !== null ? 'running' : 'idle';
    } catch (e) { return null; }
  }
  if (taskRunningSel && window.MutationObserver) {
    var taskMo = new MutationObserver(throttle(function () {
      var s = computeTask();
      if (s && s !== lastTask) { lastTask = s; post({ type: 'task', state: s }); }
    }, 650));
    taskMo.observe(document.documentElement, { childList: true, subtree: true, attributes: true });
  }

  /* ---- G6: haptic on send. Click-capture on send-button selectors + a
     conservative form-submit fallback. ---- */
  var sendSel = (SEL.sendButton || []).filter(Boolean).join(',');
  function maybeHaptic(t) {
    try { if (t && sendSel && t.closest && t.closest(sendSel)) post({ type: 'send' }); } catch (e) {}
  }
  document.addEventListener('click', function (e) { maybeHaptic(e.target); }, true);
  document.addEventListener('submit', function () { post({ type: 'send' }); }, true);

  /* ---- G7: scroll-to-bottom pill. ---- */
  var stb = null, scrollEl = null;
  function findScrollEl() {
    if (SEL.chatScroll) { var c = document.querySelector(SEL.chatScroll); if (c) return c; }
    var best = null, max = 0;
    var all = document.querySelectorAll('div, main, section');
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      var cs = getComputedStyle(el);
      if ((cs.overflowY === 'auto' || cs.overflowY === 'scroll') && el.clientHeight > 200) {
        var h = el.scrollHeight - el.clientHeight;
        if (h > max) { max = h; best = el; }
      }
    }
    return best;
  }
  function ensureStb() {
    if (stb) return;
    stb = document.createElement('button');
    stb.id = 'zed-stb';
    stb.setAttribute('aria-label', 'Scroll to bottom');
    stb.innerHTML = '&#8595;';
    stb.addEventListener('click', function () {
      var el = scrollEl || document.scrollingElement;
      if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    });
    (document.body || document.documentElement).appendChild(stb);
  }
  var stbTick = throttle(function () {
    try {
      scrollEl = findScrollEl();
      var el = scrollEl || document.scrollingElement;
      if (!el) return;
      var far = el.scrollHeight - el.scrollTop - el.clientHeight > 240;
      ensureStb();
      if (stb.getAttribute('data-visible') !== (far ? '1' : '0')) {
        stb.setAttribute('data-visible', far ? '1' : '0');
        post({ type: 'stb', visible: far });
      }
    } catch (e) {}
  }, 350);
  window.addEventListener('scroll', stbTick, { passive: true });
  document.addEventListener('scroll', stbTick, { passive: true, capture: true });

  /* ---- G8: composer helpers used by native (share intake, deep links). ---- */
  function composerEl() {
    var el = null;
    if (SEL.composer) { try { el = document.querySelector(SEL.composer); } catch (e) {} }
    if (!el) el = document.querySelector('textarea');
    if (!el) el = document.querySelector('[contenteditable="true"]');
    return el;
  }
  function fillComposer(text) {
    var el = composerEl();
    if (!el) return false;
    el.focus();
    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
      var setter = Object.getOwnPropertyDescriptor(el.__proto__, 'value') &&
        Object.getOwnPropertyDescriptor(el.__proto__, 'value').set;
      if (setter) setter.call(el, text); else el.value = text;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      el.textContent = text;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }
    return true;
  }
  function openNewChat() {
    try {
      if (SEL.newChat) {
        var b = document.querySelector(SEL.newChat);
        if (b) { b.click(); return true; }
      }
      var alt = document.querySelector('[aria-label*="new chat" i], [data-testid*="new-chat" i], a[href="/new"], a[href="/"]');
      if (alt) { alt.click(); return true; }
    } catch (e) {}
    return false;
  }
  function closeDrawer() {
    try {
      if (SEL.drawerClose) {
        var b = document.querySelector(SEL.drawerClose);
        if (b) { b.click(); return true; }
      }
      var scrim = document.querySelector('[class*="overlay"][class*="open"], [class*="scrim"]');
      if (scrim) { scrim.click(); return true; }
    } catch (e) {}
    return false;
  }
  function injectFile(name, mime, b64) {
    try {
      var bin = atob(b64);
      var u8 = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      var file = new File([u8], name, { type: mime || 'application/octet-stream' });
      var dt = new DataTransfer();
      dt.items.add(file);
      var el = composerEl();
      if (!el) return { ok: false, method: 'no-composer' };
      el.focus();
      try {
        var ce = new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: dt });
        el.dispatchEvent(ce);
        return { ok: true, method: 'paste' };
      } catch (e) {}
      try {
        var de = new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt });
        el.dispatchEvent(de);
        return { ok: true, method: 'drop' };
      } catch (e2) {}
      return { ok: false, method: 'no-transfer' };
    } catch (e) {
      return { ok: false, method: 'error:' + e };
    }
  }

  /* ---- G9: blob streaming used by the native download manager. ---- */
  window.__zedSendBlob = async function (url, id, maxBytes) {
    try {
      var resp = await fetch(url, { credentials: 'include' });
      if (!resp.ok) { post({ type: 'blobError', id: id, msg: 'http_' + resp.status }); return; }
      var blob = await resp.blob();
      if (blob.size > maxBytes) { post({ type: 'blobError', id: id, msg: 'too_large', size: blob.size }); return; }
      var name = 'download';
      try {
        var cd = resp.headers.get('content-disposition') || '';
        var m = cd.match(/filename\\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i);
        if (m) name = decodeURIComponent(m[1] || m[2]);
      } catch (e) {}
      if (!name || name === 'download') {
        try { name = new URL(url, location.href).pathname.split('/').pop() || name; } catch (e) {}
      }
      post({ type: 'blobStart', id: id, name: name, mime: blob.type || 'application/octet-stream', size: blob.size });
      var buf = new Uint8Array(await blob.arrayBuffer());
      var CH = 768 * 1024;
      var idx = 0;
      for (var off = 0; off < buf.length; off += CH) {
        var slice = buf.subarray(off, Math.min(off + CH, buf.length));
        var bin = '';
        var step = 0x8000;
        for (var i = 0; i < slice.length; i += step) {
          bin += String.fromCharCode.apply(null, slice.subarray(i, Math.min(i + step, slice.length)));
        }
        post({ type: 'blobChunk', id: id, i: idx++, data: btoa(bin) });
      }
      post({ type: 'blobEnd', id: id });
    } catch (e) {
      post({ type: 'blobError', id: id, msg: String(e) });
    }
  };

  /* ---- Public native entry points ---- */
  window.__zedPaste = function (text) {
    var ok = fillComposer(String(text));
    post({ type: 'pasteResult', ok: ok, method: 'text' });
    return ok;
  };
  window.__zedInjectFile = function (name, mime, b64) {
    var r = injectFile(name, mime, b64);
    post({ type: 'pasteResult', ok: r.ok, method: r.method });
  };
  window.__zedNewChat = openNewChat;
  window.__zedCloseDrawer = closeDrawer;
  window.__zedComposer = function () { return !!composerEl(); };

  post({ type: 'ready', href: location.href });
  dbg('runtime booted v' + CFG.version);
})();
true;
`;
}

/** Convenience: the full beforeContentLoaded script. */
export function buildBootstrapJS(allowZoom: boolean): string {
  return viewportScript(allowZoom);
}
