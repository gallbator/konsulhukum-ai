"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import type { Conversation } from "@/types";
import { CONVERSATIONS_REFRESH_EVENT } from "@/lib/events";

export function useConversations() {
  const pathname = usePathname();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState("");
  const queryRef = useRef(query);
  useEffect(() => {
    queryRef.current = query;
  }, [query]);

  const load = useCallback(async (q: string) => {
    const url = q ? `/api/search?q=${encodeURIComponent(q)}` : "/api/conversations";
    const res = await fetch(url);
    if (!res.ok) return;
    const data = await res.json();
    setConversations(data.conversations);
    setIsLoading(false);
  }, []);

  // Debounced: covers both navigation (query unchanged) and typing in the search box.
  useEffect(() => {
    const timer = setTimeout(() => {
      load(query);
    }, 250);
    return () => clearTimeout(timer);
  }, [load, pathname, query]);

  useEffect(() => {
    const onRefresh = () => load(queryRef.current);
    window.addEventListener(CONVERSATIONS_REFRESH_EVENT, onRefresh);
    return () => window.removeEventListener(CONVERSATIONS_REFRESH_EVENT, onRefresh);
  }, [load]);

  const rename = useCallback(async (id: string, title: string) => {
    const res = await fetch(`/api/conversations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    if (!res.ok) return;
    const data = await res.json();
    setConversations((prev) => prev.map((c) => (c.id === id ? data.conversation : c)));
  }, []);

  const remove = useCallback(async (id: string) => {
    const res = await fetch(`/api/conversations/${id}`, { method: "DELETE" });
    if (!res.ok) return;
    setConversations((prev) => prev.filter((c) => c.id !== id));
  }, []);

  return { conversations, isLoading, query, setQuery, rename, remove };
}
