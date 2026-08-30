"use client";

import { useConversations } from "@/hooks/useConversations";
import { SearchBox } from "@/components/sidebar/SearchBox";
import { ConversationItem } from "@/components/sidebar/ConversationItem";

export function ConversationList() {
  const { conversations, isLoading, query, setQuery, rename, remove } = useConversations();

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <SearchBox value={query} onChange={setQuery} />
      <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto">
        {isLoading && <p className="px-2.5 py-2 text-sm text-muted-foreground">Memuat...</p>}
        {!isLoading && conversations.length === 0 && (
          <p className="px-2.5 py-2 text-sm text-muted-foreground">
            {query ? "Tidak ada percakapan yang cocok." : "Belum ada percakapan."}
          </p>
        )}
        {conversations.map((conversation) => (
          <ConversationItem
            key={conversation.id}
            conversation={conversation}
            onRename={rename}
            onDelete={remove}
          />
        ))}
      </div>
    </div>
  );
}
