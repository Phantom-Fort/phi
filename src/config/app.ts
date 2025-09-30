// config/app.ts
export const APP = {
  MAX_UPLOAD_BYTES: 20 * 1024 * 1024, // 20 MB
  DLP_CHUNK_BYTES: 512 * 1024,        // 0.5 MB (per-request content limit)
  DLP_LOCATION: process.env.DLP_LOCATION || "global",
  DLP_PROJECT_ID: process.env.DLP_PROJECT_ID || process.env.GCLOUD_PROJECT || "",
  DRIVE_PARENT_FOLDER_ID: process.env.DRIVE_PARENT_FOLDER_ID || "",
};

export const MIME = {
  ALLOWED: new Set<string>([
    "text/plain",
    "text/csv",
    "application/json",
  ]),
  DEFAULT: "application/octet-stream",
};

export const SECURITY = {
  // Keep logs lean; never print raw file content
  LOG_LEVEL: process.env.LOG_LEVEL || (process.env.NODE_ENV === "production" ? "info" : "debug"),
};
