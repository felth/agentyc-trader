// src/lib/memory/agentMemory.ts
// Central Memory Layer - Unified interface for Pinecone + Supabase

/**
 * Phase 2: Memory layer planning and skeleton
 * TODO Phase 3: Implement full memory layer
 * - Pinecone namespace management (corpus, playbook, trades)
 * - Supabase queries for recent trades, configs, notes
 * - Clean getAgentContext() function for brains
 */

import { Pinecone } from '@pinecone-database/pinecone';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

export type MemoryNamespace = 'corpus' | 'playbook' | 'trades';

export interface AgentContextOptions {
  userId?: string;
  symbol?: string;
  timeframe?: string;
  maxItems?: number;
}

export interface AgentContext {
  // Recent trades from Supabase
  recentTrades: Array<{
    symbol: string;
    direction: 'BUY' | 'SELL';
    outcome: 'win' | 'loss' | 'breakeven';
    timestamp: Date;
    pnl?: number;
  }>;
  
  // Relevant corpus entries from Pinecone
  corpus: Array<{
    concept: string;
    notes: string;
    relevance: number;
    source?: string;
  }>;
  
  // Relevant playbook rules from Pinecone
  playbook: Array<{
    rule: string;
    notes: string;
    relevance: number;
    source?: string;
  }>;
  
  // Trade history patterns
  tradePatterns: {
    winRate: number;
    avgWin: number;
    avgLoss: number;
    recentStreak: 'win' | 'loss' | 'neutral';
  };
}

/**
 * Gets unified agent context from memory systems
 * This is the single function brains should call for memory access
 */
export async function getAgentContext(
  options: AgentContextOptions = {}
): Promise<AgentContext> {
  // TODO Phase 3: Implement full context building
  // - Query Supabase for recent trades
  // - Query Pinecone corpus namespace for relevant entries
  // - Query Pinecone playbook namespace for relevant rules
  // - Calculate trade patterns
  // - Return unified context
  
  return {
    recentTrades: [],
    corpus: [],
    playbook: [],
    tradePatterns: {
      winRate: 0,
      avgWin: 0,
      avgLoss: 0,
      recentStreak: 'neutral',
    },
  };
}

/**
 * Gets Pinecone index for a specific namespace
 */
export function getPineconeIndex(namespace: MemoryNamespace) {
  const indexName = process.env.PINECONE_INDEX!;
  const host = process.env.PINECONE_HOST!;
  
  // TODO Phase 3: Implement namespace filtering
  // Pinecone doesn't have native namespaces, so we'll use metadata filtering
  // For now, return the main index
  
  return pc.index(indexName, host);
}

/**
 * Stores a vector in Pinecone with namespace metadata
 */
export async function storeInMemory(
  namespace: MemoryNamespace,
  id: string,
  vector: number[],
  metadata: {
    text: string;
    concept?: string;
    source?: string;
    [key: string]: any;
  }
): Promise<void> {
  // TODO Phase 3: Implement vector storage
  // - Add namespace to metadata
  // - Upsert to Pinecone
  // - Store metadata in Supabase if needed
  
  throw new Error('storeInMemory() not yet implemented - Phase 3');
}

/**
 * Queries memory for relevant entries
 */
export async function queryMemory(
  namespace: MemoryNamespace,
  queryVector: number[],
  topK: number = 10,
  filter?: Record<string, any>
): Promise<Array<{
  id: string;
  score: number;
  metadata: any;
}>> {
  // TODO Phase 3: Implement memory querying
  // - Query Pinecone with namespace filter
  // - Return top K results
  
  return [];
}

