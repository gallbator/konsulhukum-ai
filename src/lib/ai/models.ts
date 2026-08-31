export interface ChatModelOption {
  id: string;
  label: string;
}

export const CHAT_MODEL_OPTIONS: ChatModelOption[] = [
  { id: "anthropic/claude-sonnet-4.5", label: "Claude Sonnet 4.5" },
  { id: "google/gemini-3.6-flash", label: "Gemini Flash 3.6" },
  { id: "openai/gpt-5", label: "GPT-5" },
];

export const DEFAULT_CHAT_MODEL_ID = CHAT_MODEL_OPTIONS[0].id;

export function isValidChatModelId(id: unknown): id is string {
  return typeof id === "string" && CHAT_MODEL_OPTIONS.some((m) => m.id === id);
}
