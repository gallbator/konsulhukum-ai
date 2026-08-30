import type { Chunk } from "@/lib/chunking/legalChunker";

/**
 * Word-based sliding window for text with no reliable structural markers
 * (court rulings, free text). Overlap keeps a chunk boundary from splitting
 * a sentence's meaning away from its context entirely.
 */
export function chunkGenericText(
  rawText: string,
  windowWords = 220,
  overlapWords = 40
): Chunk[] {
  const words = rawText.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const chunks: Chunk[] = [];
  const step = Math.max(1, windowWords - overlapWords);
  for (let start = 0; start < words.length; start += step) {
    const slice = words.slice(start, start + windowWords);
    if (slice.length === 0) break;
    chunks.push({ text: slice.join(" "), metadata: {} });
    if (start + windowWords >= words.length) break;
  }
  return chunks;
}
