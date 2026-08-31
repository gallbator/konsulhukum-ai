"use client";

import { useCallback, useEffect, useState } from "react";
import type { LegalDocumentSummary } from "@/types";

export interface UploadDocumentInput {
  file: File;
  sourceType: string;
  title: string;
  number: string;
  year: string;
}

export function useDocuments() {
  const [documents, setDocuments] = useState<LegalDocumentSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch("/api/documents");
    if (!res.ok) return;
    const data = await res.json();
    setDocuments(data.documents);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    // Intentional: fetching the initial list from the server on mount, an external system by definition.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const upload = useCallback(
    async (
      input: UploadDocumentInput
    ): Promise<{ ok: true; status: "ingested" | "skipped" } | { ok: false; error: string }> => {
      // 1. Get a short-lived Drive access token (small request to our server).
      const tokenRes = await fetch("/api/documents/drive-token", { method: "POST" });
      const tokenData = await tokenRes.json().catch(() => ({}));
      if (!tokenRes.ok) {
        return { ok: false, error: tokenData.error ?? "Gagal menyiapkan akses Google Drive." };
      }
      const { accessToken, folderId } = tokenData;

      // 2. From the BROWSER, open a Drive upload session — this has to be
      // the browser's own request (not our server's) so Google's CORS grant
      // for the session is tied to this page's real origin, not our
      // server's. See lib/storage/googleDrive.ts for the full reasoning.
      const driveFilename = `${input.sourceType}-${input.number}-${input.year}.pdf`.replace(/[\\/]/g, "-");
      const sessionRes = await fetch(
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,webViewLink",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json; charset=UTF-8",
            "X-Upload-Content-Type": "application/pdf",
          },
          body: JSON.stringify({ name: driveFilename, parents: [folderId] }),
        }
      );
      if (!sessionRes.ok) {
        return { ok: false, error: "Gagal membuat sesi upload ke Google Drive." };
      }
      const uploadUrl = sessionRes.headers.get("Location");
      if (!uploadUrl) {
        return { ok: false, error: "Google Drive tidak mengembalikan URL sesi upload." };
      }

      // 3. PUT the actual file straight to Google Drive — never through our
      // own server, so Vercel's request body size limit never applies to it.
      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/pdf" },
        body: input.file,
      });
      const putData = await putRes.json().catch(() => ({}));
      if (!putRes.ok || !putData.id) {
        return { ok: false, error: "Gagal mengupload file ke Google Drive." };
      }

      // 4. Tell our server which Drive file to process (small JSON again).
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driveFileId: putData.id,
          sourceType: input.sourceType,
          title: input.title,
          number: input.number,
          year: input.year,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { ok: false, error: data.error ?? "Gagal memproses dokumen." };
      }
      await load();
      return { ok: true, status: data.status === "skipped" ? "skipped" : "ingested" };
    },
    [load]
  );

  const remove = useCallback(async (id: string) => {
    const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
    if (!res.ok) return;
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  }, []);

  return { documents, isLoading, upload, remove };
}
