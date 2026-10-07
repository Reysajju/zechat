/**
 * BiometricLock — optional app lock (Face ID / Touch ID / Android biometrics).
 * When enabled, leaving the app locks it; returning requires biometric
 * (or device credential fallback) unlock.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { KEYS, loadBool, saveBool } from '../utils/storage';

export function useBiometricLock() {
  const [enabled, setEnabledState] = useState(false);
  const [locked, setLocked] = useState(false);
  const [hardwareAvailable, setHardwareAvailable] = useState(false);
  const authenticating = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const has = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        setHardwareAvailable(has && enrolled);
        const stored = await loadBool(KEYS.biometricEnabled, false);
        if (stored && has && enrolled) setEnabledState(true);
      } catch {
        setHardwareAvailable(false);
      }
    })();
  }, []);

  // Lock when backgrounded.
  useEffect(() => {
    if (!enabled) return;
    const sub = AppState.addEventListener('change', (s: AppStateStatus) => {
      if (s === 'active' && !authenticating.current) setLocked(true);
    });
    return () => sub.remove();
  }, [enabled]);

  // Kick off authentication as soon as the lock screen shows.
  useEffect(() => {
    if (locked) void attemptUnlock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locked]);

  const attemptUnlock = useCallback(async () => {
    if (authenticating.current) return;
    authenticating.current = true;
    try {
      const res = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock Zed Chat',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });
      if (res.success) setLocked(false);
    } catch {
      /* user cancelled — stay locked */
    } finally {
      authenticating.current = false;
    }
  }, []);

  const setEnabled = useCallback(
    async (on: boolean) => {
      setEnabledState(on);
      await saveBool(KEYS.biometricEnabled, on);
      if (!on) setLocked(false);
    },
    [],
  );

  return { enabled, setEnabled, locked, attemptUnlock, hardwareAvailable };
}
