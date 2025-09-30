// utils/logger.ts
type Level = "debug" | "info" | "warn" | "error";
const ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

const ENV_LEVEL = (process.env.LOG_LEVEL as Level) ??
  (process.env.NODE_ENV === "production" ? "info" : "debug");

function enabled(level: Level) {
  return ORDER[level] >= ORDER[ENV_LEVEL];
}

// Basic redaction for logs (do not rely on logs for PHI!)
const EMAIL_RE = /\b([A-Za-z0-9._%+-])[A-Za-z0-9._%+-]*(@[A-Za-z0-9.-]+\.[A-Za-z]{2,})\b/g;
const PHONE_RE = /\b(\+?\d{0,3})?[\s\-().]*\d{2,4}[\s\-().]*\d{2,4}[\s\-().]*\d{2,4}\b/g;
// crude API/key/token style matches (short, avoids over-redaction)
const TOKEN_RE = /\b([A-Za-z0-9_\-]{20,})\b/g;

function redact(input: unknown): unknown {
  if (typeof input === "string") {
    return input
      .replace(EMAIL_RE, (_, a, b) => `${a.replace(/./g, "*")}${b}`)
      .replace(PHONE_RE, (m) => m.replace(/\d(?=\d{2})/g, "*"))
      .replace(TOKEN_RE, (m) => (m.length > 8 ? `${m.slice(0, 4)}...${m.slice(-4)}` : "***"));
  }
  if (Array.isArray(input)) return input.map(redact);
  if (input && typeof input === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      out[k] = redact(v);
    }
    return out;
  }
  return input;
}

function toJSON(meta?: unknown) {
  if (meta === undefined) return "";
  try {
    return " " + JSON.stringify(redact(meta));
  } catch {
    return " [unserializable-meta]";
  }
}

function print(level: Level, msg: string, meta?: unknown) {
  if (!enabled(level)) return;
  const ts = new Date().toISOString();
  const line = `${ts} ${level.toUpperCase()} ${msg}${toJSON(meta)}`;
  // route errors/warns to stderr; else stdout
  if (level === "error" || level === "warn") console.error(line);
  else console.log(line);
}

export function mkReqId() {
  // very small, low-collision id (timestamp + rand)
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function safeError(e: unknown) {
  if (e instanceof Error) {
    return { name: e.name, message: e.message, stack: e.stack?.split("\n").slice(0, 5).join("\n") };
  }
  try {
    return { message: JSON.stringify(e) };
  } catch {
    return { message: String(e) };
  }
}

export function timeit<T>(label: string, fn: () => Promise<T> | T, ctx?: Record<string, unknown>) {
  const start = typeof performance !== "undefined" ? performance.now() : Date.now();
  const done = (ok: boolean, extra?: Record<string, unknown>) => {
    const end = typeof performance !== "undefined" ? performance.now() : Date.now();
    const ms = Math.max(0, end - start);
    print(ok ? "info" : "warn", `${label} completed`, { ms, ...ctx, ...extra });
  };
  try {
    const res = fn();
    if (res instanceof Promise) {
      return res.then((v) => {
        done(true);
        return v;
      }).catch((err) => {
        done(false, { error: safeError(err) });
        throw err;
      });
    } else {
      done(true);
      return res;
    }
  } catch (err) {
    done(false, { error: safeError(err) });
    throw err;
  }
}

export const logger = {
  debug: (msg: string, meta?: unknown) => print("debug", msg, meta),
  info:  (msg: string, meta?: unknown) => print("info", msg, meta),
  warn:  (msg: string, meta?: unknown) => print("warn", msg, meta),
  error: (msg: string, meta?: unknown) => print("error", msg, meta),
  child: (ctx: Record<string, unknown>) => ({
    debug: (msg: string, meta?: unknown) =>
      print("debug", msg, { ...ctx, ...(typeof meta === "object" && meta !== null ? meta : {}) }),
    info: (msg: string, meta?: unknown) =>
      print("info", msg, { ...ctx, ...(typeof meta === "object" && meta !== null ? meta : {}) }),
    warn: (msg: string, meta?: unknown) =>
      print("warn", msg, { ...ctx, ...(typeof meta === "object" && meta !== null ? meta : {}) }),
    error: (msg: string, meta?: unknown) =>
      print("error", msg, { ...ctx, ...(typeof meta === "object" && meta !== null ? meta : {}) }),
  }),
};
