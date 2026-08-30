import type { RetrievedChunk } from "@/lib/rag/retrieve";
import type { Citation } from "@/types";

const MARKER_RE = /\[(\d+)\]/g;

function chunkToCitation(chunk: RetrievedChunk, relevance: Citation["relevance"]): Citation {
  return {
    documentId: chunk.documentId,
    sourceType: chunk.sourceType,
    title: chunk.title,
    number: chunk.number,
    year: chunk.year,
    pasal: chunk.metadata.pasal ?? null,
    url: chunk.urlAsli,
    similarity: chunk.similarity,
    relevance,
  };
}

function dedupeKey(chunk: RetrievedChunk): string {
  return `${chunk.documentId}:${chunk.metadata.pasal ?? ""}`;
}

/**
 * Only turns [n] markers the model actually wrote in its final answer into
 * citations — never trusts free-form model output as a source, only the
 * chunk metadata we already fetched from the DB ourselves.
 *
 * `primary` and `related` must be concatenated in the same order used to
 * build the prompt (see buildGroundedSystemPrompt) so [n] indexes line up.
 */
export function extractCitations(
  finalText: string,
  primary: RetrievedChunk[],
  related: RetrievedChunk[] = []
): Citation[] {
  const chunks = [...primary, ...related];
  const usedIndexes = new Set<number>();
  for (const match of finalText.matchAll(MARKER_RE)) {
    const n = Number(match[1]);
    if (n >= 1 && n <= chunks.length) usedIndexes.add(n);
  }

  const seenDocuments = new Set<string>();
  const citations: Citation[] = [];
  for (const n of [...usedIndexes].sort((a, b) => a - b)) {
    const chunk = chunks[n - 1];
    const key = dedupeKey(chunk);
    if (seenDocuments.has(key)) continue;
    seenDocuments.add(key);
    citations.push(chunkToCitation(chunk, n <= primary.length ? "direct" : "related"));
  }
  return citations;
}

const LIVE_LOOKUP_MARKER_RE = /\[T-([^\]\s]+)\]/g;
// Belt-and-suspenders: in practice the model sometimes reuses one [T-n] marker
// for every claim instead of varying it per pasal, even though it correctly
// writes "Pasal 20 UUPA", "Pasal 26 UUPA", etc. in the surrounding prose —
// observed dropping 6 of 7 genuinely-used pasal from the citation list.
// Bare "Pasal N" mentions catch what the marker missed.
const BARE_PASAL_RE = /Pasal\s+(\d+[A-Za-z]?)/gi;

/**
 * A lookupRegulation call can fetch an entire law (dozens/hundreds of pasal),
 * so — unlike [n], which points at one specific KONTEKS entry — citing every
 * chunk it returned would spam the citation list with the whole document's
 * table of contents. The tool asks the model to mark each claim with
 * [T-{pasal}] (see the tool description in app/api/chat/route.ts); this
 * matches those markers (plus any bare "Pasal N" mention, see above) back to
 * the specific chunks actually referenced. If neither appears at all, fall
 * back to citing everything fetched — better an over-long list than silently
 * dropping attribution for a document that genuinely was consulted.
 */
export function citationsFromLiveLookup(finalText: string, chunks: RetrievedChunk[], alreadyCited: Citation[]): Citation[] {
  const seen = new Set(alreadyCited.map((c) => `${c.documentId}:${c.pasal ?? ""}`));
  const markedPasal = new Set([
    ...[...finalText.matchAll(LIVE_LOOKUP_MARKER_RE)].map((m) => m[1]),
    ...[...finalText.matchAll(BARE_PASAL_RE)].map((m) => m[1]),
  ]);

  const relevantChunks =
    markedPasal.size > 0 ? chunks.filter((c) => c.metadata.pasal && markedPasal.has(c.metadata.pasal)) : chunks;

  const citations: Citation[] = [];
  for (const chunk of relevantChunks) {
    const key = dedupeKey(chunk);
    if (seen.has(key)) continue;
    seen.add(key);
    citations.push(chunkToCitation(chunk, "live-lookup"));
  }
  return citations;
}
