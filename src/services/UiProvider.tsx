/**
 * UiProvider — tiny app-level UI bus: auth window URL, settings sheet,
 * toast messages. Kept as one context so the WebView screen and native
 * chrome (modals, floating button) stay decoupled.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';

interface UiContextValue {
  authUrl: string | null;
  openAuth: (url: string) => void;
  closeAuth: () => void;
  settingsOpen: boolean;
  openSettings: () => void;
  closeSettings: () => void;
  toast: (msg: string) => void;
  toastSeq: number;
  lastToast: string;
}

const UiContext = createContext<UiContextValue | null>(null);

export function UiProvider({ children }: { children: React.ReactNode }) {
  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [lastToast, setLastToast] = useState('');
  const [toastSeq, setToastSeq] = useState(0);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openAuth = useCallback((url: string) => setAuthUrl(url), []);
  const closeAuth = useCallback(() => setAuthUrl(null), []);
  const openSettings = useCallback(() => setSettingsOpen(true), []);
  const closeSettings = useCallback(() => setSettingsOpen(false), []);
  const toast = useCallback((msg: string) => {
    setLastToast(msg);
    setToastSeq((n) => n + 1);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setLastToast(''), 2600);
  }, []);

  const value = useMemo(
    () => ({ authUrl, openAuth, closeAuth, settingsOpen, openSettings, closeSettings, toast, lastToast, toastSeq }),
    [authUrl, openAuth, closeAuth, settingsOpen, openSettings, closeSettings, toast, lastToast, toastSeq],
  );

  return <UiContext.Provider value={value}>{children}</UiContext.Provider>;
}

export function useUi(): UiContextValue {
  const ctx = useContext(UiContext);
  if (!ctx) throw new Error('useUi must be used inside <UiProvider>');
  return ctx;
}
