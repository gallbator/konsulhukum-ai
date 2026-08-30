import { getAdapter } from "@/lib/ingestion/registry";
import { ingestOneDocument } from "@/lib/ingestion/ingestOne";
import { getOrCreateSource } from "@/lib/db/queries/sources";
import { getRelevantChunksInDocument, type RetrievedChunk } from "@/lib/rag/retrieve";
import {
  buildPeraturanGoIdDetailUrl,
  PERATURAN_GO_ID_CATEGORIES,
  type PeraturanGoIdCategory,
} from "@/lib/ingestion/sources/peraturanGoId";
import type { RawDocumentRef } from "@/lib/ingestion/types";

export interface LiveLookupResult {
  found: boolean;
  title?: string;
  chunks: RetrievedChunk[];
  error?: string;
}

/**
 * Called from the chat route's `lookupRegulation` tool (see
 * app/api/chat/route.ts) when the model names a specific UU/PP/Perpres that
 * isn't in the local corpus yet. Fetches it from peraturan.go.id and ingests
 * it for real (same pipeline as the batch adapter — see ingestOneDocument),
 * so it's available for every future question too, not just this turn's —
 * then returns only the chunks relevant to `question`, not the whole law.
 */
export async function lookupAndIngestRegulation(
  category: string,
  number: string,
  year: number,
  question: string
): Promise<LiveLookupResult> {
  if (!PERATURAN_GO_ID_CATEGORIES.includes(category as PeraturanGoIdCategory)) {
    return {
      found: false,
      chunks: [],
      error: `Jenis dokumen "${category}" tidak didukung untuk pencarian langsung (hanya uu, pp, perpres).`,
    };
  }
  const cat = category as PeraturanGoIdCategory;

  const adapter = getAdapter(`peraturan-go-id-${cat}`);
  const source = await getOrCreateSource({ key: adapter.key, name: adapter.name, adapterKey: adapter.key });

  const url = buildPeraturanGoIdDetailUrl(cat, number, year);
  const ref: RawDocumentRef = {
    externalId: url,
    url,
    metadataHint: { number, year },
  };

  try {
    const outcome = await ingestOneDocument(adapter, source.id, ref);
    const result = await getRelevantChunksInDocument(outcome.documentId, question);
    if (!result || result.chunks.length === 0) {
      return { found: false, chunks: [], error: "Dokumen ditemukan tapi tidak berhasil diproses menjadi teks yang bisa dibaca." };
    }
    return { found: true, title: result.title, chunks: result.chunks };
  } catch (err) {
    console.error("[lookupAndIngestRegulation] failed", { category, number, year, err });
    return {
      found: false,
      chunks: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
