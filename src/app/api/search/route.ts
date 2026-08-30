import { NextResponse } from "next/server";
import { getConversationsByIds, listConversations, searchConversations } from "@/lib/db/queries/conversations";
import { searchMessages } from "@/lib/db/queries/messages";
import type { Conversation } from "@/types";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";

  if (!q) {
    return NextResponse.json({ conversations: await listConversations() });
  }

  const [byTitle, matchingMessages] = await Promise.all([searchConversations(q), searchMessages(q)]);

  const messageConversationIds = [...new Set(matchingMessages.map((m) => m.conversationId))];
  const byContent = await getConversationsByIds(messageConversationIds);

  const merged = new Map<string, Conversation>();
  for (const conversation of [...byTitle, ...byContent]) {
    merged.set(conversation.id, conversation);
  }
  const conversations = [...merged.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return NextResponse.json({ conversations });
}
