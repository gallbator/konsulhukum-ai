import process from "node:process";

process.loadEnvFile(".env.local");

import { runIngestionJob } from "@/lib/ingestion/runJob";

function getArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const inline = process.argv.find((a) => a.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const flagIndex = process.argv.indexOf(`--${name}`);
  return flagIndex >= 0 ? process.argv[flagIndex + 1] : undefined;
}

async function main() {
  const source = getArg("source");
  if (!source) {
    console.error("Usage: tsx scripts/ingest.ts --source <source-key>");
    console.error("Contoh: tsx scripts/ingest.ts --source manual-local");
    process.exit(1);
  }

  console.log(`Menjalankan ingestion job untuk sumber "${source}"...`);
  const summary = await runIngestionJob(source, "manual");
  console.log(JSON.stringify(summary, null, 2));

  if (summary.documentsFailed > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
