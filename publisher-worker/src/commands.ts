export function parseQueueCancelCommand(value: string) {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, " ");
  if (normalized === "cancel all" || normalized === "/cancel all") return "all" as const;

  const match = normalized.match(/^\/?(\d+(?:\s+\d+)*)\s+cancel$/);
  if (!match) return undefined;

  return [...new Set(match[1].split(" ").map(Number))];
}

export function parseUnpublishCommand(value: string) {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, " ");
  const match = normalized.match(/^\/unpublish\s+(\d+(?:\s+\d+)*)$/);
  if (!match) return undefined;

  return [...new Set(match[1].split(" ").map(Number))];
}
