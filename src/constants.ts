/**
 * Global constants. Values that deployments may want to change are wired to
 * EXPO_PUBLIC_* env vars so they can differ between builds without code edits.
 */

/** The site the app hosts. Override per-flavour with EXPO_PUBLIC_START_URL. */
export const START_URL = process.env.EXPO_PUBLIC_START_URL ?? 'https://chat.z.ai';

export const DEEP_LINK_SCHEME = 'zedchat';

export const APP_NAME = 'Zed Chat';

/** Remote config URL — host the JSON yourself (see docs/remote-config.schema.json). */
export const REMOTE_CONFIG_URL = process.env.EXPO_PUBLIC_RC_URL ?? '';

export const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN ?? '';

/** How long the native splash is guaranteed to stay up (smooths cold start). */
export const SPLASH_MIN_MS = 700;

/** Time window in which a second Android back press exits the app. */
export const EXIT_BACK_WINDOW_MS = 2200;

/** Chunk size (bytes) used when streaming blobs from the page to native. */
export const BLOB_CHUNK_BYTES = 768 * 1024;

/** Guard against unbounded base64 transfers inside the JS bridge. */
export const BRIDGE_BLOB_MAX_MB_DEFAULT = 25;
