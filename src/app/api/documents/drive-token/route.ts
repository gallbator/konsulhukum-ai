import { NextResponse } from "next/server";
import { getBrowserUploadCredentials } from "@/lib/storage/googleDrive";

// Issues a short-lived Drive access token for the browser to upload directly
// with (see lib/storage/googleDrive.ts for why this can't go through our own
// API instead). Never returns the long-lived refresh token.
export async function POST() {
  try {
    const credentials = await getBrowserUploadCredentials();
    return NextResponse.json(credentials);
  } catch (err) {
    console.error("[api/documents/drive-token] failed", err);
    return NextResponse.json({ error: "Gagal menyiapkan akses Google Drive." }, { status: 502 });
  }
}
