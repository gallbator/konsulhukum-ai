import type { LegalSourceAdapter, RawDocumentRef } from "@/lib/ingestion/types";
import { chunkLegalText, type Chunk } from "@/lib/chunking/legalChunker";
import { chunkGenericText } from "@/lib/chunking/genericChunker";
import { embedTexts } from "@/lib/ai/embeddings";
import { sha256 } from "@/lib/utils/checksum";
import { deleteChunksForDocument, findLatestDocument, insertChunks, insertDocument } from "@/lib/db/queries/documents";

function chooseChunker(sourceType: string) {
  return sourceType === "putusan" ? chunkGenericText : chunkLegalText;
}

// Real PDFs occasionally defeat the "Pasal N" splitter entirely (odd layout,
// a pasal with an unusually long body) and fall back to one giant chunk —
// seen in practice against peraturan.go.id, where it blew past the embedding
// model's ~8192-token input limit. Split anything oversized as a safety net,
// keeping the parent chunk's metadata (bab/pasal) on every piece.
const MAX_CHUNK_CHARS = 6000;

function enforceMaxChunkSize(chunks: Chunk[]): Chunk[] {
  return chunks.flatMap((chunk) => {
    if (chunk.text.length <= MAX_CHUNK_CHARS) return [chunk];
    return chunkGenericText(chunk.text, 900, 100).map((sub) => ({
      text: sub.text,
      metadata: chunk.metadata,
    }));
  });
}

export type IngestOneOutcome =
  | { status: "skipped"; documentId: string }
  | { status: "ingested"; documentId: string; chunkCount: number };

/**
 * Fetch -> dedup by checksum -> chunk -> embed -> store, for a single
 * document. Shared by the batch job (runJob.ts) and the on-demand live
 * lookup a chat turn can trigger (lib/rag/liveLookup.ts) — same correctness
 * guarantees (retry-safe on embedding failure, versions on content change)
 * either way.
 */
export async function ingestOneDocument(
  adapter: LegalSourceAdapter,
  sourceId: string,
  ref: RawDocumentRef
): Promise<IngestOneOutcome> {
  const content = await adapter.fetchDocument(ref);
  const metadata = await adapter.parseMetadata(content, ref);
  const checksum = sha256(content.text);

  const existing = await findLatestDocument(metadata.sourceType, metadata.number, metadata.year);
  if (existing && existing.checksum === checksum) {
    return { status: "skipped", documentId: existing.id };
  }

  // Chunk + embed BEFORE writing the document row: if embedding fails (e.g.
  // a chunk too long for the model's input limit), nothing is written at
  // all, so a retry doesn't get stuck skipping a document with 0 chunks.
  const chunks = enforceMaxChunkSize(chooseChunker(metadata.sourceType)(content.text));
  const embeddings = await embedTexts(chunks.map((c) => c.text));

  const document = await insertDocument({
    sourceId,
    metadata,
    rawText: content.text,
    checksum,
    version: existing ? existing.version + 1 : 1,
    previousVersionId: existing?.id,
  });

  if (existing) {
    // Superseded: drop its chunks so retrieval only ever sees the latest version.
    await deleteChunksForDocument(existing.id);
  }

  await insertChunks(document.id, chunks, embeddings);
  return { status: "ingested", documentId: document.id, chunkCount: chunks.length };
}
