"use client";

import { useRef, useState, type FormEvent } from "react";
import type { UploadDocumentInput } from "@/hooks/useDocuments";
import { UploadIcon } from "@/components/ui/icons";

interface DocumentUploadFormProps {
  onUpload: (
    input: UploadDocumentInput
  ) => Promise<{ ok: true; status: "ingested" | "skipped" } | { ok: false; error: string }>;
}

const SOURCE_TYPE_OPTIONS = [
  { value: "putusan", label: "Putusan Pengadilan" },
  { value: "uu", label: "Undang-Undang" },
  { value: "pp", label: "Peraturan Pemerintah" },
  { value: "perpres", label: "Peraturan Presiden" },
];

export function DocumentUploadForm({ onUpload }: DocumentUploadFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [sourceType, setSourceType] = useState(SOURCE_TYPE_OPTIONS[0].value);
  const [title, setTitle] = useState("");
  const [number, setNumber] = useState("");
  const [year, setYear] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Pilih file PDF terlebih dahulu.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    const result = await onUpload({ file, sourceType, title, number, year });

    setIsSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSuccess(
      result.status === "skipped"
        ? `"${title}" tidak ditambahkan sebagai dokumen baru — isinya identik dengan dokumen yang sudah tersimpan di sistem.`
        : `"${title}" berhasil diproses dan siap dirujuk di percakapan.`
    );
    setFile(null);
    setTitle("");
    setNumber("");
    setYear("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          File PDF
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="rounded-md border border-border bg-background px-2.5 py-2 text-sm file:mr-2 file:rounded file:border-0 file:bg-accent file:px-2 file:py-1 file:text-xs file:text-accent-foreground"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Jenis dokumen
          <select
            value={sourceType}
            onChange={(e) => setSourceType(e.target.value)}
            className="rounded-md border border-border bg-background px-2.5 py-2 text-sm outline-none"
          >
            {SOURCE_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Judul
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Contoh: Putusan Sengketa Tanah PN Jakarta Pusat"
            className="rounded-md border border-border bg-background px-2.5 py-2 text-sm outline-none"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Nomor
          <input
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder="Contoh: 123/Pdt.G/2023/PN.Jkt.Pst"
            className="rounded-md border border-border bg-background px-2.5 py-2 text-sm outline-none"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Tahun
          <input
            value={year}
            onChange={(e) => setYear(e.target.value)}
            inputMode="numeric"
            placeholder="Contoh: 2023"
            className="rounded-md border border-border bg-background px-2.5 py-2 text-sm outline-none"
          />
        </label>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {success && <p className="text-sm text-emerald-600 dark:text-emerald-400">{success}</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="flex w-fit items-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-foreground disabled:opacity-50"
      >
        <UploadIcon className="h-4 w-4" />
        {isSubmitting ? "Memproses..." : "Upload Dokumen"}
      </button>
    </form>
  );
}
