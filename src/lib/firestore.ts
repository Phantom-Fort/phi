// lib/firestore.ts
import { getApps, initializeApp, cert, App } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

const clientEmail = process.env.GCP_CLIENT_EMAIL!;
const privateKey = process.env.GCP_PRIVATE_KEY?.replace(/\\n/g, "\n")!;
const projectId = process.env.GCLOUD_PROJECT!;

let app: App | undefined;
if (!getApps().length) {
  app = initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}
const db = getFirestore();

export async function logScan(data: {
  uid: string;
  fileId: string;
  findings: Record<string, number>;
  latencyMs: number;
}) {
  const ref = db.collection("scans").doc();
  await ref.set({ ...data, createdAt: Timestamp.now() });
  return ref.id;
}

export async function logDeidentify(data: {
  uid: string;
  fileId: string;
  method: "mask";
  sanitizedFileId: string;
  latencyMs: number;
}) {
  const ref = db.collection("scans").doc();
  await ref.set({ ...data, createdAt: Timestamp.now() });
  return ref.id;
}
