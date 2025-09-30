// app/api/deidentify/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { Readable } from "node:stream";
import { DlpServiceClient } from "@google-cloud/dlp";
import { verifyIdToken } from "@/lib/firebaseAdmin";
import { makeUserDrive } from "@/lib/drive";
import { buildDeidentifyConfig, INSPECT_CONFIG } from "@/lib/dlpPolicy";
import { APP } from "@/config/app";
import { bufferToUtf8Chunks } from "@/utils/chunker";
import { logger, safeError, timeit } from "@/utils/logger";
import type { DeidentifyRequestBody, DeidentifyResponse } from "@/types";
import { logDeidentify } from "@/lib/firestore";

/* ---------- helpers (typed) ---------- */
function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function sanitizePrivateKey(raw: string): string {
  let k = raw.trim();
  if (
    (k.startsWith('"') && k.endsWith('"')) ||
    (k.startsWith("'") && k.endsWith("'")) ||
    (k.startsWith("`") && k.endsWith("`"))
  ) {
    k = k.slice(1, -1);
  }
  return k.replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n").replace(/\r\n/g, "\n");
}

function makeAdminDlp(): DlpServiceClient {
  const projectId = requireEnv("DLP_PROJECT_ID");
  const client_email = requireEnv("GCP_CLIENT_EMAIL");
  const private_key = sanitizePrivateKey(requireEnv("GCP_PRIVATE_KEY"));
  return new DlpServiceClient({ projectId, credentials: { client_email, private_key } });
}

function dlpParent(): string {
  return `projects/${requireEnv("DLP_PROJECT_ID")}/locations/${requireEnv("DLP_LOCATION")}`;
}
/* ------------------------------------- */

export async function POST(req: NextRequest): Promise<NextResponse> {
  // API auth (Firebase ID token)
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized: Missing or invalid Bearer token" }, { status: 401 });
  }
  const idToken = authHeader.slice("Bearer ".length);

  // Drive auth (user OAuth token with drive.file)
  const googleToken = req.headers.get("x-google-access-token");
  if (!googleToken) {
    return NextResponse.json({ error: "Missing Google Drive access token" }, { status: 401 });
  }

  const log = logger.child({ route: "deidentify" });

  try {
    const decoded = await verifyIdToken(idToken);

    const bodyJson = (await req.json()) as DeidentifyRequestBody;
    if (!bodyJson?.fileId) {
      return NextResponse.json({ error: "fileId required" }, { status: 400 });
    }
    if (bodyJson.method && bodyJson.method !== "mask") {
      return NextResponse.json({ error: "FPE is disabled; use method: 'mask'." }, { status: 400 });
    }

    const { fileId } = bodyJson;

    // Clients
    const drive = await makeUserDrive(googleToken);
    const dlp = makeAdminDlp();
    const parent = dlpParent();

    // Download file bytes
    const { data } = await drive.files.get(
      { fileId, alt: "media" },
      { responseType: "arraybuffer" }
    );
    const buf = Buffer.from(data as ArrayBuffer);

    // Prepare DLP
    const chunks = bufferToUtf8Chunks(buf, APP.DLP_CHUNK_BYTES);
    const deidentifyConfig = buildDeidentifyConfig(); // masking only
    const outBuffers: Buffer[] = [];
    const start = Date.now();

    type DeidReturn = Awaited<ReturnType<DlpServiceClient["deidentifyContent"]>>;

    await timeit(
      "dlp_deidentify",
      async () => {
        for (const piece of chunks) {
          if (!piece) continue;

          // Use UTF-8 string channel for plain text
          const resp: DeidReturn = await dlp.deidentifyContent({
            parent,
            inspectConfig: INSPECT_CONFIG,
            deidentifyConfig,
            item: { value: piece }, // <— string input preferred for text
          });

          const res = resp[0];
          const value: string = (res?.item?.value ?? piece); // defensive fallback
          outBuffers.push(Buffer.from(value, "utf8"));
        }
      },
      { fileId, method: "mask", parts: chunks.length }
    );

    // Concatenate and upload sanitized content
    const resultBuf = outBuffers.length ? Buffer.concat(outBuffers) : buf; // fallback to original if nothing processed
    const newName = `deid-${Date.now()}.txt`;
    const parents = APP.DRIVE_PARENT_FOLDER_ID ? [APP.DRIVE_PARENT_FOLDER_ID] : undefined;

    const bodyStream = Readable.from(resultBuf);

    const upload = await drive.files.create({
      requestBody: { name: newName, parents },
      media: { mimeType: "text/plain", body: bodyStream },
      fields: "id,name,webViewLink,webContentLink,parents",
      supportsAllDrives: true,
    });

    const latencyMs = Date.now() - start;

    await logDeidentify({
      uid: decoded.uid,
      fileId,
      method: "mask",
      sanitizedFileId: String(upload.data.id),
      latencyMs,
    });

    const payload: DeidentifyResponse = {
      sanitizedFileId: String(upload.data.id),
      name: upload.data.name ?? undefined,
      download: upload.data.webContentLink ?? undefined, // <— UI will show the button again
    };

    log.info("deid_ok", { fileId, outId: upload.data.id, ms: latencyMs });
    return NextResponse.json(payload);
  } catch (e: unknown) {
    log.error("deid_failed", { error: safeError(e) });
    return NextResponse.json({ error: "De-identification failed" }, { status: 500 });
  }
}
