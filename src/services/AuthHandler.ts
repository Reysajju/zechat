/**
 * AuthHandler — routes OAuth / cross-domain sign-in for the WebView.
 *
 * Three strategies (remote-config switchable, default `modal`):
 *   modal    — OAuth hosts open in a dedicated in-app AuthWindow (a native
 *              modal with its own WebView sharing the same cookie store).
 *              Session cookies land in the shared store; we close + reload.
 *   external — OAuth hosts open via Custom Tabs / SFSafariAuthenticationSession
 *              (expo-web-browser). Fully browser-grade privacy/ToS surface;
 *              the user returns with a Done button (see AuthWindow note).
 *   same     — legacy escape hatch: let the main WebView navigate to auth
 *              hosts directly. Least robust across providers; kept as a
 *              remote-config fallback after site redesigns.
 *
 * COMPLIANCE FLAG (docs/DECISIONS.md #2): the `modal` strategy presents a
 * mobile browser UA inside an embedded window so providers serve their normal
 * flow. Review with counsel; switch to `external` if your legal team prefers.
 */
import * as WebBrowser from 'expo-web-browser';
import { track } from './Analytics';
import type { AuthStrategy } from '../types';

export interface AuthRouteResult {
  /** true when the caller must NOT let the main WebView load this URL. */
  intercepted: boolean;
}

export async function openExternalAuth(url: string): Promise<boolean> {
  track('auth_external_start', { host: safeHost(url) });
  try {
    const result = await WebBrowser.openAuthSessionAsync(url, undefined);
    const dismissed = result.type === 'success' || result.type === 'dismiss';
    track('auth_external_end', { type: result.type });
    return dismissed;
  } catch {
    return false;
  }
}

function safeHost(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

export function strategyLabel(s: AuthStrategy): string {
  switch (s) {
    case 'modal':
      return 'In-app window (default)';
    case 'external':
      return 'System browser';
    case 'same':
      return 'Same window (legacy)';
  }
}
