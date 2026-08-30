import type { UIMessage } from "ai";
import type { Citation, Message } from "@/types";

export interface AppMessageMetadata {
  citations?: Citation[];
}

export type AppUIMessage = UIMessage<AppMessageMetadata>;

export function messageToUIMessage(message: Message): AppUIMessage {
  return {
    id: message.id,
    role: message.role,
    parts: [{ type: "text", text: message.content }],
    metadata: message.citations.length > 0 ? { citations: message.citations } : undefined,
  };
}

export function extractText(message: UIMessage): string {
  return message.parts
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join("");
}

export function lastUserMessage(messages: UIMessage[]): UIMessage | undefined {
  return [...messages].reverse().find((m) => m.role === "user");
}
