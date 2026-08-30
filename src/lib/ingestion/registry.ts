import type { LegalSourceAdapter } from "@/lib/ingestion/types";
import { manualLocalAdapter } from "@/lib/ingestion/sources/manualLocal";
import { makePeraturanGoIdAdapter } from "@/lib/ingestion/sources/peraturanGoId";

/**
 * Adding a real scraper later is additive: implement LegalSourceAdapter in
 * lib/ingestion/sources/*.ts, register it here, done — runJob.ts and the DB
 * schema don't change. Only sources whose robots.txt permits automated
 * access are registered here (see peraturanGoId.ts for the check performed);
 * putusan3.mahkamahagung.go.id explicitly disallows AI crawlers and is
 * deliberately NOT implemented.
 */
const adapters: LegalSourceAdapter[] = [
  manualLocalAdapter,
  makePeraturanGoIdAdapter("uu"),
  makePeraturanGoIdAdapter("pp"),
  makePeraturanGoIdAdapter("perpres"),
];

const registry = new Map(adapters.map((adapter) => [adapter.key, adapter]));

export function getAdapter(key: string): LegalSourceAdapter {
  const adapter = registry.get(key);
  if (!adapter) {
    throw new Error(`Unknown ingestion source: ${key}. Registered: ${[...registry.keys()].join(", ")}`);
  }
  return adapter;
}
