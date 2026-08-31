"use client";

import { useState } from "react";
import type { LegalDocumentSummary } from "@/types";
import { ExternalLinkIcon, FileTextIcon, TrashIcon } from "@/components/ui/icons";

const SOURCE_TYPE_LABELS: Record<string, string> = {
  uu: "UU",
  pp: "PP",
  perpres: "Perpres",
  putusan: "Putusan",
};

interface DocumentListItemProps {
  document: LegalDocumentSummary;
  onDelete: (id: string) => Promise<void>;
}

export function DocumentListItem({ document, onDelete }: DocumentListItemProps) {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  if (isConfirmingDelete) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-md bg-surface-hover px-3 py-2.5 text-sm">
        <span className="truncate text-foreground">Hapus &quot;{document.title}&quot;?</span>
        <span className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={async () => {
              setIsConfirmingDelete(false);
              await onDelete(document.id);
            }}
            className="rounded px-2 py-1 text-xs font-medium text-red-500 hover:bg-border"
          >
            Hapus
          </button>
          <button
            type="button"
            onClick={() => setIsConfirmingDelete(false)}
            className="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-border"
          >
            Batal
          </button>
        </span>
      </div>
    );
  }

  return (
    <div className="group flex items-center justify-between gap-2 rounded-md px-3 py-2.5 text-sm hover:bg-surface-hover">
      <div className="flex min-w-0 items-center gap-2.5">
        <FileTextIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <p className="truncate text-foreground">{document.title}</p>
          <p className="truncate text-xs text-muted-foreground">
            {SOURCE_TYPE_LABELS[document.sourceType] ?? document.sourceType}
            {document.number ? ` · No. ${document.number}` : ""}
            {document.year ? `/${document.year}` : ""}
            {" · "}
            {document.chunkCount} potongan
          </p>
        </div>
      </div>
      <span className="flex shrink-0 items-center gap-0.5 opacity-0 group-hover:opacity-100">
        {document.urlAsli && (
          <a
            href={document.urlAsli}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Lihat file asli di Google Drive"
            title="Lihat file asli di Google Drive"
            className="rounded p-1 text-muted-foreground hover:bg-border"
          >
            <ExternalLinkIcon className="h-3.5 w-3.5" />
          </a>
        )}
        <button
          type="button"
          aria-label="Hapus dokumen"
          onClick={() => setIsConfirmingDelete(true)}
          className="rounded p-1 text-muted-foreground hover:bg-border"
        >
          <TrashIcon className="h-3.5 w-3.5" />
        </button>
      </span>
    </div>
  );
}
