import { generateText } from "ai";
import { getTitleModel } from "@/lib/ai/chatModel";

/**
 * Retrieval only ever sees the latest message in isolation — a natural
 * follow-up like "kalau perusahaan bersikeras menunjukkan laporan keuangan
 * merugi..." carries no words in common with the actual topic (PHK pekerja
 * hamil) once it's more than one turn deep into a conversation. Embedded on
 * its own, a question like that drifts toward whatever DB content happens to
 * share surface vocabulary ("keuangan", "kerugian") — observed in practice
 * pulling in an unrelated financial-sector law as "primary" KONTEKS instead
 * of the labor-law pasal actually being discussed. Rewriting the follow-up
 * into a standalone question using the prior turns fixes retrieval without
 * changing what's shown to the user (the original message is still what gets
 * persisted/displayed — this rewrite exists only to pick better KONTEKS).
 */
export async function rewriteQueryForRetrieval(
  history: { role: "user" | "assistant"; text: string }[],
  currentQuestion: string
): Promise<string> {
  if (history.length === 0) return currentQuestion;

  const transcript = history
    .slice(-6)
    .map((m) => `${m.role === "user" ? "Pengguna" : "Asisten"}: ${m.text}`)
    .join("\n");

  try {
    const { text } = await generateText({
      model: getTitleModel(),
      system:
        "Tulis ulang pertanyaan TERBARU pengguna menjadi satu pertanyaan yang berdiri sendiri (standalone) " +
        "dan lengkap konteksnya, untuk dipakai sebagai query pencarian dokumen hukum — sertakan detail relevan " +
        "dari percakapan sebelumnya (mis. jenis kasus, pihak, ketentuan yang sudah dibahas) yang tidak diulang di " +
        "pertanyaan terbaru. Balas HANYA pertanyaan hasil tulis ulang, dalam Bahasa Indonesia, tanpa penjelasan tambahan.",
      prompt: `Percakapan sebelumnya:\n${transcript}\n\nPertanyaan terbaru yang perlu ditulis ulang: "${currentQuestion}"`,
    });
    return text.trim() || currentQuestion;
  } catch {
    // Retrieval with the raw follow-up is still better than failing the whole turn.
    return currentQuestion;
  }
}
