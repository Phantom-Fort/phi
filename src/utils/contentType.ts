import { ALLOWED_MIME, EXT_TO_MIME } from "./constants";

export function detectMime(name: string, browserMime?: string | null) {
  if (browserMime && ALLOWED_MIME.has(browserMime)) return browserMime;
  const lower = name.toLowerCase();
  const ext = Object.keys(EXT_TO_MIME).find((e) => lower.endsWith(e));
  return ext ? EXT_TO_MIME[ext] : browserMime || "application/octet-stream";
}

export function isAllowedFile(name: string, browserMime?: string | null) {
  const mime = detectMime(name, browserMime);
  return ALLOWED_MIME.has(mime);
}

export function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024, units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${units[i]}`;
}
