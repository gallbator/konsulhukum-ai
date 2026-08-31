import { convertToModelMessages, stepCountIs, streamText, tool, type UIMessage } from "ai";
import { z } from "zod";
import { getChatModel } from "@/lib/ai/chatModel";
import { isValidChatModelId } from "@/lib/ai/models";
import { buildGroundedSystemPrompt, type ContextChunkForPrompt } from "@/lib/ai/prompt";
import { generateConversationTitle } from "@/lib/ai/title";
import { rewriteQueryForRetrieval } from "@/lib/ai/queryRewrite";
import { extractText, lastUserMessage } from "@/lib/ai/uiMessages";
import { getConversation, renameConversation } from "@/lib/db/queries/conversations";
import { createMessage } from "@/lib/db/queries/messages";
import { retrieveWithFallback, type RetrievedChunk } from "@/lib/rag/retrieve";
import { citationsFromLiveLookup, extractCitations } from "@/lib/rag/citations";
import { lookupAndIngestRegulation } from "@/lib/rag/liveLookup";

const DEFAULT_TITLE = "Percakapan Baru";

// Live lookups (network fetch + PDF parse + embedding, on top of normal
// generation) can run long; give the agentic tool-calling loop room to finish.
export const maxDuration = 90;

interface ChatRequestBody {
  id: string; // conversationId (Chat's `id` doubles as the conversation id)
  messages: UIMessage[];
  model?: string;
}

function toPromptChunk(c: RetrievedChunk): ContextChunkForPrompt {
  return {
    title: c.title,
    number: c.number,
    year: c.year,
    pasal: c.metadata.pasal ?? null,
    chunkText: c.chunkText,
  };
}

export async function POST(req: Request) {
  const { id: conversationId, messages, model }: ChatRequestBody = await req.json();
  // Only trust a model id from the whitelist — never pass user-controlled
  // input straight through to the OpenRouter model slug.
  const chatModelId = isValidChatModelId(model) ? model : undefined;

  const incomingUserMessage = lastUserMessage(messages);
  const question = incomingUserMessage ? extractText(incomingUserMessage) : "";

  const conversation = await getConversation(conversationId);
  const shouldAutoTitle = conversation?.title === DEFAULT_TITLE;

  if (incomingUserMessage) {
    await createMessage({
      conversationId,
      role: "user",
      content: question,
    });
  }

  // A bare follow-up ("kalau perusahaan bersikeras...") shares no vocabulary
  // with the actual topic once it's more than one turn in — embedded alone it
  // can drift to a completely unrelated document. Rewrite it into a
  // standalone query using prior turns before retrieving (see queryRewrite.ts
  // for the failure mode this fixes); the original `question` is still what
  // gets persisted/displayed, this is only for picking better KONTEKS.
  const history = messages
    .slice(0, -1)
    .filter((m): m is UIMessage & { role: "user" | "assistant" } => m.role === "user" || m.role === "assistant")
    .map((m) => ({ role: m.role, text: extractText(m) }));
  const retrievalQuery = await rewriteQueryForRetrieval(history, question);

  const { primary, related } = await retrieveWithFallback(retrievalQuery);

  // Populated by the lookupRegulation tool below whenever it successfully
  // fetches something — captured here (rather than only in the tool's return
  // value) so onFinish can turn it into citations regardless of whether the
  // model's prose happened to reference it with a bracket marker.
  const liveLookupChunks: RetrievedChunk[] = [];

  const lookupRegulationTool = tool({
    description:
      "Ambil UU, PP, atau Perpres tertentu langsung dari peraturan.go.id ketika Anda tahu persis jenis, nomor, dan tahunnya tapi dokumennya tidak ada di KONTEKS UTAMA. Hanya potongan yang relevan dengan pertanyaan pengguna yang dikembalikan (bukan seluruh isi undang-undang). Hasilnya juga tersimpan ke database untuk pertanyaan berikutnya.",
    inputSchema: z.object({
      sourceType: z.enum(["uu", "pp", "perpres"]).describe("Jenis peraturan"),
      number: z.string().describe('Nomor peraturan, misalnya "13"'),
      year: z.number().describe("Tahun peraturan, misalnya 2003"),
    }),
    execute: async ({ sourceType, number, year }) => {
      const result = await lookupAndIngestRegulation(sourceType, number, year, question);
      if (!result.found) {
        return {
          found: false,
          message: result.error ?? "Dokumen tidak ditemukan di peraturan.go.id dengan nomor/tahun tersebut.",
        };
      }
      liveLookupChunks.push(...result.chunks);
      return {
        found: true,
        title: result.title,
        instruksi:
          "Untuk setiap klaim yang Anda tulis berdasarkan salah satu potongan di bawah, beri penanda [T-{pasal}] tepat setelah klaim itu, memakai nilai 'pasal' POTONGAN SPESIFIK yang mendasari klaim tersebut — JANGAN memakai satu nomor pasal yang sama untuk semua klaim. Contoh: kalau Anda menulis 'Pasal 20 mengatur hak milik [T-20]' lalu 'Pasal 26 mengatur peralihan hak [T-26]', keduanya HARUS beda ([T-20] dan [T-26], bukan dua-duanya [T-20]).",
        potongan: result.chunks.map((c) => ({
          pasal: c.metadata.pasal ?? null,
          teks: c.chunkText,
        })),
      };
    },
  });

  const result = streamText({
    model: getChatModel(chatModelId),
    system: buildGroundedSystemPrompt(primary.map(toPromptChunk), related.map(toPromptChunk)),
    messages: await convertToModelMessages(messages),
    tools: { lookupRegulation: lookupRegulationTool },
    stopWhen: stepCountIs(4),
    onFinish: async ({ text }) => {
      const citations = extractCitations(text, primary, related);
      citations.push(...citationsFromLiveLookup(text, liveLookupChunks, citations));

      await createMessage({
        conversationId,
        role: "assistant",
        content: text,
        citations,
      });
      if (shouldAutoTitle && question) {
        try {
          const title = await generateConversationTitle(question);
          await renameConversation(conversationId, title);
        } catch {
          // Non-critical: keep the default title if the title model call fails.
        }
      }
    },
  });

  return result.toUIMessageStreamResponse();
}
