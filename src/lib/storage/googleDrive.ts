import { google } from "googleapis";

/**
 * Uploads as the developer's own personal Google account via OAuth (a
 * refresh token obtained once through scripts/googleDriveAuth.ts) — NOT a
 * service account. A service account has no Drive storage quota of its own,
 * and on a personal (non-Workspace) Google account there's no way to grant it
 * one either — see scripts/googleDriveAuth.ts for how the refresh token below
 * was obtained.
 */
function getOAuthClient() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Google Drive belum dikonfigurasi (GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET / GOOGLE_OAUTH_REFRESH_TOKEN kosong)."
    );
  }
  const auth = new google.auth.OAuth2(clientId, clientSecret);
  auth.setCredentials({ refresh_token: refreshToken });
  return auth;
}

function getDriveClient() {
  return google.drive({ version: "v3", auth: getOAuthClient() });
}

/**
 * A short-lived (~1h) access token for the browser to call the Drive API
 * directly with — never the long-lived refresh token above. This is
 * Vercel's own recommended pattern for large uploads ("your function
 * generates access tokens, but the file never passes through it"): the
 * ~4.5MB request body limit applies to every kind of Vercel Function
 * (Node.js or Edge, streamed or not), so a PDF of any real size cannot be
 * proxied through our own API at all — it must go straight from the browser
 * to Google.
 *
 * The browser (not this server) must be the one to START the Drive upload
 * session too, not just perform the PUT: Google ties the
 * Access-Control-Allow-Origin it grants a resumable session to the Origin
 * of whichever request created that session. A session created server-side
 * carries no real browser Origin, so Google refuses CORS on every request
 * to it afterwards — confirmed by hitting exactly that wall in testing.
 */
export async function getBrowserUploadCredentials(): Promise<{ accessToken: string; folderId: string }> {
  const auth = getOAuthClient();
  const { token } = await auth.getAccessToken();
  if (!token) throw new Error("Gagal mendapatkan access token Google.");
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!folderId) throw new Error("GOOGLE_DRIVE_FOLDER_ID belum diisi.");
  return { accessToken: token, folderId };
}

/**
 * Fetches a Drive file's bytes server-side (an outbound request the function
 * makes itself, not an inbound one it receives — not subject to the same
 * payload-size limit) so it can still be run through the normal PDF text
 * extraction / chunking / embedding pipeline after the browser has already
 * uploaded it straight to Drive.
 */
export async function downloadPdfFromDrive(fileId: string): Promise<{ bytes: Uint8Array; webViewLink: string }> {
  const drive = getDriveClient();
  const [metaRes, contentRes] = await Promise.all([
    drive.files.get({ fileId, fields: "webViewLink" }),
    drive.files.get({ fileId, alt: "media" }, { responseType: "arraybuffer" }),
  ]);
  const webViewLink = metaRes.data.webViewLink;
  if (!webViewLink) throw new Error("Tidak bisa mendapatkan link file dari Drive.");
  return { bytes: new Uint8Array(contentRes.data as ArrayBuffer), webViewLink };
}
