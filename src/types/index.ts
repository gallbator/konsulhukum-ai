export type MessageRole = "user" | "assistant" | "system";

export interface Citation {
  documentId: string;
  sourceType: string;
  title: string;
  number: string | null;
  year: number | null;
  pasal: string | null;
  url: string | null;
  similarity: number;
  /**
   * "related" = surfaced only because nothing directly answered the question
   * (see lib/rag/retrieve.ts) — shown separately, never as a direct answer.
   * "live-lookup" = fetched live from peraturan.go.id during this turn
   * because it wasn't in the local corpus yet (see lib/rag/liveLookup.ts).
   */
  relevance: "direct" | "related" | "live-lookup";
}

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  citations: Citation[];
  createdAt: string;
}
