import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { DEFAULT_CHAT_MODEL_ID } from "@/lib/ai/models";

/**
 * Single point of provider/model choice for the chat path.
 * Swapping providers later (e.g. to a direct Anthropic/OpenAI AI-SDK provider)
 * means changing only this file.
 */
const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

export function getChatModel(modelId?: string) {
  return openrouter.chat(modelId ?? process.env.AI_CHAT_MODEL ?? DEFAULT_CHAT_MODEL_ID);
}

export function getTitleModel() {
  return openrouter.chat(process.env.AI_TITLE_MODEL ?? "anthropic/claude-haiku-4.5");
}
