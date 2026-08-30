import { notFound } from "next/navigation";
import { getConversation } from "@/lib/db/queries/conversations";
import { listMessages } from "@/lib/db/queries/messages";
import { messageToUIMessage } from "@/lib/ai/uiMessages";
import { ChatWindow } from "@/components/chat/ChatWindow";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ conversationId: string }>;
}

export default async function ConversationPage({ params }: PageProps) {
  const { conversationId } = await params;

  const conversation = await getConversation(conversationId);
  if (!conversation) notFound();

  const messages = await listMessages(conversationId);

  return (
    <ChatWindow
      conversationId={conversationId}
      initialMessages={messages.map(messageToUIMessage)}
    />
  );
}
