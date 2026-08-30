import { getAdapter } from "@/lib/ingestion/registry";
import { ingestOneDocument } from "@/lib/ingestion/ingestOne";
import { getOrCreateSource, touchSourceLastRun } from "@/lib/db/queries/sources";
import { createIngestionJob, finalizeIngestionJob } from "@/lib/db/queries/ingestionJobs";

export interface IngestionJobSummary {
  sourceKey: string;
  documentsFound: number;
  documentsIngested: number;
  documentsSkipped: number;
  documentsFailed: number;
  errors: Array<{ ref: string; message: string }>;
}

/**
 * Adapter-agnostic: fetch -> dedup by checksum -> chunk -> embed -> store.
 * One failing document is recorded and skipped; it never aborts the whole job
 * (a fragile scrape of doc #400 out of 500 shouldn't lose the other 499).
 */
export async function runIngestionJob(
  sourceKey: string,
  triggeredBy: "manual" | "cron" | "n8n" = "manual"
): Promise<IngestionJobSummary> {
  const adapter = getAdapter(sourceKey);
  const source = await getOrCreateSource({
    key: adapter.key,
    name: adapter.name,
    adapterKey: adapter.key,
  });
  const job = await createIngestionJob(source.id, triggeredBy);

  let found = 0;
  let ingested = 0;
  let skipped = 0;
  let failed = 0;
  const errors: Array<{ ref: string; message: string }> = [];

  for await (const ref of adapter.listDocuments({ since: source.last_run_at ?? undefined })) {
    found++;
    try {
      const outcome = await ingestOneDocument(adapter, source.id, ref);
      if (outcome.status === "skipped") {
        skipped++;
      } else {
        ingested++;
      }
    } catch (err) {
      failed++;
      errors.push({ ref: ref.externalId, message: err instanceof Error ? err.message : String(err) });
    }
  }

  await touchSourceLastRun(source.id);
  await finalizeIngestionJob(job.id, {
    status: failed === 0 ? "success" : ingested + skipped > 0 ? "partial" : "failed",
    documentsFound: found,
    documentsIngested: ingested,
    documentsFailed: failed,
    errorLog: errors,
  });

  return { sourceKey, documentsFound: found, documentsIngested: ingested, documentsSkipped: skipped, documentsFailed: failed, errors };
}
