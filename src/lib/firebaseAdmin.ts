// lib/firebaseAdmin.ts
import { initializeApp, cert, getApps, App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const clientEmail = process.env.GCP_CLIENT_EMAIL!;
const privateKey = process.env.GCP_PRIVATE_KEY?.replace(/\\n/g, "\n")!;
const projectId = process.env.GCLOUD_PROJECT!;

let app: App | undefined;
if (!getApps().length) {
  app = initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}

export async function verifyIdToken(idToken: string) {
  const decoded = await getAuth().verifyIdToken(idToken);
  return decoded; // { uid, email, ... }
}
