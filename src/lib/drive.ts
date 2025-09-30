// src/lib/drive.ts
import { google, drive_v3 } from "googleapis";
import https from "node:https";
import dns from "node:dns";
import type { LookupFunction } from "node:net";

/** IPv4-preferred DNS resolution (matches net.LookupFunction signature) */
const lookupV4: LookupFunction = (
  hostname,
  options,
  callback?
): void => {
  // Support both (host, cb) and (host, options, cb)
  const cb =
    typeof options === "function"
      ? options
      : (callback as (err: NodeJS.ErrnoException | null, address: string, family: number) => void);

  // Force IPv4; `all: false` => single-address callback shape
  dns.lookup(hostname, { family: 4, all: false }, cb);
};

/** Shared HTTPS agent (keep-alive + IPv4 via custom lookup) */
const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 20,
  lookup: lookupV4,
});

/** Apply agent + timeout to all googleapis requests */
google.options({ agent: httpsAgent, timeout: 30_000 });

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
