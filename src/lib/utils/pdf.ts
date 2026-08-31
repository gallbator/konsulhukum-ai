// pdf-parse bundles pdfjs-dist, which references the browser-only DOMMatrix
// API even in its "Node" build (used internally for page/text transforms) —
// absent in Vercel's serverless Node runtime, this throws
// "ReferenceError: DOMMatrix is not defined" the moment the module loads.
// Polyfilling it before pdf-parse is imported fixes that; done via a dynamic
// import (rather than a static one) so this assignment always runs first,
// regardless of the static import's hoisting or the bundler's module-loading
// order for the externalized package (see next.config.ts serverExternalPackages).
async function loadPdfParse() {
  if (typeof globalThis.DOMMatrix === "undefined") {
    const { default: DOMMatrixPolyfill } = await import("dommatrix");
    globalThis.DOMMatrix = DOMMatrixPolyfill as unknown as typeof DOMMatrix;
  }
  return import("pdf-parse");
}

export async function extractPdfText(bytes: Uint8Array): Promise<string> {
  const { PDFParse } = await loadPdfParse();
  const parser = new PDFParse({ data: bytes });
  try {
    const result = await parser.getText();
    return result.text;
  } finally {
    await parser.destroy();
  }
}
