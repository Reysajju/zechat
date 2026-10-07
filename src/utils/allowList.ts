/**
 * Navigation allowlist.
 *
 * Domains here load INSIDE the WebView. Everything else opens in the system
 * browser. The list is derived from what chat.z.ai actually loads:
 *   - z.ai              — the site itself + API/auth subdomains
 *   - z-cdn.chatglm.cn  — SPA bundle/asset CDN (discovered on the live site)
 *   - o.alicdn.com      — frontend lib CDN used by the site
 *   - aliyuncs.com      — site RUM/monitoring endpoints
 *   - googletagmanager.com / google-analytics.com — site analytics
 *   - challenges.cloudflare.com — bot-protection widget (usually an iframe)
 *   - fonts.googleapis.com / fonts.gstatic.com — web fonts
 *
 * It can be extended at runtime via remote config (see RemoteConfigProvider).
 */
import { hostMatches, hostOf } from './domain';

/** Suffix rules — host equals or ends with `.<suffix>`. */
export const BASE_ALLOWED_SUFFIXES: readonly string[] = [
  'z.ai',
  'chatglm.cn',
  'alicdn.com',
  'aliyuncs.com',
  'googletagmanager.com',
  'google-analytics.com',
  'analytics.google.com',
  'challenges.cloudflare.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
];

/** Domains considered "auth provider" pages. Routed by the AuthHandler. */
export const AUTH_HOST_SUFFIXES: readonly string[] = [
  'accounts.google.com',
  'appleid.apple.com',
  'github.com',
  'login.microsoftonline.com',
  'login.live.com',
  'auth.z.ai',
  'accounts.z.ai',
  'clerk.accounts.dev',
  'okta.com',
];

let runtimeExtraSuffixes: string[] = [];

/** Extend the allowlist from remote config without a store release. */
export function setRuntimeAllowedSuffixes(list: string[] | undefined): void {
  runtimeExtraSuffixes = Array.isArray(list) ? list.filter(Boolean) : [];
}

export function isAllowedWebHost(url: string): boolean {
  const host = hostOf(url);
  if (!host) return false;
  return hostMatchesAnySuffix(host, [...BASE_ALLOWED_SUFFIXES, ...runtimeExtraSuffixes]);
}

export function hostMatchesAnySuffix(host: string, suffixes: readonly string[]): boolean {
  return suffixes.some((d) => hostMatches(host, d));
}

export function isAuthHost(url: string): boolean {
  const host = hostOf(url);
  if (!host) return false;
  return AUTH_HOST_SUFFIXES.some((d) => hostMatches(host, d));
}
