// app/api/scan/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/firebaseAdmin";
import { makeUserDrive } from "@/lib/drive";
import { INSPECT_CONFIG } from "@/lib/dlpPolicy";
import { APP } from "@/config/app";
import { bufferToUtf8Chunks } from "@/utils/chunker";
import { logger, safeError, timeit } from "@/utils/logger";
import type { ScanRequestBody, ScanResponse } from "@/types";
import { logScan } from "@/lib/firestore";
import { DlpServiceClient } from "@google-cloud/dlp";

/* ---------- helpers to force DLP to use Firebase Admin service account ---------- */
function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}
function sanitizePrivateKey(raw: string) {
  let k = raw.trim();
  if ((k.startsWith('"') && k.endsWith('"')) || (k.startsWith("'") && k.endsWith("'")) || (k.startsWith("`") && k.endsWith("`"))) {
    k = k.slice(1, -1);
  }
  return k.replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n").replace(/\r\n/g, "\n");
}
function makeAdminDlp() {
  const projectId = requireEnv("DLP_PROJECT_ID");
  const client_email = requireEnv("GCP_CLIENT_EMAIL");
  const private_key = sanitizePrivateKey(requireEnv("GCP_PRIVATE_KEY"));
  return new DlpServiceClient({ projectId, credentials: { client_email, private_key } });
}
function dlpParent() {
  const projectId = requireEnv("DLP_PROJECT_ID");
  const location = requireEnv("DLP_LOCATION"); // e.g. "global"
  return `projects/${projectId}/locations/${location}`;
}
/* ------------------------------------------------------------------------------- */

export async function POST(req: NextRequest) {
  // API auth (Firebase ID token)
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized: Missing or invalid Bearer token" }, { status: 401 });
  }
  const idToken = authHeader.slice("Bearer ".length);

  // Drive auth (user token with drive.file)
  const googleToken = req.headers.get("x-google-access-token");
  if (!googleToken) {
    return NextResponse.json({ error: "Missing Google Drive access token" }, { status: 401 });
  }

  const log = logger.child({ route: "scan" });
  try {
    const decoded = await verifyIdToken(idToken);
    const body = await req.json() as ScanRequestBody;
    const { fileId } = body;
    if (!fileId) return NextResponse.json({ error: "fileId required" }, { status: 400 });

    // Clients
    const drive = await makeUserDrive(googleToken);
    const dlp = makeAdminDlp();
    const parent = dlpParent();

    // Download file bytes from Drive
    const response = await drive.files.get(
      { fileId, alt: "media" },
      { responseType: "arraybuffer" }
    );
    const buf = Buffer.from(response.data as ArrayBuffer);

    // Chunk and inspect
    const chunks = bufferToUtf8Chunks(buf, APP.DLP_CHUNK_BYTES);
    const findings: Record<string, number> = {};
    const start = Date.now();

    await timeit("dlp_inspect", async () => {
      for (const piece of chunks) {
        if (!piece) continue;
        const resp = await dlp.inspectContent({
          parent,
          inspectConfig: INSPECT_CONFIG,
          item: { byteItem: { data: Buffer.from(piece, "utf8") } },
        });
        const res = resp[0] as { result?: { findings?: Array<{ infoType?: { name?: string } }> } };
        for (const f of res?.result?.findings ?? []) {
          const t = f.infoType?.name || "UNKNOWN";
          findings[t] = (findings[t] || 0) + 1;
        }
      }
    }, { fileId, parts: chunks.length });

    const latencyMs = Date.now() - start;
    await logScan({ uid: decoded.uid, fileId, findings, latencyMs });

    const payload: ScanResponse = { findings, chunks: chunks.length };
    log.info("scan_ok", { fileId, chunks: chunks.length, ms: latencyMs });
    return NextResponse.json(payload);
  } catch (e) {
    log.error("scan_error", safeError(e));
    return NextResponse.json({ error: safeError(e) }, { status: 500 });
  }
}