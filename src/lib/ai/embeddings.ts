import { embedMany } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

/**
 * Separate from chatModel.ts on purpose: OpenRouter's chat and embedding
 * endpoints are different APIs, and a future embedding-provider swap (e.g.
 * to a dedicated OpenAI/Cohere key) should not touch the chat model wiring.
 */
export const EMBEDDING_DIMENSION = 1536; // openai/text-embedding-3-small — matches the pgvector column.

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

function getEmbeddingModel() {
  const modelId = process.env.EMBEDDING_MODEL ?? "openai/text-embedding-3-small";
  return openrouter.textEmbeddingModel(modelId);
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const { embeddings } = await embedMany({
    model: getEmbeddingModel(),
    values: texts,
  });
  return embeddings;
}

export async function embedQuery(text: string): Promise<number[]> {
  const [embedding] = await embedTexts([text]);
  return embedding;
}
