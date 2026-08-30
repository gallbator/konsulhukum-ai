import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface SourceRow {
  id: string;
  key: string;
  name: string;
  base_url: string | null;
  adapter_key: string;
  enabled: boolean;
  config: Record<string, unknown>;
  last_run_at: string | null;
}

export async function getOrCreateSource(input: {
  key: string;
  name: string;
  adapterKey: string;
  baseUrl?: string;
}): Promise<SourceRow> {
  const supabase = createSupabaseServerClient();

  const { data: existing, error: findError } = await supabase
    .from("sources")
    .select("*")
    .eq("key", input.key)
    .maybeSingle();
  if (findError) throw findError;
  if (existing) return existing as SourceRow;

  const { data, error } = await supabase
    .from("sources")
    .insert({
      key: input.key,
      name: input.name,
      adapter_key: input.adapterKey,
      base_url: input.baseUrl,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as SourceRow;
}

export async function touchSourceLastRun(sourceId: string): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("sources")
    .update({ last_run_at: new Date().toISOString() })
    .eq("id", sourceId);
  if (error) throw error;
}
