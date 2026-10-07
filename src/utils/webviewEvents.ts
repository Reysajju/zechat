/**
 * Structural event types for react-native-webview handlers.
 *
 * RNW 13.x doesn't re-export its event interfaces from the package root, and
 * handlers are contravariant in their parameter, so these narrower structural
 * types typecheck cleanly against the real prop signatures.
 */
export interface WebViewNavRequest {
  url: string;
  isTopFrame: boolean;
  canGoBack?: boolean;
  navigationType?: string;
}

export interface WebViewOpenWindowEvt {
  nativeEvent: { targetUrl: string };
}

export interface WebViewFileDownloadEvt {
  nativeEvent: { downloadUrl: string };
}

export interface WebViewRenderProcessGoneEvt {
  nativeEvent: { didCrash: boolean };
}

export interface WebViewProgressEvt {
  nativeEvent: { progress: number };
}

export interface WebViewLoadEndEvt {
  nativeEvent: { url?: string };
}

export interface WebViewMessageEvt {
  nativeEvent: { data: string };
}

export interface WebViewErrorEvt {
  nativeEvent: { description?: string; url?: string; code?: number };
}
