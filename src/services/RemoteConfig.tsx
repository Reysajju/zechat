/**
 * RemoteConfigProvider — the hot-patch channel (spec §5).
 *
 * Fetches a JSON config from EXPO_PUBLIC_RC_URL (hosted by you), caches it in
 * AsyncStorage and merges it over the built-in defaults. If chat.z.ai ships a
 * redesign you can fix selectors / auth strategy / CSS from the server without
 * a store release. See docs/remote-config.schema.json for the schema and
 * remoteConfig.default.json for a servable example.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { REMOTE_CONFIG_URL } from '../constants';
import { setRuntimeAllowedSuffixes } from '../utils/allowList';
import { KEYS, loadJson, saveJson, loadString, saveString } from '../utils/storage';
import type { RemoteConfig } from '../types';

export const DEFAULT_CONFIG: RemoteConfig = {
  version: 1,
  authStrategy: 'modal',
  allowZoom: false,
  uaOverride: null,
  downloadMaxMb: 25,
  minVersion: null,
  showFloatingMenu: true,
  selectors: {
    composer: 'textarea, [contenteditable="true"]',
    newChat: '',
    chatScroll: '',
    drawerClose: '',
    taskRunning: [
      '[data-testid="stop-button"]',
      'button[aria-label*="stop" i]',
      '[class*="stop"][class*="btn" i]',
    ],
    sendButton: [
      'button[type="submit"]',
      '[aria-label*="send" i]',
    ],
  },
  cssPatch: '',
};

/** Hosts we learned about from the live site can be extended remotely too. */
export const EXTRA_ALLOWED_SUFFIXES_DEFAULT: string[] = [];

/** Full wire format of the remotely-hosted JSON. */
export type RemoteConfigWire = Partial<RemoteConfig> & {
  debug?: boolean;
  extraAllowedSuffixes?: string[];
  sentryDsn?: string;
  telemetryUrl?: string;
};

interface RemoteConfigContextValue {
  config: RemoteConfig;
  extraAllowedSuffixes: string[];
  debug: boolean;
  refresh: () => Promise<boolean>;
  lastFetchedAt: number | null;
}

const RemoteConfigContext = createContext<RemoteConfigContextValue | null>(null);

function mergeConfig(over?: RemoteConfigWire | null): RemoteConfig {
  if (!over) return { ...DEFAULT_CONFIG };
  return {
    ...DEFAULT_CONFIG,
    ...over,
    selectors: {
      ...DEFAULT_CONFIG.selectors,
      ...(over.selectors ?? {}),
      taskRunning:
        Array.isArray(over.selectors?.taskRunning) && over.selectors.taskRunning.length
          ? over.selectors.taskRunning
          : DEFAULT_CONFIG.selectors.taskRunning,
      sendButton:
        Array.isArray(over.selectors?.sendButton) && over.selectors.sendButton.length
          ? over.selectors.sendButton
          : DEFAULT_CONFIG.selectors.sendButton,
    },
  };
}

export function RemoteConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<RemoteConfig>(DEFAULT_CONFIG);
  const [extraAllowedSuffixes, setExtraAllowed] = useState<string[]>(EXTRA_ALLOWED_SUFFIXES_DEFAULT);
  const [debug, setDebug] = useState(false);
  const [lastFetchedAt, setLastFetchedAt] = useState<number | null>(null);

  const refresh = useCallback(async (): Promise<boolean> => {
    if (!REMOTE_CONFIG_URL) return false;
    try {
      const res = await fetch(`${REMOTE_CONFIG_URL}${REMOTE_CONFIG_URL.includes('?') ? '&' : '?'}t=${Date.now()}`, {
        cache: 'no-store',
      });
      if (!res.ok) return false;
      const json = (await res.json()) as RemoteConfigWire;
      const merged = mergeConfig(json);
      setConfig(merged);
      setDebug(!!json.debug);
      setExtraAllowed(Array.isArray(json.extraAllowedSuffixes) ? json.extraAllowedSuffixes : []);
      setRuntimeAllowedSuffixes(json.extraAllowedSuffixes);
      void saveJson(KEYS.remoteConfigCache, json);
      void saveString(KEYS.remoteConfigFetchedAt, String(Date.now()));
      setLastFetchedAt(Date.now());
      return true;
    } catch {
      return false;
    }
  }, []);

  // Boot: hydrate cache instantly, then try a fresh fetch (3s timeout).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cached = await loadJson<RemoteConfigWire>(KEYS.remoteConfigCache);
      if (!cancelled && cached) {
        setConfig(mergeConfig(cached));
        setDebug(!!cached.debug);
        setExtraAllowed(Array.isArray(cached.extraAllowedSuffixes) ? cached.extraAllowedSuffixes : []);
        setRuntimeAllowedSuffixes(cached.extraAllowedSuffixes);
      }
      const at = await loadString(KEYS.remoteConfigFetchedAt);
      if (!cancelled && at) setLastFetchedAt(Number(at) || null);
      if (!cancelled) {
        const raced = await Promise.race([refresh(), new Promise<boolean>((r) => setTimeout(() => r(false), 3000))]);
        if (!raced && !cancelled) setDebug(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const value = useMemo(
    () => ({ config, extraAllowedSuffixes, debug, refresh, lastFetchedAt }),
    [config, extraAllowedSuffixes, debug, refresh, lastFetchedAt],
  );

  return <RemoteConfigContext.Provider value={value}>{children}</RemoteConfigContext.Provider>;
}

export function useRemoteConfig(): RemoteConfigContextValue {
  const ctx = useContext(RemoteConfigContext);
  if (!ctx) throw new Error('useRemoteConfig must be used inside <RemoteConfigProvider>');
  return ctx;
}
