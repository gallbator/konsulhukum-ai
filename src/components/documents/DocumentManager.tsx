"use client";

import { useDocuments } from "@/hooks/useDocuments";
import { DocumentUploadForm } from "@/components/documents/DocumentUploadForm";
import { DocumentListItem } from "@/components/documents/DocumentListItem";

export function DocumentManager() {
  const { documents, isLoading, upload, remove } = useDocuments();

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Dokumen</h1>
          <p className="text-sm text-muted-foreground">
            Upload PDF putusan atau peraturan yang belum tersedia di sistem — hasilnya langsung bisa dirujuk
            sebagai sumber jawaban di percakapan manapun.
          </p>
        </div>

        <DocumentUploadForm onUpload={upload} />

        <div className="flex flex-col gap-1">
          <h2 className="px-1 text-sm font-medium text-muted-foreground">
            {isLoading ? "Memuat..." : `${documents.length} dokumen tersimpan`}
          </h2>
          <div className="flex flex-col gap-0.5">
            {!isLoading && documents.length === 0 && (
              <p className="px-3 py-2 text-sm text-muted-foreground">Belum ada dokumen yang diupload.</p>
            )}
            {documents.map((doc) => (
              <DocumentListItem key={doc.id} document={doc} onDelete={remove} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
