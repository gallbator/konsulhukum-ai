import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Citation, Message, MessageRole } from "@/types";

interface MessageRow {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  citations: Citation[];
  created_at: string;
}

function toMessage(row: MessageRow): Message {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role,
    content: row.content,
    citations: row.citations ?? [],
    createdAt: row.created_at,
  };
}

export async function listMessages(conversationId: string): Promise<Message[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data as MessageRow[]).map(toMessage);
}

export async function createMessage(input: {
  conversationId: string;
  role: MessageRole;
  content: string;
  citations?: Citation[];
}): Promise<Message> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: input.conversationId,
      role: input.role,
      content: input.content,
      citations: input.citations ?? [],
    })
    .select("*")
    .single();

  if (error) throw error;
  return toMessage(data as MessageRow);
}

export async function searchMessages(query: string): Promise<Message[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .ilike("content", `%${query}%`)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw error;
  return (data as MessageRow[]).map(toMessage);
}
