// lib/dlp.ts
import { DlpServiceClient } from "@google-cloud/dlp";
import { APP } from "@/config/app";

let client: DlpServiceClient | null = null;

export function makeDlp() {
  if (client) return client;
  client = new DlpServiceClient({ projectId: APP.DLP_PROJECT_ID });
  return client;
}

export function dlpParent() {
  return `projects/${APP.DLP_PROJECT_ID}/locations/${APP.DLP_LOCATION}`;
}
