import { NextResponse } from "next/server";
import { listDocuments } from "@/lib/db/queries/documents";
import { getOrCreateSource } from "@/lib/db/queries/sources";
import { ingestExtractedDocument } from "@/lib/ingestion/ingestOne";
import { extractPdfText } from "@/lib/utils/pdf";

// PDF fetch/parse + embedding of every chunk can take a while for a long document.
export const maxDuration = 90;

const ALLOWED_SOURCE_TYPES = ["uu", "pp", "perpres", "putusan"];

export async function GET() {
  const documents = await listDocuments();
  return NextResponse.json({ documents });
}

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file");
  const sourceType = String(form.get("sourceType") ?? "");
  const title = String(form.get("title") ?? "").trim();
  const number = String(form.get("number") ?? "").trim();
  const yearRaw = String(form.get("year") ?? "").trim();

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File PDF wajib diisi." }, { status: 400 });
  }
  if (!ALLOWED_SOURCE_TYPES.includes(sourceType)) {
    return NextResponse.json({ error: "Jenis dokumen tidak valid." }, { status: 400 });
  }
  if (!title || !number || !yearRaw) {
    return NextResponse.json({ error: "Judul, nomor, dan tahun wajib diisi." }, { status: 400 });
  }
  const year = Number(yearRaw);
  if (!Number.isInteger(year)) {
    return NextResponse.json({ error: "Tahun harus berupa angka." }, { status: 400 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  let rawText: string;
  try {
    rawText = await extractPdfText(bytes);
  } catch (err) {
    console.error("[api/documents] PDF parse failed", err);
    return NextResponse.json({ error: "Gagal membaca isi PDF. Pastikan file tidak rusak atau terenkripsi." }, { status: 422 });
  }
  if (!rawText.trim()) {
    return NextResponse.json({ error: "Tidak ada teks yang bisa diekstrak dari PDF ini (kemungkinan hasil scan tanpa OCR)." }, { status: 422 });
  }

  const source = await getOrCreateSource({
    key: "manual-upload",
    name: "Upload Manual",
    adapterKey: "manual-upload",
  });

  const outcome = await ingestExtractedDocument(source.id, { sourceType, title, number, year }, rawText);
  return NextResponse.json(outcome, { status: 201 });
}
