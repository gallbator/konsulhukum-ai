import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { AppUIMessage } from "@/lib/ai/uiMessages";
import { CitationList } from "@/components/chat/CitationList";
import { ScaleIcon } from "@/components/ui/icons";

interface MessageBubbleProps {
  message: AppUIMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const text = message.parts
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join("");

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[75ch] rounded-2xl rounded-br-sm bg-accent px-4 py-2.5 text-sm text-accent-foreground">
          {text}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2.5">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-hover">
        <ScaleIcon className="h-4 w-4 text-accent" />
      </div>
      <div className="max-w-[75ch] rounded-2xl rounded-tl-sm border border-border bg-surface px-4 py-3">
        <div className="legal-prose">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
        </div>
        <CitationList citations={message.metadata?.citations ?? []} />
      </div>
    </div>
  );
}
