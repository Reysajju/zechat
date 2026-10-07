/**
 * Mobile user agents (Phase 2/3 fix — "never desktop view").
 *
 * We send an explicit mobile Chrome/Safari UA so chat.z.ai always serves its
 * responsive layout and so OAuth providers do not classify the WebView as a
 * "desktop site" request. The strings intentionally omit WebView markers
 * (e.g. Android's "; wv") — see docs/DECISIONS.md before changing this.
 */
import { Platform } from 'react-native';

export const ANDROID_UA =
  'Mozilla/5.0 (Linux; Android 15; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36';

export const IOS_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.3 Mobile/15E148 Safari/604.1';

export function mobileUserAgent(override?: string | null): string {
  if (override && override.trim().length > 0) return override.trim();
  return Platform.OS === 'ios' ? IOS_UA : ANDROID_UA;
}
