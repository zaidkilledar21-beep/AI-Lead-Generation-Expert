export type ReplySlaLabel = "New today" | "Older than 24h" | "Older than 72h" | null;

const dayMs = 24 * 60 * 60 * 1000;

export function getReplySlaLabel(replyTimestamp: string | null | undefined, isHandled: boolean, nowMs = Date.now()): ReplySlaLabel {
  if (isHandled || !replyTimestamp) return null;

  const receivedMs = new Date(replyTimestamp).getTime();
  if (!Number.isFinite(receivedMs)) return null;

  const ageMs = Math.max(0, nowMs - receivedMs);
  if (ageMs >= 3 * dayMs) return "Older than 72h";
  if (ageMs >= dayMs) return "Older than 24h";
  return "New today";
}

export function previewText(value: string | null | undefined, maxLength = 1200) {
  const text = typeof value === "string" ? value.trim() : "";
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trimEnd()}...`;
}
