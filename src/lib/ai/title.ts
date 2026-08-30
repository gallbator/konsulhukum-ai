import { generateText } from "ai";
import { getTitleModel } from "@/lib/ai/chatModel";

export async function generateConversationTitle(firstUserMessage: string): Promise<string> {
  const { text } = await generateText({
    model: getTitleModel(),
    system:
      "Buat judul singkat (maksimal 6 kata) dalam Bahasa Indonesia untuk percakapan riset hukum ini, " +
      "berdasarkan pertanyaan pertama pengguna. Balas HANYA judulnya, tanpa tanda kutip dan tanpa titik di akhir.",
    prompt: firstUserMessage,
  });
  return text.trim().replace(/^["']|["']$/g, "").slice(0, 80) || "Percakapan Baru";
}
