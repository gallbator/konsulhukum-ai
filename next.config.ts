import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse (via pdfjs-dist) sets up a worker file at a path relative to its
  // own package; letting webpack/Turbopack bundle it rewrites that path and
  // breaks worker resolution ("Setting up fake worker failed: Cannot find
  // module .../pdf.worker.mjs"). Keeping it external makes Node resolve it
  // normally at runtime, same as running a plain script.
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
  // Being external is not enough on Vercel: the worker file is loaded via a
  // dynamically-computed path, which @vercel/nft's static file tracing
  // doesn't follow, so it's silently left out of the deployed function
  // bundle ("Cannot find module '/var/task/node_modules/pdfjs-dist/legacy/
  // build/pdf.worker.mjs'" — reproducible in dev too via a real `next build`
  // + `next start`, never in plain `next dev`). Force it into every route's
  // trace explicitly.
  outputFileTracingIncludes: {
    "/*": ["node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs"],
  },
};

export default nextConfig;
