import process from "node:process";

process.loadEnvFile(".env.local");

import http from "node:http";
import { google } from "googleapis";

/**
 * One-time local authorization flow to get a long-lived refresh token for
 * uploading to Google Drive AS the developer's own personal account (a
 * service account can't be used here — it has no Drive storage quota of its
 * own on a personal, non-Workspace Google account; see lib/storage/googleDrive.ts).
 *
 * Run once: npx tsx scripts/googleDriveAuth.ts
 * Requires GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET already in .env.local.
 *
 * For a "Web application"-type OAuth client (unlike "Desktop app", which gets
 * automatic loopback-port matching from Google), the redirect URI must match
 * EXACTLY what's registered in Cloud Console — hence a fixed port here rather
 * than an OS-assigned random one. Add `http://localhost:53682` (this exact
 * string) as an Authorized redirect URI on the client before running this.
 */
const CALLBACK_PORT = 53682;

async function main() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.error("Isi dulu GOOGLE_OAUTH_CLIENT_ID dan GOOGLE_OAUTH_CLIENT_SECRET di .env.local sebelum menjalankan ini.");
    process.exit(1);
  }

  const server = http.createServer();
  await new Promise<void>((resolve) => server.listen(CALLBACK_PORT, "127.0.0.1", resolve));
  const redirectUri = `http://localhost:${CALLBACK_PORT}`;

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent", // force a refresh_token even if this Google account has authorized this app before
    scope: ["https://www.googleapis.com/auth/drive.file"],
  });

  console.log("\nBuka URL berikut di browser, login dengan akun Google yang mau dipakai untuk penyimpanan,");
  console.log("lalu klik Izinkan/Allow (kalau muncul peringatan \"aplikasi belum diverifikasi\", klik Advanced -> lanjutkan, itu wajar untuk aplikasi milik sendiri):\n");
  console.log(authUrl + "\n");
  console.log("Menunggu otorisasi...\n");

  const code = await new Promise<string>((resolve, reject) => {
    server.on("request", (req, res) => {
      const url = new URL(req.url ?? "/", redirectUri);
      const code = url.searchParams.get("code");
      const error = url.searchParams.get("error");
      res.end(error ? "Gagal otorisasi. Boleh tutup tab ini dan cek terminal." : "Berhasil! Boleh tutup tab ini dan kembali ke terminal.");
      if (error) reject(new Error(error));
      else if (code) resolve(code);
    });
  });
  server.close();

  const { tokens } = await oauth2Client.getToken(code);
  if (!tokens.refresh_token) {
    console.error(
      "\nTidak dapat refresh_token. Kemungkinan akun ini sudah pernah mengotorisasi aplikasi ini sebelumnya tanpa 'prompt=consent'."
    );
    console.error("Coba cabut akses aplikasi ini dulu di https://myaccount.google.com/permissions lalu ulangi.");
    process.exit(1);
  }

  console.log("\nBerhasil! Simpan baris berikut ke .env.local:\n");
  console.log(`GOOGLE_OAUTH_REFRESH_TOKEN=${tokens.refresh_token}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
