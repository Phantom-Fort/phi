// lib/drive.ts
import { google, drive_v3 } from "googleapis";
import https from "node:https";

/** Single shared HTTPS agent (keep-alive + IPv4 helps on some Windows/VPN setups) */
const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 20,
  // @ts-expect-error Node typings don't expose `family` here; it's supported at runtime
  family: 4,
});

/** Apply agent + timeout to all googleapis requests */
google.options({ httpAgent: httpsAgent, timeout: 30_000 });

/**
 * USER-OAUTH Drive client (acts as the signed-in user; uses their storage/quota).
 * Pass the Google OAuth access token acquired client-side with scope `drive.file`.
 */
export async function makeUserDrive(accessToken: string): Promise<drive_v3.Drive> {
  if (!accessToken) throw new Error("makeUserDrive: missing access token");
  const oauth2 = new google.auth.OAuth2();
  oauth2.setCredentials({ access_token: accessToken });
  return google.drive({ version: "v3", auth: oauth2 });
}
