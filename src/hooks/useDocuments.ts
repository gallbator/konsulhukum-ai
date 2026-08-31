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
    ): Promise<{ ok: true; driveWarning: string | null } | { ok: false; error: string }> => {
      const form = new FormData();
      form.set("file", input.file);
      form.set("sourceType", input.sourceType);
      form.set("title", input.title);
      form.set("number", input.number);
      form.set("year", input.year);

      const res = await fetch("/api/documents", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { ok: false, error: data.error ?? "Gagal mengupload dokumen." };
      }
      await load();
      return { ok: true, driveWarning: data.driveError ?? null };
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
