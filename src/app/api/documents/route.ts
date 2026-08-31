import { NextResponse } from "next/server";
import { listDocuments } from "@/lib/db/queries/documents";
import { getOrCreateSource } from "@/lib/db/queries/sources";
import { ingestExtractedDocument } from "@/lib/ingestion/ingestOne";
import { extractPdfText } from "@/lib/utils/pdf";
import { downloadPdfFromDrive } from "@/lib/storage/googleDrive";

// GET reads no request-specific input (no searchParams/cookies/etc.), so
// Next.js would otherwise statically render/cache it — freezing the list at
// whatever it was on first request instead of reflecting new uploads/deletes.
export const dynamic = "force-dynamic";

// Downloading a large PDF back from Drive + parse/embedding every chunk can take a while.
export const maxDuration = 90;

const ALLOWED_SOURCE_TYPES = ["uu", "pp", "perpres", "putusan"];

export async function GET() {
  const documents = await listDocuments();
  return NextResponse.json({ documents });
}

// The browser has already uploaded the PDF straight to Drive (see
// /api/documents/init-upload) — this only ever receives small JSON, never
// the file itself, specifically to stay under Vercel's request body limit.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const driveFileId = String(body.driveFileId ?? "").trim();
  const sourceType = String(body.sourceType ?? "");
  const title = String(body.title ?? "").trim();
  const number = String(body.number ?? "").trim();
  const yearRaw = String(body.year ?? "").trim();

  if (!driveFileId) {
    return NextResponse.json({ error: "File belum berhasil diupload ke Google Drive." }, { status: 400 });
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

  let bytes: Uint8Array;
  let urlAsli: string;
  try {
    const downloaded = await downloadPdfFromDrive(driveFileId);
    bytes = downloaded.bytes;
    urlAsli = downloaded.webViewLink;
  } catch (err) {
    console.error("[api/documents] Drive download failed", err);
    return NextResponse.json({ error: "Gagal mengambil file dari Google Drive." }, { status: 502 });
  }

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

  const outcome = await ingestExtractedDocument(source.id, { sourceType, title, number, year, urlAsli }, rawText);
  return NextResponse.json(outcome, { status: 201 });
}
