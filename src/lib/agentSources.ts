export const DEFAULT_AGENT_SOURCES: string[] = [
  "playbook",
  "journal",
];

export function normalizeSource(raw?: string | null): string {
  const trimmed = (raw ?? "").trim();
  return trimmed.length > 0 ? trimmed : "manual";
}

