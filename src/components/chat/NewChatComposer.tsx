"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChatInput } from "@/components/chat/ChatInput";
import { ModelSelect } from "@/components/chat/ModelSelect";
import { DisclaimerBanner } from "@/components/layout/DisclaimerBanner";
import { setPendingFirstMessage } from "@/lib/pendingMessage";
import { useChatModel } from "@/hooks/useChatModel";

/**
 * Shown at /chat. Doesn't persist a conversation until the user actually sends
 * a message, avoiding empty "Percakapan Baru" rows piling up from page visits.
 */
export function NewChatComposer() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const { modelId, setModelId, options: modelOptions } = useChatModel();

  async function handleSend(text: string) {
    setIsCreating(true);
    const res = await fetch("/api/conversations", { method: "POST" });
    const { conversation } = await res.json();
    setPendingFirstMessage(conversation.id, text);
    router.push(`/chat/${conversation.id}`);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-1 items-center justify-center px-4 text-center text-sm text-muted-foreground">
        Mulai percakapan dengan mengajukan pertanyaan hukum di bawah.
      </div>
      <div className="mx-auto w-full max-w-3xl px-4 pb-2">
        <ModelSelect value={modelId} options={modelOptions} onChange={setModelId} disabled={isCreating} />
      </div>
      <div className="mx-auto w-full max-w-3xl px-4 pb-4">
        <ChatInput disabled={isCreating} onSend={handleSend} />
      </div>
      <DisclaimerBanner />
    </div>
  );
}
