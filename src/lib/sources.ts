// Centralized source configuration for agent filtering

/**
 * Default sources that agents should query from.
 * Add new sources here as they are added to the system.
 */
export const AGENT_DEFAULT_SOURCES = ["finelo", "journal"] as const;

/**
 * All possible source types in the system.
 */
export type SourceType = "finelo" | "journal" | "books" | "pdfs" | string;

/**
 * Default source used when none is provided during ingestion.
 */
export const DEFAULT_SOURCE: SourceType = "journal";

