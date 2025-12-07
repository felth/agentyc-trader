/**
 * Journal type definitions
 */

export type Mood = "focused" | "balanced" | "neutral" | "challenged" | "strong";

export type Session = "Asia" | "London" | "NewYork" | "Closed" | null;

export interface JournalEntry {
  id: string;
  createdAt: string;
  mood: Mood;
  text: string;
  tags?: string[];
  symbol?: string | null;
  session?: Session;
  attachTradeIds?: string[];
}

