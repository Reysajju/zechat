/**
 * App.tsx — root shell (spec §5 architecture).
 *
 * State machine: boot → (locked? | offline? | webview)
 * Providers: CrashBoundary → Theme → RemoteConfig → Ui → SafeArea.
 * Native modals (AuthWindow, SettingsSheet) and ToastHost live here so they
 * overlay every state.
 */
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import WebViewScreen from './src/screens/WebViewScreen';
import { ThemeProvider, useTheme } from './src/theme/ThemeProvider';
import { RemoteConfigProvider } from './src/services/RemoteConfig';
import { UiProvider, useUi } from './src/services/UiProvider';
import { useBiometricLock } from './src/services/BiometricLock';
import { checkForUpdates } from './src/services/UpdateService';
import { AppSplash } from './src/components/AppSplash';
import { LockScreen } from './src/components/LockScreen';
import { AuthWindow } from './src/components/AuthWindow';
import { SettingsSheet } from './src/components/SettingsSheet';
import { ToastHost } from './src/components/Toasts';
import { SPLASH_MIN_MS } from './src/constants';
import type { AuthStrategy } from './src/types';

void SplashScreen.preventAutoHideAsync().catch(() => {});

function Shell() {
  const { colors, scheme } = useTheme();
  const ui = useUi();
  const biometric = useBiometricLock();
  const [booted, setBooted] = useState(false);
  const [authReloads, setAuthReloads] = useState(0);
  const [authStrategyOverride, setAuthStrategyOverride] = useState<AuthStrategy | null>(null);
  const [clearToken, setClearToken] = useState(0);
  const bootAt = useRef(Date.now());

  // Enforce a minimum splash so the cold start never flashes.
  useEffect(() => {
    const wait = Math.max(0, SPLASH_MIN_MS - (Date.now() - bootAt.current));
    const t = setTimeout(() => {
      setBooted(true);
      void SplashScreen.hideAsync().catch(() => {});
    }, wait);
    return () => clearTimeout(t);
  }, []);

  // In-app update check (OTA + store gate), once per launch.
  useEffect(() => {
    if (booted) void checkForUpdates().catch(() => {});
  }, [booted]);

  const clearData = () => {
    // Bump token: WebViewScreen's `key` includes it, forcing a fresh engine.
    setClearToken((n) => n + 1);
    setAuthReloads((n) => n + 1);
  };

  if (!booted || biometric.locked) {
    if (biometric.locked) {
      return (
        <>
          <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
          <LockScreen onUnlock={() => void biometric.attemptUnlock()} />
        </>
      );
    }
    return (
      <>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        <AppSplash />
      </>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.webBackground }]}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <WebViewScreen
        key={`web-${clearToken}-${authReloads}`}
        onAuthReloadSignal={() => setAuthReloads((n) => n + 1)}
      />
      <AuthWindow onAuthenticated={() => setAuthReloads((n) => n + 1)} />
      <SettingsSheet
        onClose={ui.closeSettings}
        onClearData={clearData}
        authStrategyOverride={authStrategyOverride}
        setAuthStrategyOverride={setAuthStrategyOverride}
        biometric={{
          enabled: biometric.enabled,
          setEnabled: biometric.setEnabled,
          hardwareAvailable: biometric.hardwareAvailable,
        }}
      />
      <ToastHost />
    </View>
  );
}

export default function App() {
  return (
    <CrashSafe>
      <ThemeProvider>
        <RemoteConfigProvider>
          <UiProvider>
            <SafeAreaProvider>
              <Shell />
            </SafeAreaProvider>
          </UiProvider>
        </RemoteConfigProvider>
      </ThemeProvider>
    </CrashSafe>
  );
}

/** Placeholder indirection so App root stays readable in imports/tests. */
function CrashSafe({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
