import { createSupabaseServerClient, DEFAULT_USER_ID } from "@/lib/supabase/server";
import type { Conversation } from "@/types";

interface ConversationRow {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

function toConversation(row: ConversationRow): Conversation {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listConversations(): Promise<Conversation[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .eq("user_id", DEFAULT_USER_ID)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data as ConversationRow[]).map(toConversation);
}

export async function getConversation(id: string): Promise<Conversation | null> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data ? toConversation(data as ConversationRow) : null;
}

export async function createConversation(title = "Percakapan Baru"): Promise<Conversation> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("conversations")
    .insert({ user_id: DEFAULT_USER_ID, title })
    .select("*")
    .single();

  if (error) throw error;
  return toConversation(data as ConversationRow);
}

export async function renameConversation(id: string, title: string): Promise<Conversation> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("conversations")
    .update({ title })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return toConversation(data as ConversationRow);
}

export async function deleteConversation(id: string): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("conversations").delete().eq("id", id);
  if (error) throw error;
}

export async function getConversationsByIds(ids: string[]): Promise<Conversation[]> {
  if (ids.length === 0) return [];
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .eq("user_id", DEFAULT_USER_ID)
    .in("id", ids);

  if (error) throw error;
  return (data as ConversationRow[]).map(toConversation);
}

export async function searchConversations(query: string): Promise<Conversation[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .eq("user_id", DEFAULT_USER_ID)
    .ilike("title", `%${query}%`)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data as ConversationRow[]).map(toConversation);
}
