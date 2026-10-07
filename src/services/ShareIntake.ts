/**
 * ShareIntake — "Share to app" (spec §4).
 *
 * Android: expo-share-intent registers ACTION_SEND receivers (text, images,
 * files). iOS share extension is documented in docs/BUILD.md (optional native
 * target). Incoming text is pasted into the composer via the page bridge;
 * files are base64-streamed into the page and injected as a paste event so
 * the site's own upload pipeline handles them.
 */
import { useEffect, useRef, useState } from 'react';
import { useShareIntent } from 'expo-share-intent';
import { File } from 'expo-file-system';
import type { ShareIntakePayload } from '../types';

const INTAKE_FILE_MAX_BYTES = 15 * 1024 * 1024;

export function useShareIntake(): ShareIntakePayload | null {
  const { shareIntent, resetShareIntent } = useShareIntent({ debug: false });
  const [payload, setPayload] = useState<ShareIntakePayload | null>(null);
  const processing = useRef(false);

  useEffect(() => {
    if (processing.current) return;
    if (!shareIntent || (!shareIntent.text && !(shareIntent.files && shareIntent.files.length))) return;
    processing.current = true;

    const run = async () => {
      try {
        if (shareIntent.text) {
          setPayload({ text: shareIntent.text });
        }
        const first = shareIntent.files && shareIntent.files[0];
        if (first && first.path) {
          if (first.size && first.size > INTAKE_FILE_MAX_BYTES) {
            setPayload({ text: `[File too large to attach: ${first.fileName ?? 'file'}]` });
          } else {
            const f = new File(first.path);
            const b64 = await f.base64();
            setPayload({
              file: { name: first.fileName ?? 'attachment', mime: first.mimeType ?? 'application/octet-stream', b64 },
            });
          }
        }
        resetShareIntent();
      } catch {
        setPayload({ text: '[Could not read shared content]' });
      } finally {
        processing.current = false;
      }
    };
    void run();
  }, [shareIntent, resetShareIntent]);

  return payload;
}

/** Consume the payload once the WebView has injected it. */
export function useConsumePayload(
  payload: ShareIntakePayload | null,
  consume: () => void,
): void {
  const consumedRef = useRef(false);
  useEffect(() => {
    if (payload && !consumedRef.current) {
      consumedRef.current = true;
      consume();
    }
    if (!payload) consumedRef.current = false;
  }, [payload, consume]);
}
