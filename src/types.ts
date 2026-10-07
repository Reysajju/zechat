/**
 * Shared types for the whole app.
 */

/** Which strategy the AuthHandler uses for OAuth / cross-domain sign-in. */
export type AuthStrategy = 'modal' | 'external' | 'same';

/** JSON schema of the remotely-hosted config used to hot-patch the app. */
export interface RemoteSelectors {
  /** CSS selector for the chat composer (textarea or contenteditable). */
  composer: string;
  /** CSS selector for the "New chat" control. Empty disables the shortcut. */
  newChat: string;
  /** CSS selector for the scrollable chat message container. Empty = auto-detect. */
  chatScroll: string;
  /** CSS selector that closes the site sidebar/drawer. Empty = skip drawer close. */
  drawerClose: string;
  /** Selectors that match a visible "Stop generating" control while an agent runs. */
  taskRunning: string[];
  /** Selectors matching the send button (used for haptics). */
  sendButton: string[];
}

export interface RemoteConfig {
  version: number;
  authStrategy: AuthStrategy;
  /** Allow pinch zoom (accessibility). Default false to prevent accidental zoom. */
  allowZoom: boolean;
  /** Fully override the WebView user agent (null = built-in mobile UA). */
  uaOverride: string | null;
  /** Hard cap for blob downloads, in MB. */
  downloadMaxMb: number;
  /** Minimum app version that should force the store-update dialog. Null disables. */
  minVersion: string | null;
  /** Show the small draggable native settings button. */
  showFloatingMenu: boolean;
  selectors: RemoteSelectors;
  /** Extra CSS appended after the built-in stylesheet (hot-patch for site updates). */
  cssPatch: string;
}

export type ThemeMode = 'system' | 'light' | 'dark';

export interface ThemeColors {
  background: string;
  text: string;
  subtext: string;
  accent: string;
  border: string;
  card: string;
  danger: string;
  /** Background applied to the WebView container so there is no white flash. */
  webBackground: string;
}

export interface ThemeContextValue {
  mode: ThemeMode;
  scheme: 'light' | 'dark';
  colors: ThemeColors;
  setMode: (mode: ThemeMode) => void;
}

/** All messages the injected JS can post to the native side. */
export type BridgeMessage =
  | { t: 'bridge'; v: 1; type: 'log'; msg: string }
  | { t: 'bridge'; v: 1; type: 'ready'; href: string }
  | { t: 'bridge'; v: 1; type: 'route'; url: string }
  | { t: 'bridge'; v: 1; type: 'theme'; scheme: 'light' | 'dark' }
  | { t: 'bridge'; v: 1; type: 'task'; state: 'running' | 'idle' }
  | { t: 'bridge'; v: 1; type: 'send' }
  | { t: 'bridge'; v: 1; type: 'layout'; desktopSuspected: boolean; innerWidth: number; scrollWidth: number }
  | { t: 'bridge'; v: 1; type: 'kb'; open: boolean }
  | { t: 'bridge'; v: 1; type: 'stb'; visible: boolean }
  | { t: 'bridge'; v: 1; type: 'drawer'; open: boolean }
  | { t: 'bridge'; v: 1; type: 'pasteResult'; ok: boolean; method: string }
  | { t: 'bridge'; v: 1; type: 'blobStart'; id: string; name: string; mime: string; size: number }
  | { t: 'bridge'; v: 1; type: 'blobChunk'; id: string; i: number; data: string }
  | { t: 'bridge'; v: 1; type: 'blobEnd'; id: string }
  | { t: 'bridge'; v: 1; type: 'blobError'; id: string; msg: string; size?: number };

/** Payload delivered by the OS share sheet into a new chat. */
export interface ShareIntakePayload {
  text?: string;
  file?: { name: string; mime: string; b64: string };
}

/** A file being downloaded/collected, tracked across bridge chunks. */
export interface PendingBlob {
  name: string;
  mime: string;
  chunks: Uint8Array[];
  received: number;
  size: number;
}
