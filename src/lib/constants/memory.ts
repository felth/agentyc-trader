// Memory index names for display in Library/Settings
export const MEMORY_CORPUS_INDEX = "memory-core";
export const MEMORY_PLAYBOOK_INDEX = "memory-playbook";
export const MEMORY_JOURNAL_INDEX = "journal-behaviour";

// Memory index enum for type safety
export enum MemoryIndex {
  CORPUS = "corpus",
  PLAYBOOK = "playbook",
}

// Ingest mode enum for controlling how content is ingested
export enum IngestMode {
  HYBRID = "hybrid",
  REFERENCE_ONLY = "reference_only",
  RULES_ONLY = "rules_only",
}

// Map enum values to index names
export const INDEX_NAME_MAP: Record<MemoryIndex, string> = {
  [MemoryIndex.CORPUS]: MEMORY_CORPUS_INDEX,
  [MemoryIndex.PLAYBOOK]: MEMORY_PLAYBOOK_INDEX,
};

