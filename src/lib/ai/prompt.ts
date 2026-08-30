export const DISCLAIMER =
  "Catatan: jawaban ini adalah alat bantu riset, bukan pengganti nasihat hukum resmi dari advokat/konsultan hukum yang berwenang.";

export interface ContextChunkForPrompt {
  title: string;
  number: string | null;
  year: number | null;
  pasal: string | null;
  chunkText: string;
}

function formatContextEntry(chunk: ContextChunkForPrompt, index: number): string {
  const ref = [chunk.title, chunk.number ? `No. ${chunk.number}` : null, chunk.year ? `Tahun ${chunk.year}` : null]
    .filter(Boolean)
    .join(" ");
  const pasal = chunk.pasal ? `, Pasal ${chunk.pasal}` : "";
  return `[${index + 1}] ${ref}${pasal}:\n"""\n${chunk.chunkText}\n"""`;
}

/**
 * Phase 4 (RAG): the model may ONLY assert legal facts grounded in the
 * numbered KONTEKS UTAMA entries, and must mark every such claim with the
 * matching [n]. The app (not the model) later verifies which [n] markers
 * actually appear in the output and maps them back to real chunk metadata
 * (see lib/rag/citations.ts) — this prompt shapes the model's behavior, it
 * isn't the source of citation trust.
 *
 * `related` (only populated when `primary` is empty — see
 * lib/rag/retrieve.ts's retrieveWithFallback) lets the assistant point to
 * "closest available in the database" documents instead of a flat refusal,
 * without letting it treat those looser matches as a confident answer.
 */
export function buildGroundedSystemPrompt(
  primary: ContextChunkForPrompt[],
  related: ContextChunkForPrompt[] = []
): string {
  const primaryBlock =
    primary.length > 0
      ? primary.map(formatContextEntry).join("\n\n")
      : "TIDAK ADA DOKUMEN YANG SECARA LANGSUNG MENJAWAB PERTANYAAN INI.";

  const relatedBlock =
    related.length > 0
      ? related.map((chunk, i) => formatContextEntry(chunk, primary.length + i)).join("\n\n")
      : null;

  const rules = [
    "Anda adalah asisten riset hukum Indonesia untuk praktisi hukum (lawyer).",
    "Jawab selalu dalam Bahasa Indonesia; istilah hukum boleh tetap dalam bentuk aslinya.",
    "",
    "ATURAN WAJIB:",
    "1. Jawab HANYA berdasarkan potongan dokumen pada bagian KONTEKS UTAMA (atau hasil tool lookupRegulation, lihat aturan 4). Jangan gunakan pengetahuan lain di luar itu untuk klaim hukum (nomor pasal, nomor UU/PP/Perpres/putusan, isi ketentuan).",
    "2. Setiap klaim yang berasal dari KONTEKS wajib diberi penanda [n] yang merujuk ke nomor entri KONTEKS yang dipakai, persis di tempat klaim itu ditulis.",
    "3. Jika KONTEKS UTAMA tidak memuat informasi relevan DAN Anda tidak tahu nomor+tahun peraturan spesifik yang relevan untuk dicari lewat tool lookupRegulation, katakan secara jujur dan eksplisit bahwa Anda tidak menemukan jawaban pasti di database untuk pertanyaan ini — jangan mengarang jawaban atau memakai pengetahuan umum sebagai gantinya.",
    "4. Jika Anda TAHU ada UU/PP/Perpres tertentu (nomor dan tahun spesifik) yang kemungkinan besar menjawab pertanyaan tapi tidak ada di KONTEKS UTAMA, panggil tool lookupRegulation untuk mengambilnya langsung dari peraturan.go.id — JANGAN menyuruh pengguna mencarinya sendiri kalau Anda bisa mengambilkannya. Tool akan meminta Anda menandai setiap klaim dari hasilnya dengan [T-{pasal}] (ikuti instruksi yang dikembalikan tool itu persis) — pakai penanda ini secara konsisten, karena dipakai untuk menyusun daftar sumber yang ditampilkan ke pengguna. Tool ini hanya mendukung jenis uu/pp/perpres — untuk jenis lain (putusan, dll.) yang tidak didukung, sampaikan secara jujur bahwa dokumennya perlu dicari manual dan sebutkan di mana biasanya bisa ditemukan.",
  ];

  if (relatedBlock) {
    rules.push(
      "5. Setelah pernyataan jujur di atas (jika lookupRegulation juga tidak membantu), Anda BOLEH menyebutkan entri pada bagian DOKUMEN TERKAIT sebagai referensi tambahan yang mungkin berguna bagi pengguna — beri tahu secara eksplisit bahwa dokumen ini TIDAK menjawab pertanyaan secara langsung, hanya berkaitan secara umum. Tetap gunakan penanda [n] saat menyebutkannya, tapi jangan nyatakan isinya seolah-olah itu jawaban pasti atas pertanyaan.",
      `6. Selalu akhiri jawaban dengan disclaimer berikut, apa adanya: "${DISCLAIMER}"`
    );
  } else {
    rules.push(`5. Selalu akhiri jawaban dengan disclaimer berikut, apa adanya: "${DISCLAIMER}"`);
  }

  rules.push("", "KONTEKS UTAMA:", primaryBlock);
  if (relatedBlock) {
    rules.push("", "DOKUMEN TERKAIT (bukan jawaban langsung):", relatedBlock);
  }

  return rules.join("\n");
}

/**
 * Phase 2 (no RAG yet): general-knowledge answering. The model is told explicitly
 * not to assert precise pasal/nomor citations it cannot verify, since no retrieved
 * source is attached yet. This gets replaced by buildGroundedSystemPrompt once
 * retrieval (Phase 4) is wired in.
 */
export function buildBaseSystemPrompt(): string {
  return [
    "Anda adalah asisten riset hukum Indonesia untuk praktisi hukum (lawyer).",
    "Jawab selalu dalam Bahasa Indonesia; istilah hukum boleh tetap dalam bentuk aslinya.",
    "PENTING: saat ini Anda BELUM diberi potongan dokumen hukum asli sebagai referensi.",
    "Jangan menyebutkan nomor pasal, nomor UU/PP/Perpres, atau nomor putusan secara pasti jika Anda tidak yakin — " +
      "sampaikan secara eksplisit bahwa detail tersebut perlu diverifikasi ke sumber resmi.",
    `Selalu akhiri jawaban dengan disclaimer berikut, apa adanya: "${DISCLAIMER}"`,
  ].join("\n");
}
