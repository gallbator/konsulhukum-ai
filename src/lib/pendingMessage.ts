const KEY_PREFIX = "pendingFirstMessage:";

export function setPendingFirstMessage(conversationId: string, text: string) {
  try {
    sessionStorage.setItem(KEY_PREFIX + conversationId, text);
  } catch {}
}

export function takePendingFirstMessage(conversationId: string): string | null {
  try {
    const key = KEY_PREFIX + conversationId;
    const text = sessionStorage.getItem(key);
    if (text) sessionStorage.removeItem(key);
    return text;
  } catch {
    return null;
  }
}
