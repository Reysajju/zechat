/**
 * WebViewScreen — the app's core (spec §1–§4).
 *
 * Responsibilities:
 *  - hosts chat.z.ai with full persistence (cookies, DOM storage, cache)
 *  - applies the versioned injected CSS/JS and the mobile UA
 *  - enforces the navigation allowlist (system browser for everything else)
 *  - routes OAuth through the AuthHandler strategy
 *  - consumes the JS bridge (theme, routes, tasks, keyboard, blobs, haptics)
 *  - handles keyboard, safe areas, offline/error states, back button,
 *    downloads, share intake, keep-awake and completion notifications
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  BackHandler,
  Keyboard,
  Linking,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as KeepAwake from 'expo-keep-awake';
import NetInfo from '@react-native-community/netinfo';

import { START_URL, EXIT_BACK_WINDOW_MS } from '../constants';
import { useTheme } from '../theme/ThemeProvider';
import { useRemoteConfig } from '../services/RemoteConfig';
import { useUi } from '../services/UiProvider';
import { mobileUserAgent } from '../native/userAgent';
import { INJECTED_CSS } from '../native/injectedCSS';
import { buildBootstrapJS, buildRuntimeJS } from '../native/injectedJS';
import { isAllowedWebHost, isAuthHost } from '../utils/allowList';
import { hostOf, isHttpUrl } from '../utils/domain';
import { parseBridgeMessage, wrapJs } from '../utils/bridge';
import type {
  WebViewNavRequest,
  WebViewOpenWindowEvt,
  WebViewProgressEvt,
  WebViewLoadEndEvt,
  WebViewMessageEvt,
  WebViewErrorEvt,
  WebViewRenderProcessGoneEvt,
  WebViewFileDownloadEvt,
} from '../utils/webviewEvents';
import { openExternalAuth } from '../services/AuthHandler';
import {
  feedBlobMessage,
  handleFileDownload,
  setDownloadLimitMb,
} from '../services/DownloadManager';
import { notifyLocal } from '../services/NotificationService';
import { useShareIntake, useConsumePayload } from '../services/ShareIntake';
import { FloatingMenuButton } from '../components/FloatingMenuButton';
import { OfflineScreen } from '../components/OfflineScreen';
import { ErrorScreen } from '../components/ErrorScreen';
import { track } from '../services/Analytics';

type Status = 'loading' | 'ready' | 'error';

export default function WebViewScreen({
  onAuthReloadSignal,
}: {
  /** Bump a counter in the parent to force a reload after sign-in flows. */
  onAuthReloadSignal: () => void;
}) {
  const { colors } = useTheme();
  const { config } = useRemoteConfig();
  const ui = useUi();
  const insets = useSafeAreaInsets();

  const webRef = useRef<WebView>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [progress, setProgress] = useState(0);
  const [offline, setOffline] = useState(false);
  const [offlineDetectedAt, setOfflineDetectedAt] = useState(0);
  const [errorDetail, setErrorDetail] = useState<string | undefined>(undefined);
  const [canGoBack, setCanGoBack] = useState(false);
  const [navKey, setNavKey] = useState(0);
  const [reloadToken, setReloadToken] = useState(0);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [taskRunning, setTaskRunning] = useState(false);
  const [sessionLoaded, setSessionLoaded] = useState(false);

  const lastBackRef = useRef(0);
  const desktopReloadsRef = useRef(0);
  const taskRunningRef = useRef(false);
  const wasBackgroundedRef = useRef(false);

  // ---- remote config side effects ----
  useEffect(() => {
    setDownloadLimitMb(config.downloadMaxMb);
  }, [config.downloadMaxMb]);

  // ---- connectivity (offline gate + auto-retry) ----
  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      const up = !!state.isConnected && state.isInternetReachable !== false;
      setOffline(!up);
      if (up && offlineDetectedAt) {
        setOfflineDetectedAt(0);
        hardReload();
      }
      if (!up) setOfflineDetectedAt(Date.now());
    });
    return () => unsub();
  }, [offlineDetectedAt]);

  // ---- keyboard (iOS padding; Android uses adjustResize natively) ----
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () =>
      setKeyboardOpen(true),
    );
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => {
      setKeyboardOpen(false);
      // Keep the newest message visible after the composer returns to full height.
      runJs('var s=document.scrollingElement; if(s) s.scrollTo({top:s.scrollHeight,behavior:"smooth"});');
    });
    return () => {
      show.remove();
      hide.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- agent task: keep screen awake + completion notification ----
  useEffect(() => {
    taskRunningRef.current = taskRunning;
    if (taskRunning) {
      KeepAwake.activateKeepAwakeAsync().catch(() => {});
    } else {
      KeepAwake.deactivateKeepAwake().catch(() => {});
      if (wasBackgroundedRef.current) {
        void notifyLocal('Task finished', 'Your Z.ai task has completed.');
        wasBackgroundedRef.current = false;
      }
    }
  }, [taskRunning]);

  // ---- share intake (text / files from the OS share sheet) ----
  const intakePayload = useShareIntake();

  // ---- helpers ----
  const runJs = useCallback((code: string) => {
    webRef.current?.injectJavaScript(wrapJs(code));
  }, []);

  const hardReload = useCallback(() => {
    setStatus('loading');
    setErrorDetail(undefined);
    setReloadToken((n) => n + 1);
    setNavKey((n) => n + 1);
  }, []);

  const consumeIntake = useCallback(() => {
    if (!intakePayload) return;
    if (intakePayload.file) {
      const { name, mime, b64 } = intakePayload.file;
      runJs(`window.__zedInjectFile && window.__zedInjectFile(${JSON.stringify(name)}, ${JSON.stringify(mime)}, ${JSON.stringify(b64)});`);
      ui.toast('Attaching shared file…');
    } else if (intakePayload.text) {
      runJs(`window.__zedPaste && window.__zedPaste(${JSON.stringify(intakePayload.text)});`);
      ui.toast('Shared text pasted into the composer');
    }
  }, [intakePayload, runJs, ui]);

  useEffect(() => {
    if (!intakePayload) return;
    if (status === 'ready' && !offline) {
      consumeIntake();
    } else {
      // Site not ready yet — paste as soon as it is (or guide the user).
      ui.toast('Opening a chat to place your shared content…');
    }
  }, [intakePayload, status, offline, consumeIntake, ui]);

  // ---- navigation policy (allowlist + auth routing) ----
  const onShouldStartLoad = useCallback(
    (req: WebViewNavRequest): boolean => {
      const { url, isTopFrame } = req;

      if (!isHttpUrl(url)) {
        if (/^(mailto:|tel:|sms:)/i.test(url)) {
          void Linking.openURL(url).catch(() => {});
        }
        return false;
      }
      if (!isTopFrame) {
        // Iframes: allow the site's own third-party surface, nothing else.
        return isAllowedWebHost(url) || isAuthHost(url);
      }

      if (isAllowedWebHost(url)) return true;

      if (isAuthHost(url)) {
        const strategy = config.authStrategy;
        track('auth_route', { strategy, host: hostOf(url) });
        if (strategy === 'same') return true;
        if (strategy === 'external') {
          void openExternalAuth(url).then((done) => {
            if (done) onAuthReloadSignal();
          });
        } else {
          ui.openAuth(url);
        }
        return false;
      }

      // Everything else → system browser (Play-policy friendly external nav).
      void Linking.openURL(url).catch(() => {});
      return false;
    },
    [config.authStrategy, ui, onAuthReloadSignal],
  );

  const onOpenWindow = useCallback(
    (e: WebViewOpenWindowEvt) => {
      // New-window requests follow the same policy as top-frame navigations.
      const url = e.nativeEvent.targetUrl;
      if (isAllowedWebHost(url)) {
        runJs(`location.href = ${JSON.stringify(url)};`);
      } else if (isAuthHost(url)) {
        if (config.authStrategy === 'modal') ui.openAuth(url);
        else void Linking.openURL(url).catch(() => {});
      } else if (isHttpUrl(url)) {
        void Linking.openURL(url).catch(() => {});
      }
    },
    [config.authStrategy, ui, runJs],
  );

  // ---- bridge ----
  const onMessage = useCallback(
    (e: WebViewMessageEvt) => {
      const msg = parseBridgeMessage(e.nativeEvent.data);
      if (!msg) return;
      switch (msg.type) {
        case 'ready':
          if (status !== 'ready') setStatus('ready');
          setSessionLoaded(true);
          track('page_ready');
          break;
        case 'route':
          // Sidebar state and history drive Android back handling.
          break;
        case 'theme':
          // Page theme can differ from OS in manual mode; we follow OS/system only.
          break;
        case 'task':
          setTaskRunning(msg.state === 'running');
          break;
        case 'send':
          if (Platform.OS === 'ios') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          else void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case 'layout':
          if (msg.desktopSuspected && desktopReloadsRef.current < 1) {
            desktopReloadsRef.current = 1;
            track('desktop_layout_reload', { innerWidth: msg.innerWidth, scrollWidth: msg.scrollWidth });
            hardReload();
          }
          break;
        case 'stb':
          // The pill lives inside the page; native only logs for diagnostics.
          break;
        case 'pasteResult':
          if (!msg.ok) ui.toast('Open the attachment menu and paste to attach');
          break;
        case 'blobStart':
        case 'blobChunk':
        case 'blobEnd':
        case 'blobError':
          feedBlobMessage(msg as unknown as Record<string, unknown>, (js) => runJs(js));
          break;
        case 'log':
          if (__DEV__) console.log('[zed-page]', msg.msg);
          break;
      }
    },
    [status, hardReload, runJs, ui],
  );

  // ---- Android back button: modal → auth → drawer → history → exit ----
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (ui.settingsOpen) {
        ui.closeSettings();
        return true;
      }
      if (ui.authUrl) {
        ui.closeAuth();
        return true;
      }
      if (taskRunningRef.current === false && canGoBack) {
        webRef.current?.goBack();
        return true;
      }
      if (Date.now() - lastBackRef.current < EXIT_BACK_WINDOW_MS) {
        BackHandler.exitApp();
        return true;
      }
      lastBackRef.current = Date.now();
      ui.toast('Tap back again to exit');
      return true;
    });
    return () => sub.remove();
  }, [ui, canGoBack]);

  // ---- app state: remember backgrounding while a task runs ----
  useEffect(() => {
    const appState = require('react-native').AppState;
    const sub = appState.addEventListener('change', (s: string) => {
      if (s === 'background' && taskRunningRef.current) wasBackgroundedRef.current = true;
    });
    return () => sub?.remove();
  }, []);

  // ---- injected payloads (memoised: identity changes force re-injection) ----
  const injectedCss = useMemo(() => INJECTED_CSS + (config.cssPatch ? `\n/* remote patch */\n${config.cssPatch}` : ''), [config.cssPatch]);
  const bootstrapJs = useMemo(() => buildBootstrapJS(config.allowZoom), [config.allowZoom]);
  const runtimeJs = useMemo(() => buildRuntimeJS(config, false), [config]);

  const ua = mobileUserAgent(config.uaOverride);

  const showOfflineGate = offline && !sessionLoaded;
  const showErrorGate = status === 'error';

  return (
    <View style={[styles.root, { backgroundColor: colors.webBackground }]}>
      {!showOfflineGate && !showErrorGate ? (
        <Animated.View style={[styles.flex]}>
          <WebView
            key={navKey}
            ref={webRef}
            source={{ uri: START_URL }}
            style={[styles.web, { backgroundColor: colors.webBackground }]}
            containerStyle={styles.flex}
            // ---- persistence (spec §1) ----
            sharedCookiesEnabled
            domStorageEnabled
            thirdPartyCookiesEnabled
            cacheEnabled
            cacheMode={Platform.OS === 'android' ? 'LOAD_DEFAULT' : undefined}
            incognito={false}
            // ---- behaviour ----
            userAgent={ua}
            javaScriptEnabled
            allowFileAccess
            allowFileAccessFromFileURLs={false}
            allowUniversalAccessFromFileURLs={false}
            mediaPlaybackRequiresUserAction={false}
            allowsInlineMediaPlayback
            allowsBackForwardNavigationGestures={Platform.OS === 'ios'}
            pullToRefreshEnabled={false}
            setSupportMultipleWindows
            onOpenWindow={onOpenWindow}
            textZoom={100}
            overScrollMode="never"
            scrollEnabled
            keyboardDisplayRequiresUserAction={false}
            hideKeyboardAccessoryView
            mediaCapturePermissionGrantType={Platform.OS === 'android' ? 'grantIfSameHostElsePrompt' : undefined}
            // ---- injection ----
            injectedJavaScriptBeforeContentLoaded={bootstrapJs}
            injectedJavaScript={runtimeJs}
            injectedJavaScriptBeforeContentLoadedForMainFrameOnly={false}
            injectedJavaScriptForMainFrameOnly={false}
            onMessage={onMessage}
            // ---- navigation ----
            onShouldStartLoadWithRequest={onShouldStartLoad}
            onNavigationStateChange={(nav) => setCanGoBack(nav.canGoBack)}
            onLoadProgress={(e: WebViewProgressEvt) => setProgress(e.nativeEvent.progress)}
            onLoadEnd={(e: WebViewLoadEndEvt) => {
              if (status === 'loading' && !offline) setStatus('ready');
            }}
            onError={(e: WebViewErrorEvt) => {
              setErrorDetail(e.nativeEvent.description);
              setStatus('error');
            }}
            onRenderProcessGone={(e: WebViewRenderProcessGoneEvt) => {
              track('render_process_gone', { didCrash: e.nativeEvent.didCrash });
              hardReload();
            }}
            onContentProcessDidTerminate={() => {
              // iOS reclaimed the process — reload keeps the session alive.
              hardReload();
            }}
            onFileDownload={(e: WebViewFileDownloadEvt) => handleFileDownload(e.nativeEvent.downloadUrl, (js) => runJs(js))}
            onHttpError={() => {
              /* surfaced by onLoadEnd/onError; keep quiet otherwise */
            }}
            // ---- visuals ----
            startInLoadingState
            renderLoading={() => (
              <View style={[styles.loader, { backgroundColor: colors.webBackground }]}>
                <Animated.View style={styles.loaderInner} />
              </View>
            )}
          />
          <Progress active={status === 'loading' || progress < 1} value={progress} color={colors.accent} />
        </Animated.View>
      ) : null}

      {showOfflineGate ? <OfflineScreen retrying={!offline ? false : true} /> : null}
      {showErrorGate ? <ErrorScreen detail={errorDetail} onRetry={hardReload} /> : null}

      <FloatingMenuButton onPress={ui.openSettings} hidden={!config.showFloatingMenu || keyboardOpen} />
    </View>
  );
}

/** Thin top progress bar (app-like; the site's own spinner is untouched). */
function Progress({ active, value, color }: { active: boolean; value: number; color: string }) {
  const width = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(width, { toValue: active ? Math.max(value, 0.08) : 0, duration: 140, useNativeDriver: true }).start();
  }, [active, value, width]);
  if (!active && value >= 1) return null;
  return (
    <View pointerEvents="none" style={styles.progressTrack}>
      <Animated.View
        style={[styles.progressFill, { backgroundColor: color, transform: [{ scaleX: Math.min(Math.max(value, 0.05), 1) }] }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  web: { flex: 1 },
  loader: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  loaderInner: { width: 34, height: 34, borderRadius: 17, borderWidth: 3, borderColor: 'rgba(128,128,128,0.35)', borderTopColor: 'rgba(128,128,128,0.9)' },
  progressTrack: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    overflow: 'hidden',
  },
  progressFill: { height: 2, width: '100%', transformOrigin: 'left' },
});
