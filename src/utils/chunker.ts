// utils/chunker.ts

/**
 * Splits a UTF-8 string into chunks up to `maxBytes`, trying to break on newlines
 * to avoid cutting CSV/JSON rows.
 */
export function chunkUtf8(value: string, maxBytes = 512 * 1024): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < value.length) {
    let end = Math.min(value.length, start + maxBytes);
    if (end < value.length) {
      const nl = value.lastIndexOf("\n", end);
      if (nl > start + 1 && end - nl < 1024) end = nl + 1;
    }
    chunks.push(value.slice(start, end));
    start = end;
  }
  return chunks;
}

/**
 * Splits a Buffer into UTF-8 string chunks (≤ maxBytes each), trying to break on newlines.
 * Useful on the server when you downloaded raw bytes (e.g., from Drive).
 */
export function bufferToUtf8Chunks(buf: Buffer, maxBytes = 512 * 1024): string[] {
  const chunks: string[] = [];
  let offset = 0;
  while (offset < buf.length) {
    let end = Math.min(buf.length, offset + maxBytes);
    if (end < buf.length) {
      // look back within a small window for newline to avoid cutting row
      const window = Math.max(offset, end - 1024);
      const idx = buf.slice(window, end).lastIndexOf(0x0a); // '\n'
      if (idx !== -1) end = window + idx + 1;
    }
    chunks.push(buf.slice(offset, end).toString("utf8"));
    offset = end;
  }
  return chunks;
}
