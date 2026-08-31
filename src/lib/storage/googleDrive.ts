import { google } from "googleapis";
import { Readable } from "node:stream";

/**
 * Uploads as the developer's own personal Google account via OAuth (a
 * refresh token obtained once through scripts/googleDriveAuth.ts) — NOT a
 * service account. A service account has no Drive storage quota of its own,
 * and on a personal (non-Workspace) Google account there's no way to grant it
 * one either — see scripts/googleDriveAuth.ts for how the refresh token below
 * was obtained.
 */
function getDriveClient() {
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
  return google.drive({ version: "v3", auth });
}

export interface DriveUploadResult {
  fileId: string;
  webViewLink: string;
}

export async function uploadPdfToDrive(bytes: Uint8Array, filename: string): Promise<DriveUploadResult> {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!folderId) {
    throw new Error("GOOGLE_DRIVE_FOLDER_ID belum diisi.");
  }
  const drive = getDriveClient();
  const res = await drive.files.create({
    requestBody: {
      name: filename,
      parents: [folderId],
      mimeType: "application/pdf",
    },
    media: {
      mimeType: "application/pdf",
      body: Readable.from(Buffer.from(bytes)),
    },
    fields: "id, webViewLink",
  });
  if (!res.data.id || !res.data.webViewLink) {
    throw new Error("Google Drive tidak mengembalikan file ID/link setelah upload.");
  }
  return { fileId: res.data.id, webViewLink: res.data.webViewLink };
}
