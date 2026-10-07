/**
 * ThemeProvider (Phase 3 fix: dark/light follows the system, no white flash).
 * The WebView background, splash and status bar all key off the same palette.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Appearance, useColorScheme } from 'react-native';
import * as SystemUI from 'expo-system-ui';
import * as SplashScreen from 'expo-splash-screen';
import type { ThemeColors, ThemeContextValue, ThemeMode } from '../types';
import { loadThemeMode, KEYS, saveString } from '../utils/storage';

export const LIGHT: ThemeColors = {
  background: '#F6F7F9',
  text: '#101418',
  subtext: '#5A6472',
  accent: '#3B82F6',
  border: '#E3E6EB',
  card: '#FFFFFF',
  danger: '#DC2626',
  webBackground: '#FFFFFF',
};

export const DARK: ThemeColors = {
  background: '#0B0F14',
  text: '#EDEFF2',
  subtext: '#9AA3AF',
  accent: '#60A5FA',
  border: '#232A33',
  card: '#11161D',
  danger: '#F87171',
  webBackground: '#0B0F14',
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    loadThemeMode().then((m) => {
      if (m) setModeState(m);
    });
  }, []);

  const scheme: 'light' | 'dark' =
    mode === 'system' ? (system === 'dark' ? 'dark' : 'light') : mode;

  const colors = scheme === 'dark' ? DARK : LIGHT;

  // No white flash: the Android/iOS root view background tracks the scheme.
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.webBackground).catch(() => {});
  }, [colors.webBackground]);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    void saveString(KEYS.themeMode, m);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, scheme, colors, setMode }),
    [mode, scheme, colors, setMode],
  );

  // Keep Appearance subscription alive so mode === 'system' stays reactive.
  useEffect(() => {
    const sub = Appearance.addChangeListener(() => {});
    return () => sub.remove();
  }, []);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}
