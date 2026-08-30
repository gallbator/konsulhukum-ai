import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse (via pdfjs-dist) sets up a worker file at a path relative to its
  // own package; letting webpack/Turbopack bundle it rewrites that path and
  // breaks worker resolution ("Setting up fake worker failed: Cannot find
  // module .../pdf.worker.mjs"). Keeping it external makes Node resolve it
  // normally at runtime, same as running a plain script.
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
};

export default nextConfig;
