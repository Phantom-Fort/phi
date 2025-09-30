export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024; // 20MB

// MIME allowlist (client-side)
export const ALLOWED_MIME = new Set<string>([
  "text/plain",
  "text/csv",
  "application/json",
]);

// Fallback by extension if browser mime is empty/generic
export const EXT_TO_MIME: Record<string, string> = {
  ".txt": "text/plain",
  ".csv": "text/csv",
  ".json": "application/json",
};
