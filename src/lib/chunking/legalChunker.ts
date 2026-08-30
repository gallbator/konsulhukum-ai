export interface Chunk {
  text: string;
  metadata: {
    bab?: string;
    pasal?: string;
  };
}

const BAB_RE = /^BAB\s+([IVXLCDM]+)\b.*$/im;
// Anchored to a line containing ONLY "Pasal N" (optionally with a trailing
// period — older-style PDFs like UUPA No. 5/1960 write "Pasal 6.", modern
// peraturan.go.id PDFs write "Pasal 6") — real pasal headers are typeset on
// their own line. Without the anchor this also matched in-text citations
// like "...Pasal 613 Undang-Undang Nomor 1 Tahun 2023..." or "Pasal 5 ayat
// (1), Pasal 20, dan Pasal 28D ayat (1)..." inside a law's Menimbang/
// Mengingat preamble, which fragmented real UU PDFs into hundreds of bogus,
// wrongly-tagged chunks (found ingesting UU No. 1/2026 for real). Without the
// optional period, UUPA's "Pasal 6." never matched at all — the entire
// document collapsed into one oversized chunk that then got sliced by
// enforceMaxChunkSize into pieces all mislabeled with whatever single pasal
// number DID match (found via a live-lookup citing the wrong pasal for real,
// verifiable UUPA text).
const PASAL_RE = /^Pasal\s+(\d+[A-Za-z]?)\.?\s*$/gim;

/**
 * Splits UU/PP/Perpres-style text into one chunk per Pasal (ayat/huruf stay
 * inside their parent pasal's chunk). Falls back to a single whole-text chunk
 * when no "Pasal N" marker is found, so it degrades gracefully on excerpts.
 */
export function chunkLegalText(rawText: string): Chunk[] {
  const text = rawText.trim();
  if (!text) return [];

  const babMatch = text.match(BAB_RE);
  const bab = babMatch ? babMatch[1] : undefined;

  const matches = [...text.matchAll(PASAL_RE)];
  if (matches.length === 0) {
    return [{ text, metadata: { bab } }];
  }

  const chunks: Chunk[] = [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index ?? 0;
    const end = i + 1 < matches.length ? matches[i + 1].index! : text.length;
    const pasalText = text.slice(start, end).trim();
    if (!pasalText) continue;
    chunks.push({
      text: pasalText,
      metadata: { bab, pasal: matches[i][1] },
    });
  }
  return chunks;
}
