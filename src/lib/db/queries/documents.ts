import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { LegalDocumentMetadata } from "@/lib/ingestion/types";

export interface LegalDocumentRow {
  id: string;
  source_id: string | null;
  source_type: string;
  title: string;
  number: string | null;
  year: number | null;
  checksum: string | null;
  version: number;
}

export async function findLatestDocument(
  sourceType: string,
  number: string | null | undefined,
  year: number | null | undefined
): Promise<LegalDocumentRow | null> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("legal_documents")
    .select("*")
    .eq("source_type", sourceType)
    .eq("number", number ?? null)
    .eq("year", year ?? null)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as LegalDocumentRow | null;
}

export async function insertDocument(input: {
  sourceId: string;
  metadata: LegalDocumentMetadata;
  rawText: string;
  checksum: string;
  version: number;
  previousVersionId?: string;
}): Promise<LegalDocumentRow> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("legal_documents")
    .insert({
      source_id: input.sourceId,
      source_type: input.metadata.sourceType,
      title: input.metadata.title,
      number: input.metadata.number ?? null,
      year: input.metadata.year ?? null,
      tanggal_penetapan: input.metadata.tanggalPenetapan ?? null,
      url_asli: input.metadata.urlAsli ?? null,
      raw_text: input.rawText,
      checksum: input.checksum,
      status: "chunked",
      version: input.version,
      previous_version_id: input.previousVersionId ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as LegalDocumentRow;
}

export interface LegalDocumentSummary {
  id: string;
  sourceType: string;
  title: string;
  number: string | null;
  year: number | null;
  chunkCount: number;
  createdAt: string;
}

export async function listDocuments(): Promise<LegalDocumentSummary[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("legal_documents")
    .select("id, source_type, title, number, year, created_at, document_chunks(count)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (
    data as unknown as {
      id: string;
      source_type: string;
      title: string;
      number: string | null;
      year: number | null;
      created_at: string;
      document_chunks: { count: number }[];
    }[]
  ).map((row) => ({
    id: row.id,
    sourceType: row.source_type,
    title: row.title,
    number: row.number,
    year: row.year,
    chunkCount: row.document_chunks[0]?.count ?? 0,
    createdAt: row.created_at,
  }));
}

export async function deleteDocument(id: string): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("legal_documents").delete().eq("id", id);
  if (error) throw error;
}

export async function deleteChunksForDocument(documentId: string): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("document_chunks").delete().eq("document_id", documentId);
  if (error) throw error;
}

export async function insertChunks(
  documentId: string,
  chunks: { text: string; metadata: Record<string, unknown> }[],
  embeddings: number[][]
): Promise<void> {
  if (chunks.length === 0) return;
  const supabase = createSupabaseServerClient();
  const rows = chunks.map((chunk, i) => ({
    document_id: documentId,
    chunk_index: i,
    chunk_text: chunk.text,
    embedding: embeddings[i],
    metadata: chunk.metadata,
  }));
  const { error } = await supabase.from("document_chunks").insert(rows);
  if (error) throw error;
}
