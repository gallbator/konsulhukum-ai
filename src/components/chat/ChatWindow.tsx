"use client";

import { useEffect, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { ChatInput } from "@/components/chat/ChatInput";
import { ModelSelect } from "@/components/chat/ModelSelect";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import { DisclaimerBanner } from "@/components/layout/DisclaimerBanner";
import { emitConversationsRefresh } from "@/lib/events";
import { takePendingFirstMessage } from "@/lib/pendingMessage";
import { messageToUIMessage, type AppUIMessage } from "@/lib/ai/uiMessages";
import { useChatModel } from "@/hooks/useChatModel";
import type { Message } from "@/types";

interface ChatWindowProps {
  conversationId: string;
  initialMessages: AppUIMessage[];
}

export function ChatWindow({ conversationId, initialMessages }: ChatWindowProps) {
  const { modelId, setModelId, options: modelOptions } = useChatModel();

  const { messages, sendMessage, setMessages, status, error, regenerate, clearError } = useChat<AppUIMessage>({
    id: conversationId,
    messages: initialMessages,
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    onFinish: async () => {
      emitConversationsRefresh();
      // Re-sync from the DB so the just-persisted assistant message's citations
      // (computed server-side, see /api/chat) show up without a page reload.
      const res = await fetch(`/api/conversations/${conversationId}/messages`);
      if (!res.ok) return;
      const { messages: dbMessages }: { messages: Message[] } = await res.json();
      setMessages(dbMessages.map(messageToUIMessage));
    },
  });

  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sentPendingRef = useRef(false);
  useEffect(() => {
    if (sentPendingRef.current) return;
    const pending = takePendingFirstMessage(conversationId);
    if (pending) {
      sentPendingRef.current = true;
      sendMessage({ text: pending }, { body: { model: modelId } });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per conversationId, not on every sendMessage/modelId identity change.
  }, [conversationId]);

  const isBusy = status === "submitted" || status === "streaming";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-6">
          {messages.length === 0 && (
            <div className="mt-16 text-center text-sm text-muted-foreground">
              Mulai percakapan dengan mengajukan pertanyaan hukum di bawah.
            </div>
          )}
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
          {status === "submitted" && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>
      </div>
      {error && (
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 pb-2 text-sm text-red-600 dark:text-red-400">
          <span>Gagal mendapatkan jawaban. Periksa koneksi atau coba lagi.</span>
          <button
            type="button"
            onClick={() => {
              clearError();
              regenerate();
            }}
            className="shrink-0 rounded-md border border-current px-2.5 py-1 text-xs font-medium"
          >
            Coba lagi
          </button>
        </div>
      )}
      <div className="mx-auto w-full max-w-3xl px-4 pb-2">
        <ModelSelect value={modelId} options={modelOptions} onChange={setModelId} disabled={isBusy} />
      </div>
      <div className="mx-auto w-full max-w-3xl px-4 pb-4">
        <ChatInput
          disabled={isBusy}
          onSend={(text) => sendMessage({ text }, { body: { model: modelId } })}
        />
      </div>
      <DisclaimerBanner />
    </div>
  );
}
