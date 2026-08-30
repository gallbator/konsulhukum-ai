import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import type { LegalDocumentMetadata, LegalSourceAdapter, RawDocumentContent, RawDocumentRef } from "@/lib/ingestion/types";

const SAMPLE_DOCS_DIR = path.join(process.cwd(), "sample-docs");

/**
 * Reads a folder of {name}.txt + {name}.json (metadata sidecar) pairs.
 * Exists to validate the ingestion pipeline end-to-end (Fase 3) using the
 * same LegalSourceAdapter interface real scrapers (Fase 6) will implement —
 * nothing here is throwaway.
 */
export const manualLocalAdapter: LegalSourceAdapter = {
  key: "manual-local",
  name: "Dokumen contoh (manual)",
  defaultSourceType: "uu",

  async *listDocuments(): AsyncGenerator<RawDocumentRef> {
    let files: string[];
    try {
      files = await readdir(SAMPLE_DOCS_DIR);
    } catch {
      return;
    }
    for (const file of files) {
      if (!file.endsWith(".txt")) continue;
      const name = file.slice(0, -4);
      yield {
        externalId: name,
        url: `file://${path.join(SAMPLE_DOCS_DIR, file)}`,
        metadataHint: { name },
      };
    }
  },

  async fetchDocument(ref: RawDocumentRef): Promise<RawDocumentContent> {
    const name = ref.metadataHint!.name as string;
    const text = await readFile(path.join(SAMPLE_DOCS_DIR, `${name}.txt`), "utf8");
    return { text, sourceUrl: ref.url, fetchedAt: new Date().toISOString() };
  },

  async parseMetadata(_content: RawDocumentContent, ref: RawDocumentRef): Promise<LegalDocumentMetadata> {
    const name = ref.metadataHint!.name as string;
    // Metadata sidecar keys are already in LegalDocumentMetadata shape.
    const json = await readFile(path.join(SAMPLE_DOCS_DIR, `${name}.json`), "utf8");
    return JSON.parse(json) as LegalDocumentMetadata;
  },
};
