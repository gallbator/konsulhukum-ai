import { createOpenRouter } from "@openrouter/ai-sdk-provider";

/**
 * Single point of provider/model choice for the chat path.
 * Swapping providers later (e.g. to a direct Anthropic/OpenAI AI-SDK provider)
 * means changing only this file.
 */
const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

export function getChatModel() {
  return openrouter.chat(process.env.AI_CHAT_MODEL ?? "anthropic/claude-sonnet-4.5");
}

export function getTitleModel() {
  return openrouter.chat(process.env.AI_TITLE_MODEL ?? "anthropic/claude-haiku-4.5");
}
