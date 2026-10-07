/** Typed AsyncStorage access — one place that knows all persisted keys. */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AuthStrategy, ThemeMode } from '../types';

export const KEYS = {
  themeMode: '@zed/theme-mode',
  biometricEnabled: '@zed/biometric-enabled',
  authStrategy: '@zed/auth-strategy',
  allowZoom: '@zed/allow-zoom',
  remoteConfigCache: '@zed/remote-config-cache',
  remoteConfigFetchedAt: '@zed/remote-config-fetched-at',
  floatingMenuPos: '@zed/floating-menu-pos',
  everLaunched: '@zed/ever-launched',
} as const;

export async function loadJson<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export async function saveJson(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full/unavailable — non-fatal */
  }
}

export async function loadString(key: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(key);
  } catch {
    return null;
  }
}

export async function saveString(key: string, value: string): Promise<void> {
  try {
    await AsyncStorage.setItem(key, value);
  } catch {
    /* non-fatal */
  }
}

export async function loadBool(key: string, fallback: boolean): Promise<boolean> {
  const raw = await loadString(key);
  if (raw === '1') return true;
  if (raw === '0') return false;
  return fallback;
}

export async function saveBool(key: string, value: boolean): Promise<void> {
  await saveString(key, value ? '1' : '0');
}

export async function loadThemeMode(): Promise<ThemeMode | null> {
  const raw = await loadString(KEYS.themeMode);
  return raw === 'system' || raw === 'light' || raw === 'dark' ? raw : null;
}

export async function loadAuthStrategy(): Promise<AuthStrategy | null> {
  const raw = await loadString(KEYS.authStrategy);
  return raw === 'modal' || raw === 'external' || raw === 'same' ? raw : null;
}
