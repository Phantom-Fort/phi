// app/api/upload/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { Readable } from "node:stream";
import { verifyIdToken } from "@/lib/firebaseAdmin";
import { makeUserDrive } from "@/lib/drive";
import { APP, MIME } from "@/config/app";
import { detectMime } from "@/utils/contentType";
import { logger, safeError } from "@/utils/logger";

export async function POST(req: NextRequest) {
  // API auth (Firebase ID token)
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized: Missing or invalid Bearer token" }, { status: 401 });
  }
  const idToken = authHeader.slice("Bearer ".length);

  // Drive auth (user OAuth access token with drive.file)
  const googleToken = req.headers.get("x-google-access-token");
  if (!googleToken) {
    return NextResponse.json({ error: "Missing Google Drive access token" }, { status: 401 });
  }

  const log = logger.child({ route: "upload" });
  try {
    const decoded = await verifyIdToken(idToken);
    const uid = decoded.uid;

    const filename = req.headers.get("x-filename") || `upload-${Date.now()}.dat`;
    const contentType = detectMime(filename, req.headers.get("content-type"));
    if (!MIME.ALLOWED.has(contentType)) {
      return NextResponse.json({ error: `Unsupported type: ${contentType}` }, { status: 415 });
    }

    const buf = Buffer.from(await req.arrayBuffer());
    if (buf.length > APP.MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: "File exceeds 20MB limit" }, { status: 413 });
    }

    const drive = await makeUserDrive(googleToken);
    const parents = APP.DRIVE_PARENT_FOLDER_ID ? [APP.DRIVE_PARENT_FOLDER_ID] : undefined;
    const bodyStream = Readable.from(buf);

    const res = await drive.files.create({
      requestBody: { name: filename, parents },
      media: { mimeType: contentType, body: bodyStream },
      fields: "id,name,webViewLink,parents",
      supportsAllDrives: true,
    });

    log.info("uploaded", { uid, fileId: res.data.id, parents: res.data.parents });
    return NextResponse.json({ fileId: res.data.id, name: res.data.name, view: res.data.webViewLink });
  } catch (e) {
    log.error("upload_failed", { error: safeError(e) });
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
