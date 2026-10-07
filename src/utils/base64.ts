/**
 * Base64 -> bytes decoder for Hermes (no Buffer/atob in the RN runtime).
 * Used to reassemble blob chunks streamed from the WebView.
 */
const B64_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

const LOOKUP: Record<string, number> = {};
for (let i = 0; i < B64_ALPHABET.length; i++) LOOKUP[B64_ALPHABET[i]] = i;
LOOKUP['-'] = 62; // base64url tolerance
LOOKUP['_'] = 63;

export function base64ToUint8Array(b64: string): Uint8Array {
  const clean = b64.replace(/[^A-Za-z0-9+/_-]/g, '');
  const len = clean.length;
  const padding = len >= 2 && clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0;
  const out = new Uint8Array(Math.floor((len * 3) / 4) - padding);
  let o = 0;
  let buffer = 0;
  let bits = 0;
  for (let i = 0; i < len; i++) {
    const v = LOOKUP[clean[i]];
    if (v === undefined) continue;
    buffer = (buffer << 6) | v;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[o++] = (buffer >> bits) & 0xff;
    }
  }
  return out;
}

/** Concatenate byte chunks into one array (bounded by downloadMaxMb upstream). */
export function concatChunks(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.length;
  }
  return out;
}
