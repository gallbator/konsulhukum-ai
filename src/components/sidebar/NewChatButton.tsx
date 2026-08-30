import Link from "next/link";
import { PlusIcon } from "@/components/ui/icons";

export function NewChatButton() {
  return (
    <Link
      href="/chat"
      className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium hover:bg-surface-hover transition-colors"
    >
      <PlusIcon className="h-4 w-4" />
      Percakapan baru
    </Link>
  );
}
