import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface IngestionJobRow {
  id: string;
  source_id: string;
  status: string;
}

export async function createIngestionJob(
  sourceId: string,
  triggeredBy: "manual" | "cron" | "n8n" = "manual"
): Promise<IngestionJobRow> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("ingestion_jobs")
    .insert({ source_id: sourceId, status: "running", triggered_by: triggeredBy })
    .select("*")
    .single();
  if (error) throw error;
  return data as IngestionJobRow;
}

export async function finalizeIngestionJob(
  jobId: string,
  result: {
    status: "success" | "partial" | "failed";
    documentsFound: number;
    documentsIngested: number;
    documentsFailed: number;
    errorLog: Array<{ ref: string; message: string }>;
  }
): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("ingestion_jobs")
    .update({
      status: result.status,
      finished_at: new Date().toISOString(),
      documents_found: result.documentsFound,
      documents_ingested: result.documentsIngested,
      documents_failed: result.documentsFailed,
      error_log: result.errorLog,
    })
    .eq("id", jobId);
  if (error) throw error;
}
