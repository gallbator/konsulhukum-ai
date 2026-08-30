export const CONVERSATIONS_REFRESH_EVENT = "conversations:refresh";

export function emitConversationsRefresh() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CONVERSATIONS_REFRESH_EVENT));
  }
}
