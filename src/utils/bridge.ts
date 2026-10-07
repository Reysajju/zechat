/**
 * Parser for the `window.ReactNativeWebView.postMessage` protocol used by the
 * injected scripts. Keeps native code defensive: anything malformed is dropped.
 */
import type { BridgeMessage } from '../types';

export function parseBridgeMessage(raw: unknown): BridgeMessage | null {
  if (typeof raw !== 'string') return null;
  try {
    const data = JSON.parse(raw) as Record<string, unknown>;
    if (data.t !== 'bridge' || data.v !== 1 || typeof data.type !== 'string') return null;
    return data as unknown as BridgeMessage;
  } catch {
    return null;
  }
}

/** Wrap a JS snippet for `injectJavaScript` so it always evaluates cleanly. */
export function wrapJs(code: string): string {
  return `(function(){ try { ${code} } catch (e) { } })(); true;`;
}
