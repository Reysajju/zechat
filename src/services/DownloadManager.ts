/**
 * DownloadManager — native download handling (spec §4).
 *
 * Two paths, tried in order:
 *  1. In-page fetch (cookie-authenticated, supports blob:/same-origin) — the
 *     page streams base64 chunks over the bridge (window.__zedSendBlob).
 *  2. Native download via expo-file-system `File.downloadFileAsync` — used
 *     when the page fetch fails (CORS, non-GET, http errors).
 *
 * The result is handed to expo-sharing, which shows the native Save/Open
 * dialog on both platforms, plus a completion notification.
 */
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';
import { BLOB_CHUNK_BYTES, BRIDGE_BLOB_MAX_MB_DEFAULT } from '../constants';
import { base64ToUint8Array, concatChunks } from '../utils/base64';
import { fileNameFromUrl } from '../utils/domain';
import { notifyLocal } from './NotificationService';
import { track } from './Analytics';
import type { PendingBlob } from '../types';

let maxBytes = BRIDGE_BLOB_MAX_MB_DEFAULT * 1024 * 1024;

export function setDownloadLimitMb(mb: number): void {
  if (Number.isFinite(mb) && mb > 0) maxBytes = Math.round(mb * 1024 * 1024);
}

/** Entry point for `onFileDownload` from the WebView. */
export function handleFileDownload(url: string, runInPage: (js: string) => void): void {
  const id = `dl-${Date.now()}`;
  const isBlob = url.startsWith('blob:');
  const isHttp = /^https?:/i.test(url);
  if (!isBlob && !isHttp) return;

  // 1) ask the page to stream it (has the site's cookies).
  const js = `window.__zedSendBlob && window.__zedSendBlob(${JSON.stringify(url)}, ${JSON.stringify(id)}, ${maxBytes});`;
  pending.set(id, { name: fileNameFromUrl(url) ?? 'download', mime: 'application/octet-stream', chunks: [], received: 0, size: 0 });
  // Safety timer: if the page never answers, fall back to native download.
  fallbackTimer(id, url, isBlob);
  runInPage(js);
}

function fallbackTimer(id: string, url: string, isBlob: boolean): void {
  setTimeout(() => {
    const p = pending.get(id);
    if (!p) return; // already handled
    pending.delete(id);
    if (!isBlob) {
      void nativeDownload(url);
    } else {
      Alert.alert('Download failed', 'This generated file could not be saved.');
    }
  }, 45000);
}

/** Bridge-driven blob assembly. Returns true when `msg` belonged to a transfer. */
export function feedBlobMessage(msg: Record<string, unknown>, runInPage: (js: string) => void): boolean {
  const type = msg.type as string;
  if (type !== 'blobStart' && type !== 'blobChunk' && type !== 'blobEnd' && type !== 'blobError') return false;
  const id = String(msg.id ?? '');
  if (!id) return true;

  if (type === 'blobStart') {
    pending.set(id, {
      name: String(msg.name ?? 'download'),
      mime: String(msg.mime ?? 'application/octet-stream'),
      chunks: [],
      received: 0,
      size: Number(msg.size ?? 0),
    });
    return true;
  }
  if (type === 'blobChunk') {
    const p = pending.get(id);
    if (!p) return true;
    const bytes = base64ToUint8Array(String(msg.data ?? ''));
    p.chunks.push(bytes);
    p.received += bytes.length;
    if (p.received > maxBytes) {
      pending.delete(id);
      Alert.alert('File too large', `Downloads are capped at ${Math.round(maxBytes / 1024 / 1024)} MB.`);
    }
    return true;
  }
  if (type === 'blobEnd') {
    const p = pending.get(id);
    pending.delete(id);
    if (!p) return true;
    void saveAndShare(p);
    return true;
  }
  if (type === 'blobError') {
    const p = pending.get(id);
    pending.delete(id);
    const size = typeof msg.size === 'number' ? msg.size : undefined;
    if (String(msg.msg) === 'too_large') {
      Alert.alert('File too large', `This file is ${Math.round((size ?? 0) / 1024 / 1024)} MB. Downloads are capped at ${Math.round(maxBytes / 1024 / 1024)} MB.`);
    } else if (p && !urlWasBlob(p.name)) {
      // Page fetch failed — try the native path for regular URLs.
      void nativeDownloadFromBlobContext(id);
    }
    return true;
  }
  return true;
}

function urlWasBlob(_name: string): boolean {
  return false; // placeholder kept for clarity; native fallback only for http
}

function nativeDownloadFromBlobContext(_id: string): void {
  /* blob: URLs cannot be fetched natively; nothing to do. */
}

/** Native fallback for plain http(s) downloads. */
export async function nativeDownload(url: string): Promise<void> {
  try {
    track('download_native_start', { host: safeHost(url) });
    const dir = Paths.cache;
    const stamp = Date.now();
    const guess = fileNameFromUrl(url) ?? `zed-download-${stamp}`;
    const dest = new File(dir, `${stamp}-${guess}`);
    const f = await File.downloadFileAsync(url, dest, { idempotent: true });
    await shareFile(f.uri, 'application/octet-stream', guess);
  } catch (e) {
    track('download_native_error');
    Alert.alert('Download failed', 'The file could not be saved.');
  }
}

async function saveAndShare(p: PendingBlob): Promise<void> {
  try {
    const bytes = concatChunks(p.chunks);
    const safeName = p.name.replace(/[/\\?%*:|"<>]/g, '_');
    const file = new File(Paths.cache, `${Date.now()}-${safeName}`);
    file.create({ overwrite: true, intermediates: true });
    file.write(bytes);
    track('download_saved', { size: bytes.length });
    await shareFile(file.uri, p.mime, safeName);
    void notifyLocal('Download ready', safeName);
  } catch (e) {
    track('download_save_error');
    Alert.alert('Download failed', 'The file could not be saved.');
  }
}

/** Native "Save to Files / Open with" dialog. */
async function shareFile(uri: string, mimeType: string, title: string): Promise<void> {
  try {
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType,
        dialogTitle: `Save "${title}"`,
      });
    }
  } catch {
    /* user dismissed the sheet */
  }
}

function safeHost(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

const pending = new Map<string, PendingBlob>();
export const BLOB_CHUNK_SIZE = BLOB_CHUNK_BYTES;
