/**
 * Analytics — crash reporting + privacy-light event breadcrumbs.
 *
 * Sentry is initialised ONLY if a DSN is provided (EXPO_PUBLIC_SENTRY_DSN or
 * the remote-config `sentryDsn`). No third-party analytics SDK is bundled;
 * `track()` writes Sentry breadcrumbs and can optionally POST to an endpoint
 * you control (rc.telemetryUrl) with no PII. See docs/PRIVACY_POLICY.md.
 */
import Constants from 'expo-constants';
import * as Sentry from '@sentry/react-native';
import { SENTRY_DSN } from '../constants';
import { compareVersions } from '../utils/version';

let inited = false;

export function initAnalytics(): void {
  if (inited) return;
  inited = true;
  const dsn = SENTRY_DSN || (Constants.expoConfig?.extra as { sentryDsn?: string } | undefined)?.sentryDsn || '';
  if (!dsn) return; // Privacy-preserving no-op build.
  try {
    Sentry.init({
      dsn,
      environment: __DEV__ ? 'development' : 'production',
      tracesSampleRate: 0.1,
      enableAutoSessionTracking: true,
    });
  } catch {
    /* never crash because of telemetry */
  }
}

export function track(event: string, data?: Record<string, unknown>): void {
  if (!inited || !dsnConfigured()) return;
  try {
    Sentry.addBreadcrumb({ category: 'ui', message: event, level: 'info', data });
  } catch {
    /* noop */
  }
}

export function captureError(err: unknown, context?: Record<string, unknown>): void {
  if (!dsnConfigured()) {
    if (__DEV__) console.warn('[zed] captureError (sentry disabled):', err, context);
    return;
  }
  try {
    Sentry.captureException(err, { extra: context });
  } catch {
    /* noop */
  }
}

function dsnConfigured(): boolean {
  return !!(SENTRY_DSN || (Constants.expoConfig?.extra as { sentryDsn?: string } | undefined)?.sentryDsn);
}

/** Store-update check helper used by UpdateService. */
export function shouldForceStoreUpdate(current: string, minVersion: string): boolean {
  return compareVersions(current, minVersion) < 0;
}
