import { embedQuery } from "@/lib/ai/embeddings";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface RetrievedChunk {
  chunkId: string;
  documentId: string;
  chunkText: string;
  chunkIndex: number;
  metadata: { bab?: string; pasal?: string };
  title: string;
  number: string | null;
  year: number | null;
  sourceType: string;
  urlAsli: string | null;
  similarity: number;
}

interface MatchChunkRow {
  chunk_id: string;
  document_id: string;
  chunk_text: string;
  chunk_index: number;
  metadata: { bab?: string; pasal?: string };
  title: string;
  number: string | null;
  year: number | null;
  source_type: string;
  url_asli: string | null;
  similarity: number;
}

const PRIMARY_MATCH_THRESHOLD = 0.3;
// Below this, a chunk isn't even worth surfacing as "related" — cosine
// similarity is rarely exactly 0, so without a floor a totally unrelated
// question (e.g. asking about a recipe) would still surface a "related"
// document that isn't actually related to anything.
const RELATED_MATCH_THRESHOLD = 0.15;
const RELATED_MATCH_COUNT = 3;

function toRetrievedChunk(row: MatchChunkRow): RetrievedChunk {
  return {
    chunkId: row.chunk_id,
    documentId: row.document_id,
    chunkText: row.chunk_text,
    chunkIndex: row.chunk_index,
    metadata: row.metadata,
    title: row.title,
    number: row.number,
    year: row.year,
    sourceType: row.source_type,
    urlAsli: row.url_asli,
    similarity: row.similarity,
  };
}

async function matchChunks(
  embedding: number[],
  matchCount: number,
  matchThreshold: number
): Promise<RetrievedChunk[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.rpc("match_document_chunks", {
    query_embedding: embedding,
    match_count: matchCount,
    match_threshold: matchThreshold,
  });
  if (error) throw error;
  return (data as MatchChunkRow[]).map(toRetrievedChunk);
}

export async function retrieveRelevantChunks(
  query: string,
  opts: { matchCount?: number; matchThreshold?: number } = {}
): Promise<RetrievedChunk[]> {
  const embedding = await embedQuery(query);
  return matchChunks(embedding, opts.matchCount ?? 8, opts.matchThreshold ?? PRIMARY_MATCH_THRESHOLD);
}

export interface RetrievalResult {
  /** Confidently relevant — the model may answer from these directly. */
  primary: RetrievedChunk[];
  /** Below the confidence bar but still worth surfacing as "you might also want to check this" — never as a direct answer. Only populated when primary is empty. */
  related: RetrievedChunk[];
}

/**
 * When nothing clears the confidence bar, this looks a little further (a
 * lower threshold, capped small) so the assistant can point the user at
 * "closest available" documents instead of a flat refusal — while the prompt
 * (see buildGroundedSystemPrompt) still keeps the model from treating those
 * as a direct, confident answer.
 */
export async function retrieveWithFallback(query: string): Promise<RetrievalResult> {
  const embedding = await embedQuery(query);
  const primary = await matchChunks(embedding, 8, PRIMARY_MATCH_THRESHOLD);
  if (primary.length > 0) {
    return { primary, related: [] };
  }
  const related = await matchChunks(embedding, RELATED_MATCH_COUNT, RELATED_MATCH_THRESHOLD);
  return { primary: [], related };
}

/**
 * Top-k chunks from one already-known document, ranked against `query` —
 * NOT the whole document. Used by the lookupRegulation tool
 * (lib/rag/liveLookup.ts) right after it ingests a document a chat turn
 * asked for by name: a law can run to hundreds of pasal, and handing the
 * model every single one (rather than the handful actually relevant to the
 * question) would blow past useful context size and spam the citation list
 * with the document's entire table of contents.
 */
export async function getRelevantChunksInDocument(
  documentId: string,
  query: string,
  matchCount = 8
): Promise<{ title: string; chunks: RetrievedChunk[] } | null> {
  const { data: doc, error: docError } = await createSupabaseServerClient()
    .from("legal_documents")
    .select("title")
    .eq("id", documentId)
    .maybeSingle();
  if (docError) throw docError;
  if (!doc) return null;

  const embedding = await embedQuery(query);
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.rpc("match_document_chunks_in_document", {
    target_document_id: documentId,
    query_embedding: embedding,
    match_count: matchCount,
  });
  if (error) throw error;

  return { title: doc.title, chunks: (data as MatchChunkRow[]).map(toRetrievedChunk) };
}
