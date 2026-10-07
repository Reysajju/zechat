/**
 * AuthWindow — the `modal` auth strategy (Phase 2).
 *
 * A native modal hosting its own WebView for OAuth providers. It shares the
 * same persistent cookie store as the main WebView, so once the provider
 * redirects back to the site (any *.z.ai host), the session cookie exists and
 * we close + reload the main view. A manual "Done" button covers providers
 * that finish without a visible redirect.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';
import { useRemoteConfig } from '../services/RemoteConfig';
import { mobileUserAgent } from '../native/userAgent';
import { isAllowedWebHost, isAuthHost } from '../utils/allowList';
import { hostMatches, hostOf, isHttpUrl } from '../utils/domain';
import type { WebViewNavRequest, WebViewOpenWindowEvt } from '../utils/webviewEvents';
import { useUi } from '../services/UiProvider';
import { track } from '../services/Analytics';

export function AuthWindow({ onAuthenticated }: { onAuthenticated: () => void }) {
  const { authUrl, closeAuth } = useUi();
  const { colors } = useTheme();
  const { config } = useRemoteConfig();
  const [progress, setProgress] = useState(0);
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const doneFired = useRef(false);

  useEffect(() => {
    if (authUrl) {
      doneFired.current = false;
      setCurrentUrl(authUrl);
      setProgress(0);
    }
  }, [authUrl]);

  const finish = useCallback(() => {
    if (doneFired.current) return;
    doneFired.current = true;
    track('auth_modal_done');
    closeAuth();
    onAuthenticated();
  }, [closeAuth, onAuthenticated]);

  const onShouldLoad = useCallback(
    (req: WebViewNavRequest): boolean => {
      if (!req.isTopFrame) {
        // OAuth iframes (Google One Tap etc.) load cross-origin by design.
        return isAllowedWebHost(req.url) || isAuthHost(req.url) || isHttpUrl(req.url);
      }
      const host = hostOf(req.url);
      // Provider redirect back to the site == authenticated.
      if (hostMatches(host, 'z.ai') && !host.startsWith('auth.') && !host.startsWith('accounts.')) {
        setTimeout(finish, 650);
        return true;
      }
      return isAllowedWebHost(req.url) || isAuthHost(req.url);
    },
    [finish],
  );

  const onOpenWindow = useCallback((e: WebViewOpenWindowEvt) => {
    // Popups (GitHub/Google "open in new window") are re-routed into this
    // window so the whole flow stays inside the modal.
    const target = e.nativeEvent.targetUrl;
    if (target && (isAllowedWebHost(target) || isAuthHost(target))) {
      setCurrentUrl(target);
    }
  }, []);

  if (!authUrl) return null;

  return (
    <Modal visible animationType="slide" onRequestClose={closeAuth}>
      <SafeAreaView style={[styles.root, { backgroundColor: colors.card }]} edges={['top', 'bottom']}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={closeAuth} hitSlop={8} accessibilityLabel="Cancel sign-in">
            <Text style={[styles.cancel, { color: colors.subtext }]}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            Sign in
          </Text>
          <TouchableOpacity onPress={finish} hitSlop={8} accessibilityLabel="Finish sign-in">
            <Text style={[styles.done, { color: colors.accent }]}>Done</Text>
          </TouchableOpacity>
        </View>
        <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
          <View
            style={[
              styles.progressFill,
              { backgroundColor: colors.accent, width: `${Math.round(progress * 100)}%` },
            ]}
          />
        </View>
        <WebView
          key={currentUrl ?? 'auth'}
          source={{ uri: currentUrl ?? authUrl }}
          style={{ backgroundColor: colors.webBackground, flex: 1 }}
          userAgent={mobileUserAgent(config.uaOverride)}
          javaScriptEnabled
          domStorageEnabled
          sharedCookiesEnabled
          thirdPartyCookiesEnabled
          cacheEnabled
          incognito={false}
          onShouldStartLoadWithRequest={onShouldLoad}
          onOpenWindow={onOpenWindow}
          onLoadProgress={(e) => setProgress(e.nativeEvent.progress)}
          onLoadEnd={(e) => {
            const url = e.nativeEvent.url ?? '';
            const host = hostOf(url);
            if (hostMatches(host, 'z.ai') && !host.startsWith('auth.') && !host.startsWith('accounts.')) {
              setTimeout(finish, 900);
            }
          }}
          setSupportMultipleWindows={Platform.OS === 'android'}
          pullToRefreshEnabled={false}
          allowsBackForwardNavigationGestures={Platform.OS === 'ios'}
        />
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <Text style={[styles.footerText, { color: colors.subtext }]}>
            Sign in with your existing account. Tap Done when the site shows you as signed in.
          </Text>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cancel: { fontSize: 15 },
  done: { fontSize: 15, fontWeight: '600' },
  title: { fontSize: 16, fontWeight: '600' },
  progressTrack: { height: 2, width: '100%' },
  progressFill: { height: 2 },
  footer: { padding: 12, borderTopWidth: StyleSheet.hairlineWidth },
  footerText: { fontSize: 12, textAlign: 'center', lineHeight: 17 },
});
