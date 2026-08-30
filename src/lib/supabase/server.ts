import { createClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client using the service role key.
 * Never import this from a Client Component — it bypasses row-level security.
 * All DB access goes through Next.js API routes, so the browser never talks to Supabase directly.
 */
function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function createSupabaseServerClient() {
  return createClient(
    getEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false } }
  );
}

export const DEFAULT_USER_ID =
  process.env.DEFAULT_USER_ID ?? "00000000-0000-0000-0000-000000000001";
