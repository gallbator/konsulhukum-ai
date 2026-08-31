"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import type { Conversation } from "@/types";
import { PencilIcon, TrashIcon } from "@/components/ui/icons";

interface ConversationItemProps {
  conversation: Conversation;
  onRename: (id: string, title: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function ConversationItem({ conversation, onRename, onDelete }: ConversationItemProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isActive = pathname === `/chat/${conversation.id}`;
  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(conversation.title);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  async function commitRename() {
    setIsEditing(false);
    const trimmed = draftTitle.trim();
    if (trimmed && trimmed !== conversation.title) {
      await onRename(conversation.id, trimmed);
    } else {
      setDraftTitle(conversation.title);
    }
  }

  async function confirmDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsConfirmingDelete(false);
    await onDelete(conversation.id);
    if (isActive) router.push("/chat");
  }

  if (isEditing) {
    return (
      <input
        autoFocus
        value={draftTitle}
        onChange={(e) => setDraftTitle(e.target.value)}
        onBlur={commitRename}
        onKeyDown={(e) => {
          if (e.key === "Enter") commitRename();
          if (e.key === "Escape") {
            setDraftTitle(conversation.title);
            setIsEditing(false);
          }
        }}
        className="w-full rounded-md border border-accent bg-background px-2.5 py-2 text-sm outline-none"
      />
    );
  }

  if (isConfirmingDelete) {
    return (
      <div className="flex items-center justify-between gap-1 rounded-md bg-surface-hover px-2.5 py-2 text-sm">
        <span className="truncate text-foreground">Hapus &quot;{conversation.title}&quot;?</span>
        <span className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={confirmDelete}
            className="rounded px-2 py-1 text-xs font-medium text-red-500 hover:bg-border"
          >
            Hapus
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsConfirmingDelete(false);
            }}
            className="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-border"
          >
            Batal
          </button>
        </span>
      </div>
    );
  }

  return (
    <Link
      href={`/chat/${conversation.id}`}
      className={`group flex items-center justify-between gap-1 rounded-md px-2.5 py-2 text-sm transition-colors ${
        isActive ? "bg-surface-hover text-foreground" : "text-muted-foreground hover:bg-surface-hover hover:text-foreground"
      }`}
    >
      <span className="truncate">{conversation.title}</span>
      <span className="hidden shrink-0 items-center gap-0.5 group-hover:flex">
        <button
          type="button"
          aria-label="Ganti nama"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsEditing(true);
          }}
          className="rounded p-1 hover:bg-border"
        >
          <PencilIcon className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          aria-label="Hapus"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsConfirmingDelete(true);
          }}
          className="rounded p-1 hover:bg-border"
        >
          <TrashIcon className="h-3.5 w-3.5" />
        </button>
      </span>
    </Link>
  );
}
