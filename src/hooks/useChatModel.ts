"use client";

import { useCallback, useEffect, useState } from "react";
import { CHAT_MODEL_OPTIONS, DEFAULT_CHAT_MODEL_ID, isValidChatModelId } from "@/lib/ai/models";

const STORAGE_KEY = "chatModelId";

/**
 * Which chat model to use is a per-browser preference, not per-conversation —
 * shared via localStorage so it stays put across new chats and page loads
 * without needing a DB column.
 *
 * The stored value is applied in an effect rather than a useState lazy
 * initializer: React's hydration commit for a controlled <select> doesn't
 * reliably re-sync the DOM's selected option when the client's initial value
 * differs from what was server-rendered (server has no access to
 * localStorage, so it always renders the default) — the <select> element
 * visually sticks to the default even though React's own value prop is
 * correct. Setting it in an effect makes it a normal post-mount update
 * instead of part of the hydration commit, which does apply correctly.
 */
export function useChatModel() {
  const [modelId, setModelIdState] = useState(DEFAULT_CHAT_MODEL_ID);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      // Intentional: syncing from localStorage (an external system) after mount, specifically to land as a
      // post-hydration commit rather than the initial hydration commit (see comment above the hook).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (isValidChatModelId(stored)) setModelIdState(stored);
    } catch {}
  }, []);

  const setModelId = useCallback((id: string) => {
    setModelIdState(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {}
  }, []);

  return { modelId, setModelId, options: CHAT_MODEL_OPTIONS };
}
